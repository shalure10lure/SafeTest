import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { IA_CONFIG, type IaConfig } from '../config/ia.config';
import type {
  ErrorCorreccionRespuesta,
  ResultadoCorreccionRespuesta,
  SolicitudCorreccionRespuesta,
} from '../ia/ai.types';
import { AI_CORRECCION_PROVIDER } from '../ia/providers/ai.provider';
import type { AiProvider } from '../ia/providers/ai.provider';
import { crearHashCriterio } from './correccionia.criterio';
import { CONFIANZA_MAXIMA_CRITERIO_PREDETERMINADO } from './correccionia.criterio-predeterminado';
import {
  describirFalloCorreccion,
  ErrorProcesamientoCorreccionIa,
  MENSAJE_EXAMEN_PUBLICADO,
} from './correccionia.errores';
import {
  ALMACEN_CORRECCION_IA,
  type AlmacenCorreccionIa,
  type ContextoCorreccionIa,
  type ResultadoCorreccionAlmacenado,
  type ResultadoRecuperacionCorreccionIa,
} from './correccionia.types';
import { validarResultadoCorreccionIa } from './correccionia.validacion';

/**
 * Cada cuánto se revisan las propuestas `procesando` cuyo lease venció. El
 * lease configurable debe ser mayor que el timeout del proveedor para no
 * recuperar una corrección que sigue en curso.
 */
const INTERVALO_RECUPERACION_MS = 60_000;

export interface EstadoWorkerCorreccionIa {
  enCurso: number[];
}

/**
 * Procesa en segundo plano las propuestas `pendiente` de `correccion_ia`.
 *
 * No conoce Gemini ni los repositorios oficiales: depende de AiProvider y de
 * AlmacenCorreccionIa. El reclamo atómico impide que dos workers procesen la
 * misma fila y el semáforo en memoria respeta IA_MAX_CONCURRENTES.
 */
@Injectable()
export class CorreccionIaWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CorreccionIaWorker.name);

  private intervalo: ReturnType<typeof setInterval> | null = null;
  private detenido = false;
  private cicloEnCurso = false;
  private ultimaRecuperacion = 0;
  private ultimoErrorCola = 0;

  /** Propuestas que este proceso está ejecutando ahora mismo. */
  private readonly enCurso = new Set<number>();

  /** Tareas activas, para poder esperar su fin al apagar la aplicación. */
  private readonly tareas = new Set<Promise<void>>();

  constructor(
    @Inject(ALMACEN_CORRECCION_IA)
    private readonly almacen: AlmacenCorreccionIa,

    @Inject(AI_CORRECCION_PROVIDER)
    private readonly proveedor: AiProvider,

    @Inject(IA_CONFIG)
    private readonly config: IaConfig,
  ) {}

  onApplicationBootstrap(): void {
    void this.iniciar();
  }

  async onModuleDestroy(): Promise<void> {
    this.detenido = true;

    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }

    await this.esperarInactividad();
  }

  /**
   * Recupera las propuestas abandonadas y arranca el ciclo periódico. Es
   * idempotente para que las pruebas puedan llamarlo sin duplicar timers.
   */
  async iniciar(): Promise<void> {
    if (this.detenido || this.intervalo) {
      return;
    }

    try {
      await this.recuperarAbandonadas();
      this.ultimaRecuperacion = Date.now();
    } catch (error) {
      // La base puede no estar disponible al arrancar; el ciclo reintenta.
      this.logger.error(
        `No se pudieron recuperar las propuestas abandonadas al arrancar. ${describirCausa(error)}`,
      );
    }

    this.intervalo = setInterval(() => {
      void this.procesarCiclo();
    }, this.config.intervaloWorkerMs);

    // No impide que el proceso termine si es lo único que queda vivo.
    this.intervalo.unref?.();
  }

  /**
   * Devuelve a `pendiente` las propuestas cuyo lease venció con intentos
   * disponibles, y marca `TIEMPO_AGOTADO` las que ya no tienen intentos. Las
   * propuestas en proceso de un examen cerrado pasan a `EXAMEN_PUBLICADO`.
   */
  async recuperarAbandonadas(): Promise<ResultadoRecuperacionCorreccionIa> {
    const leaseSegundos = Math.max(
      1,
      Math.floor(this.config.correccionLeaseSegundos),
    );
    const maxIntentos = Math.max(
      1,
      Math.floor(this.config.correccionMaxIntentos),
    );

    const resultado = await this.almacen.recuperarAbandonadas(
      new Date(),
      leaseSegundos,
      maxIntentos,
    );

    const total =
      resultado.reencoladas + resultado.agotadas + resultado.cerradas;

    if (total > 0) {
      this.logger.warn(
        `Recuperación de correcciones: ${resultado.reencoladas} reencolada(s), ${resultado.agotadas} agotada(s), ${resultado.cerradas} cerrada(s).`,
      );
    }

    return resultado;
  }

  /**
   * Reclama hasta `IA_MAX_CONCURRENTES` propuestas y las lanza sin bloquear el
   * ciclo. Devuelve cuántas se iniciaron.
   */
  async procesarCiclo(): Promise<number> {
    if (this.detenido || this.cicloEnCurso) {
      return 0;
    }

    this.cicloEnCurso = true;

    try {
      await this.recuperarSiCorresponde();

      const libres = this.config.maxConcurrentes - this.enCurso.size;

      if (libres <= 0) {
        return 0;
      }

      let lanzadas = 0;

      for (let indice = 0; indice < libres; indice += 1) {
        const propuestaId = await this.almacen.reclamar(new Date());

        if (propuestaId === null) {
          break;
        }

        this.lanzar(propuestaId);
        lanzadas += 1;
      }

      return lanzadas;
    } catch (error) {
      // Si la base aún no está disponible, no se repite el log cada ciclo.
      const ahora = Date.now();

      if (ahora - this.ultimoErrorCola >= INTERVALO_RECUPERACION_MS) {
        this.ultimoErrorCola = ahora;
        this.logger.error(
          `No se pudo consultar la cola de correcciones pendientes. ${describirCausa(error)}`,
        );
      }

      return 0;
    } finally {
      this.cicloEnCurso = false;
    }
  }

  /** Espera a que terminen todas las tareas lanzadas (usado en pruebas). */
  async esperarInactividad(): Promise<void> {
    while (this.tareas.size > 0) {
      await Promise.allSettled(this.tareas);
    }
  }

  estado(): EstadoWorkerCorreccionIa {
    return { enCurso: [...this.enCurso] };
  }

  private lanzar(propuestaId: number): void {
    this.enCurso.add(propuestaId);

    const tarea: Promise<void> = this.procesar(propuestaId)
      .catch(() => {
        // procesar() ya registra el fallo; esto evita rechazos sin manejar.
      })
      .finally(() => {
        this.enCurso.delete(propuestaId);
        this.tareas.delete(tarea);
      });

    this.tareas.add(tarea);
  }

  private async procesar(propuestaId: number): Promise<void> {
    try {
      const contexto = await this.almacen.cargarContexto(propuestaId);

      if (contexto.examen_cerrado) {
        await this.almacen.marcarError(
          propuestaId,
          'EXAMEN_PUBLICADO',
          MENSAJE_EXAMEN_PUBLICADO,
          new Date(),
        );
        return;
      }

      const solicitud = construirSolicitud(contexto);
      const hashCriterio = crearHashCriterio(contexto.criterio);
      const resultado = await this.proveedor.corregirRespuesta(solicitud);
      const normalizado = normalizarResultado(resultado, contexto.puntaje_max);

      // Sin rúbrica ni solución del docente la confianza del modelo no es
      // fiable: se limita para que la interfaz pida revisión cuidadosa.
      if (
        contexto.criterio_fuente === 'predeterminado' &&
        normalizado.confianza !== null
      ) {
        normalizado.confianza = Math.min(
          normalizado.confianza,
          CONFIANZA_MAXIMA_CRITERIO_PREDETERMINADO,
        );
      }

      const persistencia = await this.almacen.guardarGenerada(
        propuestaId,
        {
          ...normalizado,
          criterio_fuente: contexto.criterio_fuente,
          criterio_hash: hashCriterio,
        },
        new Date(),
      );

      if (persistencia === 'examen_publicado') {
        await this.almacen.marcarError(
          propuestaId,
          'EXAMEN_PUBLICADO',
          MENSAJE_EXAMEN_PUBLICADO,
          new Date(),
        );
        this.logger.warn(
          `Propuesta ${propuestaId} marcada con error: el examen se cerró durante el proceso.`,
        );
        return;
      }

      if (persistencia === 'generada') {
        // Solo datos de proceso: nunca la respuesta ni el criterio.
        this.logger.log(
          `Propuesta ${propuestaId} generada con ${normalizado.proveedor}.`,
        );
      }
    } catch (error) {
      const fallo = describirFalloCorreccion(error);

      try {
        await this.almacen.marcarError(
          propuestaId,
          fallo.codigo,
          fallo.mensaje,
          new Date(),
        );
        this.logger.warn(
          `Propuesta ${propuestaId} marcada con error (${fallo.codigo}).`,
        );
      } catch {
        this.logger.error(
          `No se pudo registrar el error de la propuesta ${propuestaId}.`,
        );
      }
    }
  }

  private async recuperarSiCorresponde(): Promise<void> {
    const ahora = Date.now();

    if (ahora - this.ultimaRecuperacion < INTERVALO_RECUPERACION_MS) {
      return;
    }

    this.ultimaRecuperacion = ahora;

    try {
      await this.recuperarAbandonadas();
    } catch (error) {
      this.logger.error(
        `No se pudieron recuperar las propuestas abandonadas en este ciclo. ${describirCausa(error)}`,
      );
    }
  }
}

/**
 * Resume la causa técnica de un fallo de base de datos para el log (código
 * PostgreSQL y mensaje), sin incluir parámetros ni datos académicos. Una tabla
 * o columna inexistente indica migraciones sin aplicar.
 */
export function describirCausa(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Causa: desconocida.';
  }

  const codigo = (error as { code?: unknown }).code;
  const etiqueta = typeof codigo === 'string' ? ` [${codigo}]` : '';
  const pista =
    codigo === '42P01' || codigo === '42703'
      ? ' Pista: faltan migraciones; ejecuta `npm run migration:run`.'
      : '';

  return `Causa${etiqueta}: ${error.message.slice(0, 300)}.${pista}`;
}

function construirSolicitud(
  contexto: ContextoCorreccionIa,
): SolicitudCorreccionRespuesta {
  return {
    enunciado: contexto.enunciado,
    tipo_respuesta: contexto.tipo_respuesta,
    respuesta_estudiante: contexto.respuesta_estudiante,
    criterio: contexto.criterio,
    puntaje_max: contexto.puntaje_max,
  };
}

function normalizarResultado(
  resultado: ResultadoCorreccionRespuesta,
  puntajeMaximo: number,
): Omit<ResultadoCorreccionAlmacenado, 'criterio_fuente' | 'criterio_hash'> {
  if (typeof resultado !== 'object' || resultado === null) {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor no devolvió un resultado de corrección.',
    );
  }

  const bruto = resultado.puntaje_sugerido;
  if (typeof bruto !== 'number' || !Number.isFinite(bruto)) {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor no devolvió un puntaje sugerido numérico.',
    );
  }

  const recortado = Math.min(Math.max(bruto, 0), puntajeMaximo);
  const puntaje = Math.round(recortado * 100) / 100;
  const confianza =
    resultado.confianza === null || resultado.confianza === undefined
      ? null
      : Number(resultado.confianza);

  // Reutiliza las reglas puras del dominio: puntaje entre 0 y el máximo, con
  // dos decimales, y confianza entre 0 y 1 o nula.
  validarResultadoCorreccionIa({
    puntaje_max: puntajeMaximo,
    puntaje_sugerido: puntaje,
    confianza,
  });

  if (
    typeof resultado.valoracion !== 'string' ||
    typeof resultado.explicacion !== 'string'
  ) {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor no devolvió valoración y explicación válidas.',
    );
  }

  if (
    typeof resultado.proveedor !== 'string' ||
    resultado.proveedor.trim().length === 0
  ) {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor no devolvió su identificador.',
    );
  }

  if (resultado.modelo !== null && typeof resultado.modelo !== 'string') {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor devolvió un modelo inválido.',
    );
  }

  const errores = resultado.errores ?? [];
  if (!Array.isArray(errores) || !errores.every(esErrorCorreccionRespuesta)) {
    throw new ErrorProcesamientoCorreccionIa(
      'RESPUESTA_PROVEEDOR_INVALIDA',
      'El proveedor devolvió una lista de errores inválida.',
    );
  }

  return {
    puntaje_sugerido: puntaje,
    valoracion: resultado.valoracion,
    explicacion: resultado.explicacion,
    errores,
    confianza,
    proveedor: resultado.proveedor,
    modelo: resultado.modelo ?? null,
  };
}

function esErrorCorreccionRespuesta(
  valor: unknown,
): valor is ErrorCorreccionRespuesta {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const error = valor as Record<string, unknown>;

  if (typeof error.tipo !== 'string' || typeof error.descripcion !== 'string') {
    return false;
  }

  return error.ubicacion === undefined || typeof error.ubicacion === 'string';
}


