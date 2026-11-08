import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { PreguntaRecurso } from '../../preguntarecurso/entity/preguntarecurso.entity';
import type { PreguntaService } from '../pregunta.service';
import type { AlmacenImagenesPregunta } from './almacen-imagenes-pregunta';
import { jest } from '@jest/globals';
import type { ArchivoSubido } from './recursos.types';

type ServicioRecursos = import('./recursos.service').PreguntaRecursosService;

// El servicio se importa de forma dinámica, después de sustituir los módulos
// que arrastran entidades de TypeORM: con ESM, las referencias circulares entre
// entidades fallan al cargarse ("Cannot access 'Examen' before initialization").
let PreguntaRecursosService: typeof import('./recursos.service').PreguntaRecursosService;
let MAX_RECURSOS_POR_PREGUNTA: number;

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

  ({ PreguntaRecursosService, MAX_RECURSOS_POR_PREGUNTA } = await import(
    './recursos.service'
  ));
});
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

class RepositorioFalso {
  filas: PreguntaRecurso[] = [];
  fallarAlGuardar = false;

  create(datos: Partial<PreguntaRecurso>): PreguntaRecurso {
    return { ...datos } as PreguntaRecurso;
  }

  save(fila: PreguntaRecurso): Promise<PreguntaRecurso> {
    if (this.fallarAlGuardar) {
      return Promise.reject(new Error('fallo de base de datos'));
    }

    const guardada = { ...fila, creado_en: new Date() } as PreguntaRecurso;

    this.filas.push(guardada);

    return Promise.resolve(guardada);
  }

  find(opciones: { where: { pregunta_id: number } }): Promise<PreguntaRecurso[]> {
    return Promise.resolve(
      this.filas.filter((fila) => fila.pregunta_id === opciones.where.pregunta_id),
    );
  }

  findOneBy(criterio: {
    pregunta_id: number;
    recurso: string;
  }): Promise<PreguntaRecurso | null> {
    return Promise.resolve(
      this.filas.find(
        (fila) =>
          fila.pregunta_id === criterio.pregunta_id &&
          fila.recurso === criterio.recurso,
      ) ?? null,
    );
  }

  count(opciones: { where: { pregunta_id: number } }): Promise<number> {
    return Promise.resolve(
      this.filas.filter((fila) => fila.pregunta_id === opciones.where.pregunta_id)
        .length,
    );
  }

  delete(criterio: { pregunta_id: number; recurso: string }): Promise<void> {
    this.filas = this.filas.filter(
      (fila) =>
        !(
          fila.pregunta_id === criterio.pregunta_id &&
          fila.recurso === criterio.recurso
        ),
    );

    return Promise.resolve();
  }
}

class PreguntaServiceFalso {
  publicada = false;

  findOne(): Promise<object> {
    return Promise.resolve({});
  }

  obtenerEditable(): Promise<object> {
    return this.publicada
      ? Promise.reject(
          new ConflictException(
            'No puedes modificar una pregunta que pertenece a una evaluación publicada',
          ),
        )
      : Promise.resolve({});
  }
}

class AlmacenFalso {
  archivos = new Map<string, Buffer>();

  guardar(clave: string, contenido: Buffer): Promise<void> {
    this.archivos.set(clave, contenido);

    return Promise.resolve();
  }

  leer(clave: string): Promise<Buffer> {
    const contenido = this.archivos.get(clave);

    return contenido
      ? Promise.resolve(contenido)
      : Promise.reject(new Error('no existe'));
  }

  eliminar(clave: string): Promise<void> {
    this.archivos.delete(clave);

    return Promise.resolve();
  }
}

function archivo(buffer: Buffer): ArchivoSubido {
  return {
    buffer,
    originalname: 'C:\\fakepath\\esquema.png',
    mimetype: 'image/png',
    size: buffer.length,
  };
}

describe('PreguntaRecursosService', () => {
  let repositorio: RepositorioFalso;
  let preguntas: PreguntaServiceFalso;
  let almacen: AlmacenFalso;
  let servicio: ServicioRecursos;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    preguntas = new PreguntaServiceFalso();
    almacen = new AlmacenFalso();
    servicio = new PreguntaRecursosService(
      repositorio as unknown as Repository<PreguntaRecurso>,
      preguntas as unknown as PreguntaService,
      almacen as unknown as AlmacenImagenesPregunta,
      { maxBytesImagen: 1024, directorioAlmacen: 'no-se-usa' },
    );
  });

  it('guarda la imagen en el almacén y su fila, sin exponer rutas', async () => {
    const creado = await servicio.agregarImagen(1, 7, archivo(PNG));

    expect(creado.tipo).toBe('imagen');
    expect(creado.mime_type).toBe('image/png');
    expect(creado.nombre_original).toBe('esquema.png');
    expect(creado.recurso).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect([...almacen.archivos.keys()]).toEqual([`preguntas/7/${creado.recurso}`]);
    await expect(servicio.listar(1, 7)).resolves.toHaveLength(1);
  });

  it('rechaza una imagen inválida sin guardar nada', async () => {
    await expect(servicio.agregarImagen(1, 7, archivo(SVG))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(servicio.agregarImagen(1, 7, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(almacen.archivos.size).toBe(0);
    expect(repositorio.filas).toHaveLength(0);
  });

  it('borra el archivo si falla el guardado en la base de datos', async () => {
    repositorio.fallarAlGuardar = true;

    await expect(servicio.agregarImagen(1, 7, archivo(PNG))).rejects.toThrow(
      'fallo de base de datos',
    );
    expect(almacen.archivos.size).toBe(0);
  });

  it('guarda una fórmula y una tabla y las devuelve al listar', async () => {
    await servicio.agregarContenido(1, 7, {
      tipo: 'formula',
      contenido: ' \\frac{a}{b} ',
    });
    await servicio.agregarContenido(1, 7, {
      tipo: 'tabla',
      contenido: { encabezado: true, filas: [[' x ', 'y'], ['1', '2']] },
    });

    const recursos = await servicio.listar(1, 7);

    expect(recursos.map((recurso) => recurso.tipo)).toEqual(['formula', 'tabla']);
    expect(recursos[0].contenido).toBe('\\frac{a}{b}');
    expect(recursos[1].contenido).toEqual({
      encabezado: true,
      filas: [['x', 'y'], ['1', '2']],
    });
  });

  it('rechaza fórmulas y tablas inválidas', async () => {
    await expect(
      servicio.agregarContenido(1, 7, { tipo: 'formula', contenido: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.agregarContenido(1, 7, { tipo: 'tabla', contenido: { filas: [] } }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repositorio.filas).toHaveLength(0);
  });

  it('devuelve los bytes de una imagen y no de una fórmula', async () => {
    const imagen = await servicio.agregarImagen(1, 7, archivo(PNG));
    const formula = await servicio.agregarContenido(1, 7, {
      tipo: 'formula',
      contenido: 'x^2',
    });

    await expect(servicio.obtenerImagen(1, 7, imagen.recurso)).resolves.toEqual({
      contenido: PNG,
      mime: 'image/png',
    });
    await expect(
      servicio.obtenerImagen(1, 7, formula.recurso),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(servicio.obtenerImagen(1, 7, 'no-existe.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('elimina la fila y el archivo de una imagen', async () => {
    const imagen = await servicio.agregarImagen(1, 7, archivo(PNG));

    await servicio.eliminar(1, 7, imagen.recurso);

    expect(repositorio.filas).toHaveLength(0);
    expect(almacen.archivos.size).toBe(0);
    await expect(servicio.eliminar(1, 7, imagen.recurso)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no permite agregar ni quitar recursos si la evaluación está publicada', async () => {
    const imagen = await servicio.agregarImagen(1, 7, archivo(PNG));

    preguntas.publicada = true;

    await expect(servicio.agregarImagen(1, 7, archivo(PNG))).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      servicio.agregarContenido(1, 7, { tipo: 'formula', contenido: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(servicio.eliminar(1, 7, imagen.recurso)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(repositorio.filas).toHaveLength(1);
  });

  it('limita la cantidad de recursos por pregunta', async () => {
    for (let indice = 0; indice < MAX_RECURSOS_POR_PREGUNTA; indice++) {
      await servicio.agregarContenido(1, 7, {
        tipo: 'formula',
        contenido: `x_${indice}`,
      });
    }

    await expect(
      servicio.agregarContenido(1, 7, { tipo: 'formula', contenido: 'y' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});