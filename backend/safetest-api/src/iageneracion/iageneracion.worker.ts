import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { IA_CONFIG, type IaConfig } from '../config/ia.config';
import type { AiProvider } from '../ia/providers/ai.provider';
import { AI_PROVIDER } from '../ia/providers/ai.provider';
import { ErrorGeneracionIa } from '../ia/ia.errors';
import { describirFallo } from './iageneracion.errores';
import {
  ALMACEN_GENERACIONES,
  type AlmacenGeneraciones,
} from './iageneracion.types';
import { filtrarPropuestasValidas } from './iageneracion.validacion';

/** Intentos totales por generación antes de marcarla con error. */
export const MAX_INTENTOS_GENERACION = 3;

/**
 * Cada cuánto se revisan las generaciones 'procesando' vencidas. El margen de
 * la cesión (lease) es mayor que el timeout del proveedor, así que una
 * generación en curso nunca se recupera por error.
 */
const INTERVALO_RECUPERACION_MS = 60_000;
const MARGEN_MINIMO_RECUPERACION_MS = 60_000;

export interface EstadoWorker {
  enCurso: number[];
  pendientesDeReintento: number;
}

/**
 * Procesa las generaciones pendientes en segundo plano.
 *
 * No conoce Gemini: solo depende de AiProvider y de AlmacenGeneraciones. El
 * reclamo atómico impide que dos ejecuciones procesen la misma generación y el
 * semáforo en memoria respeta IA_MAX_CONCURRENTES.
 */
@Injectable()
export class IaGeneracionWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(IaGeneracionWorker.name);

  private intervalo: ReturnType<typeof setInterval> | null = null;
  private detenido = false;
  private cicloEnCurso = false;
  private ultimaRecuperacion = 0;
  private ultimoErrorCola = 0;

  /** Generaciones que este proceso está ejecutando ahora mismo. */
  private readonly enCurso = new Set<number>();

  /** Tareas activas, para poder esperar su fin al apagar la aplicación. */
  private readonly tareas = new Set<Promise<void>>();

  /** Reintentos consumidos por generación; sin columna propia en la BD. */
  private readonly intentos = new Map<number, number>();

  constructor(
    @Inject(ALMACEN_GENERACIONES)
    private readonly almacen: AlmacenGeneraciones,

    @Inject(AI_PROVIDER)
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
   * Recupera generaciones interrumpidas y arranca el ciclo periódico. Es
   * idempotente para que las pruebas puedan llamarlo sin duplicar timers.
   */
  async iniciar(): Promise<void> {
    if (this.detenido || this.intervalo) {
      return;
    }

    try {
      await this.recuperarInterrumpidas();
      this.ultimaRecuperacion = Date.now();
    } catch {
      // La base puede no estar disponible al arrancar; el ciclo reintenta.
      this.logger.error(
        'No se pudieron recuperar las generaciones interrumpidas al arrancar.',
      );
    }

    this.intervalo = setInterval(() => {
      void this.procesarCiclo();
    }, this.config.intervaloWorkerMs);

    // No impide que el proceso termine si es lo único que queda vivo.
    this.intervalo.unref?.();
  }

  /**
   * Devuelve a 'pendiente' las generaciones que quedaron en 'procesando'.
   * El margen duplica el timeout del proveedor para no interferir con una
   * ejecución real en curso.
   */
  async recuperarInterrumpidas(): Promise<number> {
    const antiguedadMs = Math.max(
      this.config.timeoutMs * 2,
      MARGEN_MINIMO_RECUPERACION_MS,
    );

    const recuperadas = await this.almacen.recuperarInterrumpidas(
      new Date(),
      antiguedadMs,
    );

    if (recuperadas > 0) {
      this.logger.warn(
        `Se devolvieron ${recuperadas} generación(es) interrumpida(s) a pendiente.`,
      );
    }

    return recuperadas;
  }

  /**
   * Toma hasta `IA_MAX_CONCURRENTES` generaciones pendientes y las lanza sin
   * bloquear el ciclo. Devuelve cuántas se iniciaron.
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

      const pendientes = await this.almacen.listarPendientes(libres);
      let lanzadas = 0;

      for (const generacionId of pendientes) {
        if (this.enCurso.has(generacionId)) {
          continue;
        }

        this.lanzar(generacionId);
        lanzadas += 1;
      }

      return lanzadas;
    } catch {
      // Si la base aún no está disponible, no se repite el log cada ciclo.
      const ahora = Date.now();

      if (ahora - this.ultimoErrorCola >= INTERVALO_RECUPERACION_MS) {
        this.ultimoErrorCola = ahora;
        this.logger.error(
          'No se pudo consultar la cola de generaciones pendientes.',
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

  estado(): EstadoWorker {
    return {
      enCurso: [...this.enCurso],
      pendientesDeReintento: this.intentos.size,
    };
  }

  private lanzar(generacionId: number): void {
    this.enCurso.add(generacionId);

    const tarea: Promise<void> = this.procesar(generacionId)
      .catch(() => {
        // procesar() ya registra el fallo; esto evita rechazos sin manejar.
      })
      .finally(() => {
        this.enCurso.delete(generacionId);
        this.tareas.delete(tarea);
      });

    this.tareas.add(tarea);
  }

  private async procesar(generacionId: number): Promise<void> {
    const reclamada = await this.almacen
      .reclamar(generacionId, new Date())
      .catch(() => false);

    if (!reclamada) {
      this.logger.debug(
        `La generación ${generacionId} ya fue tomada por otra ejecución.`,
      );
      return;
    }

    try {
      const contexto = await this.almacen.cargarContexto(generacionId);
      const resultado = await this.proveedor.generarPreguntas({
        materia: contexto.materia,
        tema: contexto.tema,
        tipo_respuesta: contexto.tipo_respuesta,
        cantidad: contexto.cantidad,
        dificultad: contexto.dificultad,
        materiales: contexto.materiales,
      });

      const propuestas = filtrarPropuestasValidas(
        resultado.preguntas,
        contexto.tipo_respuesta,
        contexto.dificultad,
        contexto.cantidad,
      );

      if (propuestas.length === 0) {
        throw new ErrorGeneracionIa(
          'respuesta_invalida',
          `La generación ${generacionId} no produjo propuestas válidas.`,
        );
      }

      await this.almacen.guardarCompletada(
        generacionId,
        {
          propuestas,
          proveedor: resultado.proveedor,
          modelo: resultado.modelo,
          tokens: resultado.tokens,
        },
        new Date(),
      );

      this.intentos.delete(generacionId);

      // Solo datos de proceso: nunca el contenido de materiales ni la clave.
      this.logger.log(
        `Generación ${generacionId} completada con ${propuestas.length}/${contexto.cantidad} propuesta(s) válida(s) usando ${resultado.proveedor}.`,
      );
    } catch (error) {
      await this.manejarFallo(generacionId, error);
    }
  }

  private async manejarFallo(
    generacionId: number,
    error: unknown,
  ): Promise<void> {
    const fallo = describirFallo(error);
    const intento = (this.intentos.get(generacionId) ?? 0) + 1;
    const ahora = new Date();

    if (fallo.reintentable && intento < MAX_INTENTOS_GENERACION) {
      this.intentos.set(generacionId, intento);

      try {
        await this.almacen.reencolar(generacionId, ahora);
        this.logger.warn(
          `Generación ${generacionId} falló por ${fallo.motivo}; reintento ${intento}/${MAX_INTENTOS_GENERACION - 1}.`,
        );
        return;
      } catch {
        this.logger.error(
          `No se pudo reencolar la generación ${generacionId}; se registrará como error.`,
        );
      }
    }

    this.intentos.delete(generacionId);

    try {
      await this.almacen.marcarError(generacionId, fallo.mensaje, ahora);
      this.logger.warn(
        `Generación ${generacionId} marcada con error (${fallo.motivo}).`,
      );
    } catch {
      this.logger.error(
        `No se pudo registrar el error de la generación ${generacionId}.`,
      );
    }
  }

  private async recuperarSiCorresponde(): Promise<void> {
    const ahora = Date.now();

    if (ahora - this.ultimaRecuperacion < INTERVALO_RECUPERACION_MS) {
      return;
    }

    this.ultimaRecuperacion = ahora;

    try {
      await this.recuperarInterrumpidas();
    } catch {
      this.logger.error(
        'No se pudieron recuperar las generaciones interrumpidas en este ciclo.',
      );
    }
  }
}
