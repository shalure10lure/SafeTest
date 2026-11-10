import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';

import type { PreguntaRecurso } from '../../preguntarecurso/entity/preguntarecurso.entity';
import type { PreguntaService } from '../pregunta.service';
import type { AlmacenImagenesPregunta } from './almacen-imagenes-pregunta';
import type { CrearRecursoDto } from './dto/crear-recurso.dto';
import type { PreguntaRecursosService as ServicioTipo } from './recursos.service';
import type { ArchivoSubido } from './recursos.types';

let PreguntaRecursosService: typeof ServicioTipo;

beforeAll(async () => {
  // Se simulan estos módulos para evitar el ciclo entre entidades de TypeORM.
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

  // @ts-ignore: el editor no resuelve este import dinámico; en ejecución sí.
  const modulo = await import('./recursos.service');

  PreguntaRecursosService = modulo.PreguntaRecursosService;
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

class RepositorioFalso {
  filas: PreguntaRecurso[] = [];
  fallarAlActualizar = false;

  create(datos: Partial<PreguntaRecurso>): PreguntaRecurso {
    return { ...datos } as PreguntaRecurso;
  }

  save(fila: PreguntaRecurso): Promise<PreguntaRecurso> {
    const indice = this.filas.findIndex(
      (actual) =>
        actual.pregunta_id === fila.pregunta_id &&
        actual.recurso === fila.recurso,
    );

    if (indice >= 0) {
      this.filas[indice] = { ...fila };

      return Promise.resolve(this.filas[indice]);
    }

    const nueva = { ...fila, creado_en: new Date() } as PreguntaRecurso;

    this.filas.push(nueva);

    return Promise.resolve(nueva);
  }

  findOneBy(criterio: {
    pregunta_id: number;
    recurso: string;
  }): Promise<PreguntaRecurso | null> {
    const fila = this.filas.find(
      (actual) =>
        actual.pregunta_id === criterio.pregunta_id &&
        actual.recurso === criterio.recurso,
    );

    return Promise.resolve(fila ? { ...fila } : null);
  }

  update(
    criterio: { pregunta_id: number; recurso: string },
    cambios: Partial<PreguntaRecurso>,
  ): Promise<void> {
    if (this.fallarAlActualizar) {
      return Promise.reject(new Error('fallo de base de datos'));
    }

    this.filas = this.filas.map((fila) =>
      fila.pregunta_id === criterio.pregunta_id &&
      fila.recurso === criterio.recurso
        ? ({ ...fila, ...cambios } as PreguntaRecurso)
        : fila,
    );

    return Promise.resolve();
  }
}

class PreguntaServiceFalso {
  publicada = false;

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

  eliminar(clave: string): Promise<void> {
    this.archivos.delete(clave);

    return Promise.resolve();
  }
}

function archivo(buffer: Buffer, nombre = 'nueva.jpg'): ArchivoSubido {
  return { buffer, originalname: nombre, mimetype: 'image/jpeg', size: buffer.length };
}

describe('PreguntaRecursosService (edición de recursos)', () => {
  let repositorio: RepositorioFalso;
  let preguntas: PreguntaServiceFalso;
  let almacen: AlmacenFalso;
  let servicio: ServicioTipo;

  const FECHA = new Date('2026-01-01T00:00:00Z');

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

    repositorio.filas = [
      {
        pregunta_id: 1,
        recurso: 'f1',
        tipo: 'formula',
        contenido: 'x^2',
        mime_type: null,
        nombre_original: null,
        creado_en: FECHA,
      },
      {
        pregunta_id: 1,
        recurso: 't1',
        tipo: 'tabla',
        contenido: JSON.stringify({ encabezado: true, filas: [['a', 'b']] }),
        mime_type: null,
        nombre_original: null,
        creado_en: FECHA,
      },
      {
        pregunta_id: 1,
        recurso: 'vieja.png',
        tipo: 'imagen',
        contenido: null,
        mime_type: 'image/png',
        nombre_original: 'vieja.png',
        creado_en: FECHA,
      },
    ] as PreguntaRecurso[];
    almacen.archivos.set('preguntas/7/vieja.png', PNG);
  });

  describe('actualizarContenido', () => {
    it('cambia la fórmula conservando el mismo recurso', async () => {
      const dto = { tipo: 'formula', contenido: ' \\frac{a}{b} ' } as CrearRecursoDto;

      const resultado = await servicio.actualizarContenido(1, 7, 'f1', dto);

      expect(resultado.recurso).toBe('f1');
      expect(resultado.contenido).toBe('\\frac{a}{b}');
      expect(repositorio.filas).toHaveLength(3);
      expect(repositorio.filas[0].creado_en).toBe(FECHA);
    });

    it('cambia el contenido de una tabla', async () => {
      const dto = {
        tipo: 'tabla',
        contenido: { encabezado: false, filas: [['1', '2'], ['3', '4']] },
      } as CrearRecursoDto;

      const resultado = await servicio.actualizarContenido(1, 7, 't1', dto);

      expect(resultado.recurso).toBe('t1');
      expect(resultado.contenido).toEqual({
        encabezado: false,
        filas: [['1', '2'], ['3', '4']],
      });
    });

    it('rechaza contenido inválido sin modificar el guardado', async () => {
      const dto = { tipo: 'formula', contenido: '   ' } as CrearRecursoDto;

      await expect(
        servicio.actualizarContenido(1, 7, 'f1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repositorio.filas[0].contenido).toBe('x^2');
    });

    it('no permite cambiar el tipo ni editar una imagen', async () => {
      await expect(
        servicio.actualizarContenido(1, 7, 'f1', {
          tipo: 'tabla',
          contenido: { encabezado: true, filas: [['a']] },
        } as CrearRecursoDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        servicio.actualizarContenido(1, 7, 'vieja.png', {
          tipo: 'formula',
          contenido: 'x',
        } as CrearRecursoDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('responde 404 si el recurso no existe', async () => {
      await expect(
        servicio.actualizarContenido(1, 7, 'no-existe', {
          tipo: 'formula',
          contenido: 'x',
        } as CrearRecursoDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('respeta el bloqueo de preguntas en evaluaciones publicadas', async () => {
      preguntas.publicada = true;

      await expect(
        servicio.actualizarContenido(1, 7, 'f1', {
          tipo: 'formula',
          contenido: 'y',
        } as CrearRecursoDto),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repositorio.filas[0].contenido).toBe('x^2');
    });
  });

  describe('reemplazarImagen', () => {
    it('guarda la imagen nueva, borra la anterior y conserva la posición', async () => {
      const resultado = await servicio.reemplazarImagen(
        1,
        7,
        'vieja.png',
        archivo(JPG, 'C:\\fakepath\\nueva.jpg'),
      );

      expect(resultado.recurso).toMatch(/^[0-9a-f-]{36}\.jpg$/);
      expect(resultado.recurso).not.toBe('vieja.png');
      expect(resultado.mime_type).toBe('image/jpeg');
      expect(resultado.nombre_original).toBe('nueva.jpg');
      expect(resultado.creado_en).toBe(FECHA);
      expect([...almacen.archivos.keys()]).toEqual([
        `preguntas/7/${resultado.recurso}`,
      ]);
      expect(repositorio.filas.map((fila) => fila.recurso)).not.toContain(
        'vieja.png',
      );
      expect(repositorio.filas).toHaveLength(3);
    });

    it('rechaza una imagen inválida y deja la anterior intacta', async () => {
      await expect(
        servicio.reemplazarImagen(1, 7, 'vieja.png', archivo(SVG)),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        servicio.reemplazarImagen(1, 7, 'vieja.png', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect([...almacen.archivos.keys()]).toEqual(['preguntas/7/vieja.png']);
      expect(repositorio.filas[2].recurso).toBe('vieja.png');
    });

    it('solo reemplaza recursos que son imágenes', async () => {
      await expect(
        servicio.reemplazarImagen(1, 7, 'f1', archivo(JPG)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('si falla la base de datos, borra el archivo nuevo y conserva el anterior', async () => {
      repositorio.fallarAlActualizar = true;

      await expect(
        servicio.reemplazarImagen(1, 7, 'vieja.png', archivo(JPG)),
      ).rejects.toThrow('fallo de base de datos');

      expect([...almacen.archivos.keys()]).toEqual(['preguntas/7/vieja.png']);
      expect(repositorio.filas[2].recurso).toBe('vieja.png');
    });

    it('respeta el bloqueo de preguntas en evaluaciones publicadas', async () => {
      preguntas.publicada = true;

      await expect(
        servicio.reemplazarImagen(1, 7, 'vieja.png', archivo(JPG)),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
