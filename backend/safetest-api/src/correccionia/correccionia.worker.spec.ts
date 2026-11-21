import { jest } from '@jest/globals';
import { cargarConfiguracionIa } from '../config/ia.config';
import type { ResultadoCorreccionRespuesta } from '../ia/ai.types';
import type { AiProvider } from '../ia/providers/ai.provider';
import { FakeAiProvider } from '../ia/providers/fake-ai.provider';
import type {
  AlmacenCorreccionIa,
  ContextoCorreccionIa,
  ResultadoCorreccionAlmacenado,
  ResultadoPersistenciaCorreccionIa,
  ResultadoRecuperacionCorreccionIa,
} from './correccionia.types';
import { crearHashCriterio } from './correccionia.criterio';
import { CorreccionIaWorker } from './correccionia.worker';

interface FilaPrueba {
  estado: 'pendiente' | 'procesando' | 'generada' | 'error' | 'aceptada';
  intento: number;
  reintentos_worker: number;
  contexto: ContextoCorreccionIa;
  resultado?: ResultadoCorreccionAlmacenado;
  codigoError?: string;
  mensajeError?: string;
  cerrarAlPersistir?: boolean;
}

class AlmacenEnMemoria implements AlmacenCorreccionIa {
  readonly filas = new Map<number, FilaPrueba>();
  recuperacion?: (leaseSegundos: number, maxIntentos: number) => void;

  constructor(contextos: ContextoCorreccionIa[]) {
    for (const contexto of contextos) {
      this.filas.set(contexto.propuesta_id, {
        estado: 'pendiente',
        intento: 4,
        reintentos_worker: 0,
        contexto,
      });
    }
  }

  async reclamar(_ahora: Date): Promise<number | null> {
    const fila = [...this.filas.entries()].find(
      ([, propuesta]) =>
        propuesta.estado === 'pendiente' && !propuesta.contexto.examen_cerrado,
    );
    if (!fila) {
      return null;
    }

    const [propuestaId, propuesta] = fila;
    propuesta.estado = 'procesando';
    propuesta.reintentos_worker += 1;
    return propuestaId;
  }

  async cargarContexto(propuestaId: number): Promise<ContextoCorreccionIa> {
    const fila = this.filas.get(propuestaId);
    if (!fila) {
      throw new Error('Propuesta de prueba inexistente.');
    }
    return fila.contexto;
  }

  async guardarGenerada(
    propuestaId: number,
    resultado: ResultadoCorreccionAlmacenado,
    _ahora: Date,
  ): Promise<ResultadoPersistenciaCorreccionIa> {
    const fila = this.filas.get(propuestaId);
    if (!fila || fila.estado !== 'procesando') {
      return 'omitida';
    }
    if (fila.cerrarAlPersistir) {
      return 'examen_publicado';
    }

    fila.estado = 'generada';
    fila.resultado = resultado;
    return 'generada';
  }

  async marcarError(
    propuestaId: number,
    codigo: string,
    mensaje: string,
    _ahora: Date,
  ): Promise<boolean> {
    const fila = this.filas.get(propuestaId);
    if (!fila || fila.estado !== 'procesando') {
      return false;
    }
    fila.estado = 'error';
    fila.codigoError = codigo;
    fila.mensajeError = mensaje;
    return true;
  }

  async recuperarAbandonadas(
    _ahora: Date,
    leaseSegundos: number,
    maxIntentos: number,
  ): Promise<ResultadoRecuperacionCorreccionIa> {
    this.recuperacion?.(leaseSegundos, maxIntentos);
    const resultado: ResultadoRecuperacionCorreccionIa = {
      reencoladas: 0,
      agotadas: 0,
      cerradas: 0,
    };

    for (const fila of this.filas.values()) {
      if (fila.estado !== 'procesando') {
        continue;
      }

      if (fila.contexto.examen_cerrado) {
        fila.estado = 'error';
        fila.codigoError = 'EXAMEN_PUBLICADO';
        resultado.cerradas += 1;
      } else if (fila.reintentos_worker < maxIntentos) {
        fila.estado = 'pendiente';
        resultado.reencoladas += 1;
      } else {
        fila.estado = 'error';
        fila.codigoError = 'TIEMPO_AGOTADO';
        resultado.agotadas += 1;
      }
    }

    return resultado;
  }
}

function crearContexto(
  propuestaId = 41,
  sobrescribir: Partial<ContextoCorreccionIa> = {},
): ContextoCorreccionIa {
  return {
    propuesta_id: propuestaId,
    examen_cerrado: false,
    enunciado: '¿Cuál es el valor esperado?',
    tipo_respuesta: 'numerica',
    respuesta_estudiante: '4',
    criterio: { valor_correcto: 4, tolerancia: 0.1 },
    criterio_fuente: 'solucion_inciso',
    puntaje_max: 10,
    ...sobrescribir,
  };
}

function config() {
  return cargarConfiguracionIa({
    IA_PROVIDER: 'fake',
    IA_CORRECCION_LEASE_SEGUNDOS: '120',
    IA_CORRECCION_MAX_INTENTOS: '3',
    IA_MAX_CONCURRENTES: '1',
  });
}

function resultado(
  sobrescribir: Partial<ResultadoCorreccionRespuesta> = {},
): ResultadoCorreccionRespuesta {
  return {
    puntaje_sugerido: 7.25,
    valoracion: 'Parcialmente correcta',
    explicacion: 'Se aplica parte del criterio.',
    errores: [
      { tipo: 'omision', descripcion: 'Falta un paso', ubicacion: 'paso 2' },
    ],
    confianza: 0.8,
    proveedor: 'prueba',
    modelo: 'modelo-prueba',
    ...sobrescribir,
  };
}

function proveedorDeCorreccion(
  corregirRespuesta: AiProvider['corregirRespuesta'],
): AiProvider {
  return {
    generarPreguntas: async () => {
      throw new Error('La generación no se usa en estas pruebas.');
    },
    corregirRespuesta,
  };
}

function crearWorker(
  almacen: AlmacenEnMemoria,
  proveedor: AiProvider = new FakeAiProvider({ modelo: 'fake-test' }),
): CorreccionIaWorker {
  return new CorreccionIaWorker(almacen, proveedor, config());
}

describe('CorreccionIaWorker', () => {
  it('dos workers no reclaman la misma propuesta', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const proveedor = new FakeAiProvider({ modelo: 'fake-test' });
    const primero = crearWorker(almacen, proveedor);
    const segundo = crearWorker(almacen, proveedor);

    const lanzadas = await Promise.all([
      primero.procesarCiclo(),
      segundo.procesarCiclo(),
    ]);
    await Promise.all([
      primero.esperarInactividad(),
      segundo.esperarInactividad(),
    ]);

    expect(lanzadas.reduce((total, cantidad) => total + cantidad, 0)).toBe(1);
    expect(almacen.filas.get(41)?.estado).toBe('generada');
    expect(almacen.filas.get(41)?.intento).toBe(4);
    expect(almacen.filas.get(41)?.reintentos_worker).toBe(1);
  });

  it('genera y persiste un resultado fake sin enviar identificadores al proveedor', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const fake = new FakeAiProvider({ modelo: 'fake-test' });
    const corregir = jest.spyOn(fake, 'corregirRespuesta');
    const worker = crearWorker(almacen, fake);

    await expect(worker.procesarCiclo()).resolves.toBe(1);
    await worker.esperarInactividad();

    expect(corregir).toHaveBeenCalledWith({
      enunciado: '¿Cuál es el valor esperado?',
      tipo_respuesta: 'numerica',
      respuesta_estudiante: '4',
      criterio: { valor_correcto: 4, tolerancia: 0.1 },
      puntaje_max: 10,
    });
    const solicitud = corregir.mock.calls[0][0];
    expect(solicitud).not.toHaveProperty('propuesta_id');
    expect(solicitud).not.toHaveProperty('examen_id');
    expect(solicitud).not.toHaveProperty('docente_id');
    expect(solicitud).not.toHaveProperty('estudiante_id');

    const fila = almacen.filas.get(41);
    expect(fila?.estado).toBe('generada');
    expect(fila?.resultado).toMatchObject({
      puntaje_sugerido: 10,
      proveedor: 'fake',
      modelo: 'fake-test',
      criterio_fuente: 'solucion_inciso',
      criterio_hash: crearHashCriterio({
        valor_correcto: 4,
        tolerancia: 0.1,
      }),
    });
    expect(fila?.estado).not.toBe('aceptada');
  });

  it('marca error si el proveedor falla', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const worker = crearWorker(
      almacen,
      proveedorDeCorreccion(async () => {
        throw new Error('fallo interno del proveedor');
      }),
    );

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.filas.get(41)).toMatchObject({
      estado: 'error',
      codigoError: 'PROVEEDOR_ERROR',
    });
  });

  it('recorta el puntaje de salida al máximo y redondea a dos decimales', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const worker = crearWorker(
      almacen,
      proveedorDeCorreccion(async () =>
        resultado({ puntaje_sugerido: 12.349 }),
      ),
    );

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.filas.get(41)?.resultado?.puntaje_sugerido).toBe(10);
  });

  it('rechaza la salida con confianza fuera de rango', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const worker = crearWorker(
      almacen,
      proveedorDeCorreccion(async () => resultado({ confianza: 1.2 })),
    );

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(almacen.filas.get(41)).toMatchObject({
      estado: 'error',
      codigoError: 'CONFIANZA_FUERA_DE_RANGO',
    });
  });

  it('marca EXAMEN_PUBLICADO si el examen se cierra durante la llamada al proveedor', async () => {
    const contexto = crearContexto();
    const almacen = new AlmacenEnMemoria([contexto]);
    const fila = almacen.filas.get(contexto.propuesta_id);
    if (!fila) {
      throw new Error('Falta la fila de prueba.');
    }
    fila.cerrarAlPersistir = true;
    const worker = crearWorker(
      almacen,
      proveedorDeCorreccion(async () => resultado()),
    );

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    expect(fila).toMatchObject({
      estado: 'error',
      codigoError: 'EXAMEN_PUBLICADO',
    });
    expect(fila.resultado).toBeUndefined();
  });

  it('no procesa ni altera propuestas pendientes de exámenes cerrados', async () => {
    const almacen = new AlmacenEnMemoria([
      crearContexto(41, { examen_cerrado: true }),
    ]);
    const proveedor = new FakeAiProvider({ modelo: 'fake-test' });
    const corregir = jest.spyOn(proveedor, 'corregirRespuesta');
    const worker = crearWorker(almacen, proveedor);

    await expect(worker.procesarCiclo()).resolves.toBe(0);

    expect(almacen.filas.get(41)?.estado).toBe('pendiente');
    expect(corregir).not.toHaveBeenCalled();
  });

  it('solo marca error EXAMEN_PUBLICADO para una propuesta cerrada que estaba procesando', async () => {
    const contexto = crearContexto(41, { examen_cerrado: true });
    const almacen = new AlmacenEnMemoria([contexto]);
    const fila = almacen.filas.get(contexto.propuesta_id);
    if (!fila) {
      throw new Error('Falta la fila de prueba.');
    }
    fila.estado = 'procesando';
    const worker = crearWorker(almacen);

    await expect(worker.recuperarAbandonadas()).resolves.toMatchObject({
      cerradas: 1,
    });

    expect(fila).toMatchObject({
      estado: 'error',
      codigoError: 'EXAMEN_PUBLICADO',
    });
  });

  it('recupera lease vencido con intentos disponibles a pendiente', async () => {
    const contexto = crearContexto();
    const almacen = new AlmacenEnMemoria([contexto]);
    const fila = almacen.filas.get(contexto.propuesta_id);
    if (!fila) {
      throw new Error('Falta la fila de prueba.');
    }
    fila.estado = 'procesando';
    fila.reintentos_worker = 2;
    let parametros: [number, number] | undefined;
    almacen.recuperacion = (lease, max) => {
      parametros = [lease, max];
    };
    const worker = crearWorker(almacen);

    await expect(worker.recuperarAbandonadas()).resolves.toMatchObject({
      reencoladas: 1,
      agotadas: 0,
    });
    expect(parametros).toEqual([120, 3]);
    expect(fila.estado).toBe('pendiente');
  });

  it('marca TIEMPO_AGOTADO cuando vence el lease sin intentos disponibles', async () => {
    const contexto = crearContexto();
    const almacen = new AlmacenEnMemoria([contexto]);
    const fila = almacen.filas.get(contexto.propuesta_id);
    if (!fila) {
      throw new Error('Falta la fila de prueba.');
    }
    fila.estado = 'procesando';
    fila.reintentos_worker = 3;
    const worker = crearWorker(almacen);

    await expect(worker.recuperarAbandonadas()).resolves.toMatchObject({
      reencoladas: 0,
      agotadas: 1,
    });
    expect(fila).toMatchObject({
      estado: 'error',
      codigoError: 'TIEMPO_AGOTADO',
    });
  });

  it('nunca cambia automáticamente una propuesta a aceptada', async () => {
    const almacen = new AlmacenEnMemoria([crearContexto()]);
    const worker = crearWorker(almacen);

    await worker.procesarCiclo();
    await worker.esperarInactividad();

    for (const fila of almacen.filas.values()) {
      expect(fila.estado).not.toBe('aceptada');
    }
  });
});
