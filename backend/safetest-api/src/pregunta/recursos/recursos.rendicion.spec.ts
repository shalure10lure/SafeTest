import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

type Servicio = import('./recursos.service').PreguntaRecursosService;

let PreguntaRecursosService: typeof import('./recursos.service').PreguntaRecursosService;

beforeAll(async () => {
  jest.unstable_mockModule('../pregunta.service', () => ({
    PreguntaService: class PreguntaService {},
  }));
  jest.unstable_mockModule(
    '../../preguntarecurso/entity/preguntarecurso.entity',
    () => ({
      PreguntaRecurso: class PreguntaRecurso {},
      TIPOS_RECURSO: ['imagen', 'tabla', 'formula'],
    }),
  );

  ({ PreguntaRecursosService } = await import('./recursos.service'));
});

interface Fila {
  pregunta_id: number;
  recurso: string;
  tipo: 'imagen' | 'tabla' | 'formula';
  contenido: string | null;
  mime_type: string | null;
  nombre_original: string | null;
  creado_en: Date;
}

const FECHA = new Date('2026-11-09T12:00:00.000Z');

function fila(datos: Partial<Fila> & Pick<Fila, 'recurso' | 'tipo'>): Fila {
  return {
    pregunta_id: 21,
    contenido: null,
    mime_type: null,
    nombre_original: null,
    creado_en: FECHA,
    ...datos,
  };
}

class RepositorioFalso {
  filas: Fila[] = [];
  duenos: { docente_id: number }[] = [{ docente_id: 7 }];
  consultas: unknown[][] = [];

  manager = {
    query: (sql: string, parametros: unknown[]) => {
      this.consultas.push([sql, parametros]);
      return Promise.resolve(this.duenos);
    },
  };

  find(opciones: { where: { pregunta_id: number } }) {
    return Promise.resolve(
      this.filas.filter((f) => f.pregunta_id === opciones.where.pregunta_id),
    );
  }

  findOneBy(criterio: { pregunta_id: number; recurso: string }) {
    return Promise.resolve(
      this.filas.find(
        (f) =>
          f.pregunta_id === criterio.pregunta_id &&
          f.recurso === criterio.recurso,
      ) ?? null,
    );
  }
}

class AlmacenFalso {
  archivos = new Map<string, Buffer>();

  leer(clave: string): Promise<Buffer> {
    const contenido = this.archivos.get(clave);
    return contenido
      ? Promise.resolve(contenido)
      : Promise.reject(new Error('no existe'));
  }
}

describe('PreguntaRecursosService (vista del estudiante)', () => {
  let repositorio: RepositorioFalso;
  let almacen: AlmacenFalso;
  let servicio: Servicio;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    almacen = new AlmacenFalso();
    servicio = new PreguntaRecursosService(
      repositorio as never,
      {} as never,
      almacen as never,
      { maxBytesImagen: 1024, directorioAlmacen: 'no-se-usa' },
    );
  });

  it('lista los recursos de la pregunta sin exigir ser el docente dueño', async () => {
    repositorio.filas = [
      fila({ recurso: 'f1', tipo: 'formula', contenido: 'x^2' }),
      fila({ pregunta_id: 99, recurso: 'otra', tipo: 'formula', contenido: 'y' }),
    ];

    const recursos = await servicio.listarParaRendicion(21);

    expect(recursos.map((r) => r.recurso)).toEqual(['f1']);
    expect(recursos[0].contenido).toBe('x^2');
  });

  it('devuelve la imagen leyendo la carpeta del docente dueño de la pregunta', async () => {
    repositorio.filas = [
      fila({
        recurso: 'img1.png',
        tipo: 'imagen',
        mime_type: 'image/png',
      }),
    ];
    const bytes = Buffer.from([0x89, 0x50]);
    almacen.archivos.set('preguntas/7/img1.png', bytes);

    const imagen = await servicio.obtenerImagenParaRendicion(21, 'img1.png');

    expect(imagen.mime).toBe('image/png');
    expect(imagen.contenido).toBe(bytes);
    expect(repositorio.consultas[0][1]).toEqual([21]);
  });

  it('rechaza un recurso que no es imagen o que no existe', async () => {
    repositorio.filas = [
      fila({ recurso: 'f1', tipo: 'formula', contenido: 'x' }),
    ];

    await expect(
      servicio.obtenerImagenParaRendicion(21, 'f1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      servicio.obtenerImagenParaRendicion(21, 'no-existe'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 404 si la imagen ya no está en el almacén o no hay dueño', async () => {
    repositorio.filas = [
      fila({ recurso: 'img1.png', tipo: 'imagen', mime_type: 'image/png' }),
    ];

    await expect(
      servicio.obtenerImagenParaRendicion(21, 'img1.png'),
    ).rejects.toBeInstanceOf(NotFoundException);

    repositorio.duenos = [];
    await expect(
      servicio.obtenerImagenParaRendicion(21, 'img1.png'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
