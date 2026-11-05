import 'reflect-metadata';

import {
  cargarConfiguracionIa,
  type IaConfig,
} from '../config/ia.config';
import type {
  ResultadoGeneracionIa,
  SolicitudGeneracionIa,
  TokensIa,
} from '../ia/ai.types';
import { ErrorGeneracionIa } from '../ia/ia.errors';
import type { AiProvider } from '../ia/providers/ai.provider';
import { FakeAiProvider } from '../ia/providers/fake-ai.provider';
import { IaGeneracionWorker, MAX_INTENTOS_GENERACION } from './iageneracion.worker';
import type {
  AlmacenGeneraciones,
  EstadoGeneracion,
  GeneracionContexto,
  ResultadoGeneracionAlmacenado,
} from './iageneracion.types';

const TOKENS: TokensIa = { entrada: 10, salida: 5, total: 15 };

class AlmacenEnMemoria implements AlmacenGeneraciones {
  readonly estados = new Map<number, EstadoGeneracion>();
  readonly contextos = new Map<number, GeneracionContexto>();
  readonly completadas: Array<{
    generacionId: number;
    resultado: ResultadoGeneracionAlmacenado;
  }> = [];
  readonly errores: Array<{ generacionId: number; mensaje: string }> = [];
  readonly reencoladas: number[] = [];
  readonly recuperaciones: Array<{ ahora: Date; antiguedadMs: number }> = [];
  recuperables = 0;

  constructor(generacionIds: number[]) {
    generacionIds.forEach((id) => this.estados.set(id, 'pendiente'));
  }

  async listarPendientes(limite: number): Promise<number[]> {
    return [...this.estados.entries()]
      .filter(([, estado]) => estado === 'pendiente')
      .map(([id]) => id)
      .sort((a, b) => a - b)
      .slice(0, limite);
  }

  async reclamar(generacionId: number): Promise<boolean> {
    if (this.estados.get(generacionId) !== 'pendiente') {
      return false;
    }

    this.estados.set(generacionId, 'procesando');
    return true;
  }

  async cargarContexto(generacionId: number): Promise<GeneracionContexto> {
    const contexto = this.contextos.get(generacionId);

    if (!contexto) {
      throw new ErrorGeneracionIa(
        'datos_invalidos',
        `Sin contexto para ${generacionId}`,
      );
    }

    return contexto;
  }

  async guardarCompletada(
    generacionId: number,
    resultado: ResultadoGeneracionAlmacenado,
  ): Promise<void> {
    this.estados.set(generacionId, 'completada');
    this.completadas.push({ generacionId, resultado });
  }

  async marcarError(generacionId: number, mensaje: string): Promise<void> {
    this.estados.set(generacionId, 'error');
    this.errores.push({ generacionId, mensaje });
  }

  async reencolar(generacionId: number): Promise<void> {
    this.estados.set(generacionId, 'pendiente');
    this.reencoladas.push(generacionId);
  }

  async recuperarInterrumpidas(
    ahora: Date,
    antiguedadMs: number,
  ): Promise<number> {
    this.recuperaciones.push({ ahora, antiguedadMs });
    return this.recuperables;
  }
}

class ProveedorContador implements AiProvider {
  llamadas: SolicitudGeneracionIa[] = [];

  constructor(private readonly interno: AiProvider) {}

  async generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa> {
    this.llamadas.push(solicitud);
    return this.interno.generarPreguntas(solicitud);
  }
}

class ProveedorControlado implements AiProvider {
  llamadas: SolicitudGeneracionIa[] = [];
  activas = 0;
  maxActivas = 0;
  private readonly liberadores: Array<() => void> = [];

  async generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa> {
    this.llamadas.push(solicitud);
    this.activas += 1;
    this.maxActivas = Math.max(this.maxActivas, this.activas);

    await new Promise<void>((resolve) => this.liberadores.push(resolve));

    this.activas -= 1;

    return {
      preguntas: [],
      proveedor: 'controlado',
      modelo: null,
      tokens: TOKENS,
    };
  }

  liberar(cantidad: number): void {
    this.liberadores.splice(0, cantidad).forEach((liberar) => liberar());
  }
}

function configuracion(sobrescribir: Partial<IaConfig> = {}): IaConfig {
  return {
    ...cargarConfiguracionIa({ IA_PROVIDER: 'fake' }),
    ...sobrescribir,
  };
}

function contexto(
  generacionId: number,
  sobrescribir: Partial<GeneracionContexto> = {},
): GeneracionContexto {
  return {
    generacion_id: generacionId,
    materia: 'Matemática',
    tema: 'Derivadas',
    tipo_respuesta: 'opcion_unica',
    cantidad: 2,
    dificultad: 'media',
    materiales: [],
    ...sobrescribir,
  };
}

function prepararAlmacen(
  ids: number[],
  cantidadPorDefecto = 2,
): AlmacenEnMemoria {
  const almacen = new AlmacenEnMemoria(ids);
  ids.forEach((id) =>
    almacen.contextos.set(id, contexto(id, { cantidad: cantidadPorDefecto })),
  );
  return almacen;
}

function fake(): AiProvider {
  return new FakeAiProvider({ modelo: 'fake-test' });
}

const pausa = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

describe('IaGeneracionWorker', () => {
  it('completa la generación con todas las propuestas válidas', async () => {
    const almacen = prepararAlmacen([1]);
    const worker = new IaGeneracionWorker(
      almacen,
      fake(),
      configuracion({ maxConcurrentes: 1 }),
    );

    expect(await worker.procesarCiclo()).toBe(1);
    await worker.esperarInactividad();

    expect(almacen.estados.get(1)).toBe('completada');
    expect(almacen.completadas).toHaveLength(1);
    expect(almacen.completadas[0].resultado.propuestas).toHaveLength(2);
    expect(almacen.completadas[0].resultado.proveedor).toBe('fake');
    expect(almacen.completadas[0].resultado.tokens.total).toBe(740);
    expect(almacen.errores).toHaveLength(0);
  });

  it('registra éxito parcial cuando solo algunas propuestas son válidas', async () => {
    const almacen = prepararAlmacen([1]);
    const interno = fake();
    const proveedor: AiProvider = {
      async generarPreguntas(solicitud) {
        const resultado = await interno.generarPreguntas(solicitud);
        return { ...resultado, preguntas: resultado.preguntas.slice(0, 1) };
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.estados.get(1)).toBe('completada');
    expect(almacen.completadas[0].resultado.propuestas).toHaveLength(1);
  });

  it('marca error cuando no hay ninguna propuesta', async () => {
    const almacen = prepararAlmacen([1]);
    const proveedor: AiProvider = {
      async generarPreguntas() {
        return { preguntas: [], proveedor: 'fake', modelo: null, tokens: TOKENS };
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.estados.get(1)).toBe('error');
    expect(almacen.completadas).toHaveLength(0);
    expect(almacen.errores).toHaveLength(1);
    expect(almacen.errores[0].mensaje).toContain('propuestas válidas');
  });

  it('descarta propuestas inválidas y no las persiste', async () => {
    const almacen = prepararAlmacen([1], 1);
    const proveedor: AiProvider = {
      async generarPreguntas() {
        return {
          preguntas: [
            {
              enunciado: 'Pregunta con dos respuestas correctas',
              tipo_respuesta: 'opcion_unica',
              opciones: [
                { texto_opcion: 'A', es_correcta: true },
                { texto_opcion: 'B', es_correcta: true },
              ],
            },
          ],
          proveedor: 'fake',
          modelo: null,
          tokens: TOKENS,
        };
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.estados.get(1)).toBe('error');
    expect(almacen.completadas).toHaveLength(0);
  });

  it('reintenta un error reintentable y completa en el siguiente ciclo', async () => {
    const almacen = prepararAlmacen([1]);
    const interno = fake();
    let llamadas = 0;
    const proveedor: AiProvider = {
      async generarPreguntas(solicitud) {
        llamadas += 1;

        if (llamadas === 1) {
          throw new ErrorGeneracionIa('timeout', 'timeout simulado');
        }

        return interno.generarPreguntas(solicitud);
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.estados.get(1)).toBe('pendiente');
    expect(almacen.reencoladas).toEqual([1]);

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(llamadas).toBe(2);
    expect(almacen.estados.get(1)).toBe('completada');
    expect(worker.estado().pendientesDeReintento).toBe(0);
  });

  it('marca error tras agotar los reintentos', async () => {
    const almacen = prepararAlmacen([1]);
    let llamadas = 0;
    const proveedor: AiProvider = {
      async generarPreguntas() {
        llamadas += 1;
        throw new ErrorGeneracionIa('timeout', 'timeout simulado');
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    for (let ciclo = 0; ciclo < MAX_INTENTOS_GENERACION; ciclo += 1) {
      await worker.procesarCiclo();
      await worker.esperarInactividad();
    }

    expect(llamadas).toBe(MAX_INTENTOS_GENERACION);
    expect(almacen.estados.get(1)).toBe('error');
    expect(almacen.errores).toHaveLength(1);
    expect(almacen.errores[0].mensaje).toContain('tardó más de lo permitido');
  });

  it('no reintenta un error no reintentable', async () => {
    const almacen = prepararAlmacen([1]);
    let llamadas = 0;
    const proveedor: AiProvider = {
      async generarPreguntas() {
        llamadas += 1;
        throw new ErrorGeneracionIa('respuesta_invalida', 'respuesta rota');
      },
    };
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(llamadas).toBe(1);
    expect(almacen.estados.get(1)).toBe('error');
    expect(almacen.reencoladas).toHaveLength(0);
  });

  it('respeta IA_MAX_CONCURRENTES entre ciclos', async () => {
    const almacen = prepararAlmacen([1, 2, 3], 1);
    const proveedor = new ProveedorControlado();
    const worker = new IaGeneracionWorker(
      almacen,
      proveedor,
      configuracion({ maxConcurrentes: 2 }),
    );

    expect(await worker.procesarCiclo()).toBe(2);
    await pausa();

    expect(proveedor.llamadas).toHaveLength(2);
    expect(await worker.procesarCiclo()).toBe(0);

    proveedor.liberar(2);
    await worker.esperarInactividad();

    expect(proveedor.maxActivas).toBe(2);
    expect(await worker.procesarCiclo()).toBe(1);
    await pausa();

    proveedor.liberar(1);
    await worker.esperarInactividad();

    expect(proveedor.llamadas).toHaveLength(3);
    expect(proveedor.maxActivas).toBe(2);
  });

  it('no procesa dos veces la misma generación entre workers', async () => {
    const almacen = prepararAlmacen([1]);
    const proveedor = new ProveedorContador(fake());
    const config = configuracion({ maxConcurrentes: 2 });
    const primerWorker = new IaGeneracionWorker(almacen, proveedor, config);
    const segundoWorker = new IaGeneracionWorker(almacen, proveedor, config);

    await Promise.all([
      primerWorker.procesarCiclo(),
      segundoWorker.procesarCiclo(),
    ]);
    await primerWorker.esperarInactividad();
    await segundoWorker.esperarInactividad();

    expect(proveedor.llamadas).toHaveLength(1);
    expect(almacen.completadas).toHaveLength(1);
  });

  it('no procesa una generación ya reclamada', async () => {
    const almacen = prepararAlmacen([1]);
    almacen.estados.set(1, 'procesando');
    const proveedor = new ProveedorContador(fake());
    const worker = new IaGeneracionWorker(almacen, proveedor, configuracion());

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(proveedor.llamadas).toHaveLength(0);
  });

  it('recupera generaciones interrumpidas con un margen mayor al timeout', async () => {
    const almacen = prepararAlmacen([]);
    almacen.recuperables = 2;
    const worker = new IaGeneracionWorker(
      almacen,
      fake(),
      configuracion({ timeoutMs: 1_000 }),
    );

    expect(await worker.recuperarInterrumpidas()).toBe(2);
    expect(almacen.recuperaciones).toHaveLength(1);
    expect(almacen.recuperaciones[0].antiguedadMs).toBe(60_000);
    expect(almacen.recuperaciones[0].ahora).toBeInstanceOf(Date);
  });

  it('no hace nada si no hay pendientes', async () => {
    const almacen = prepararAlmacen([]);
    const worker = new IaGeneracionWorker(almacen, fake(), configuracion());

    expect(await worker.procesarCiclo()).toBe(0);
    await worker.esperarInactividad();

    expect(almacen.completadas).toHaveLength(0);
  });
});
