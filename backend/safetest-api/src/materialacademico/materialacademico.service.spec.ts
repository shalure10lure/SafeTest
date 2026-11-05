import 'reflect-metadata';

import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';

import { pdfConTexto } from '../../test/fixtures/archivos-prueba';
import {
  cargarConfiguracionMateriales,
  type MaterialesConfig,
} from '../config/materiales.config';
import type { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import type { Materia } from '../materia/entity/materia.entity';
import type { Tema } from '../tema/entity/tema.entity';
import type { AlmacenArchivos } from './almacen/almacen-archivos';
import type { CrearMaterialDto } from './dto/crear-material.dto';
import type { MaterialAcademico } from './entity/materialacademico.entity';
import type { ExtractorTextoService } from './extraccion/extractor-texto.service';
import type { ArchivoSubido } from './materialacademico.types';

/**
 * Las entidades reales forman ciclos bajo ESM; el servicio solo las usa como
 * tokens de TypeORM, así que se sustituyen por clases vacías.
 */
let MaterialAcademicoService: typeof import('./materialacademico.service').MaterialAcademicoService;
let ErrorMaterial: typeof import('./materialacademico.errores').ErrorMaterial;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/materialacademico.entity', () => ({
    MaterialAcademico: class MaterialAcademico {},
  }));
  jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
    Materia: class Materia {},
  }));
  jest.unstable_mockModule('../tema/entity/tema.entity', () => ({
    Tema: class Tema {},
  }));
  jest.unstable_mockModule(
    '../iageneracionmaterial/entity/iageneracionmaterial.entity',
    () => ({ IaGeneracionMaterial: class IaGeneracionMaterial {} }),
  );

  ({ MaterialAcademicoService } = await import('./materialacademico.service'));
  ({ ErrorMaterial } = await import('./materialacademico.errores'));
});

interface RepoMock {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

function repoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((datos: unknown) => datos),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

function montar(configuracion: Partial<MaterialesConfig> = {}) {
  const material = repoMock();
  const materia = repoMock();
  const tema = repoMock();
  const generacionMaterial = repoMock();
  const config = {
    ...cargarConfiguracionMateriales({}),
    ...configuracion,
  };
  const extractor = {
    extraer: jest.fn().mockResolvedValue('Texto extraído del material'),
  };
  const almacen = {
    guardar: jest.fn().mockResolvedValue(undefined),
    eliminar: jest.fn().mockResolvedValue(undefined),
  };

  const servicio = new MaterialAcademicoService(
    material as unknown as Repository<MaterialAcademico>,
    materia as unknown as Repository<Materia>,
    tema as unknown as Repository<Tema>,
    generacionMaterial as unknown as Repository<IaGeneracionMaterial>,
    config,
    extractor as unknown as ExtractorTextoService,
    almacen as unknown as AlmacenArchivos,
  );

  return {
    servicio,
    material,
    materia,
    tema,
    generacionMaterial,
    extractor,
    almacen,
  };
}

const DTO: CrearMaterialDto = { titulo: 'Apunte de derivadas', materia_id: 1 };

function archivoPdf(): ArchivoSubido {
  const buffer = pdfConTexto('Hola SafeTest');

  return {
    originalname: 'apunte.pdf',
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
  };
}

describe('MaterialAcademicoService', () => {
  describe('crear', () => {
    it('guarda el original, extrae el texto y crea el material sin autorización de IA', async () => {
      const { servicio, material, materia, almacen } = montar();

      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
        nombre: 'Matemática',
      });
      material.save.mockImplementation(async (datos: object) => ({
        ...datos,
        material_id: 10,
        fecha_subida: new Date('2026-01-01'),
      }));

      const archivo = archivoPdf();
      const resultado = await servicio.crear(7, DTO, archivo);

      expect(almacen.guardar).toHaveBeenCalledWith(
        expect.stringMatching(/^materiales\/7\/[0-9a-f-]{36}\.pdf$/),
        archivo.buffer,
        'application/pdf',
      );
      expect(material.create).toHaveBeenCalledWith(
        expect.objectContaining({
          docente_id: 7,
          materia_id: 1,
          tema_id: null,
          titulo: DTO.titulo,
          texto_extraido: 'Texto extraído del material',
          autorizado_ia: false,
          autorizado_en: null,
          activo: true,
          mime_type: 'application/pdf',
          tamano_bytes: String(archivo.buffer.length),
        }),
      );
      expect(resultado).toMatchObject({
        material_id: 10,
        titulo: DTO.titulo,
        materia: 'Matemática',
        tema: null,
        autorizado_ia: false,
        autorizado_en: null,
        estado_extraccion: { estado: 'completado', caracteres: 27 },
      });
      expect(resultado).not.toHaveProperty('storage_key');
      expect(resultado).not.toHaveProperty('texto_extraido');
    });

    it('asocia el tema cuando pertenece a la materia', async () => {
      const { servicio, material, materia, tema } = montar();

      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
        nombre: 'Matemática',
      });
      tema.findOneBy.mockResolvedValue({
        tema_id: 2,
        materia_id: 1,
        nombre_tema: 'Derivadas',
      });
      material.save.mockImplementation(async (datos: object) => ({
        ...datos,
        material_id: 11,
        fecha_subida: new Date(),
      }));

      const resultado = await servicio.crear(
        7,
        { ...DTO, tema_id: 2 },
        archivoPdf(),
      );

      expect(resultado.tema).toBe('Derivadas');
      expect(material.create).toHaveBeenCalledWith(
        expect.objectContaining({ tema_id: 2 }),
      );
    });

    it('rechaza una materia que no pertenece al docente', async () => {
      const { servicio, materia, almacen } = montar();
      materia.findOneBy.mockResolvedValue(null);

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(almacen.guardar).not.toHaveBeenCalled();
    });

    it('rechaza un tema que no pertenece a la materia', async () => {
      const { servicio, materia, tema } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      tema.findOneBy.mockResolvedValue({ tema_id: 9, materia_id: 99 });

      await expect(
        servicio.crear(7, { ...DTO, tema_id: 9 }, archivoPdf()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza la carga sin archivo', async () => {
      const { servicio, materia } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });

      await expect(servicio.crear(7, DTO, undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza extensiones no permitidas', async () => {
      const { servicio, materia } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });

      await expect(
        servicio.crear(7, DTO, {
          ...archivoPdf(),
          originalname: 'programa.exe',
          mimetype: 'application/octet-stream',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un archivo vacío', async () => {
      const { servicio, materia } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });

      await expect(
        servicio.crear(7, DTO, {
          originalname: 'vacio.pdf',
          mimetype: 'application/pdf',
          size: 0,
          buffer: Buffer.alloc(0),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('responde 413 cuando el archivo supera el máximo', async () => {
      const { servicio, materia } = montar({ maxBytes: 10 });
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        PayloadTooLargeException,
      );
    });

    it('responde 422 cuando la extracción no produce texto', async () => {
      const { servicio, materia, extractor, almacen } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      extractor.extraer.mockRejectedValue(
        new ErrorMaterial('sin_texto', 'Sin texto'),
      );

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(almacen.guardar).not.toHaveBeenCalled();
    });

    it('responde 422 cuando el documento está dañado', async () => {
      const { servicio, materia, extractor } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      extractor.extraer.mockRejectedValue(
        new ErrorMaterial('extraccion_fallida', 'Dañado'),
      );

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('responde 503 si el almacenamiento falla y no registra nada', async () => {
      const { servicio, material, materia, almacen } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      almacen.guardar.mockRejectedValue(new Error('disco lleno'));

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(material.save).not.toHaveBeenCalled();
    });

    it('revierte el archivo guardado si falla el registro en base', async () => {
      const { servicio, material, materia, almacen } = montar();
      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      material.save.mockRejectedValue(new Error('db caída'));

      await expect(servicio.crear(7, DTO, archivoPdf())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(almacen.eliminar).toHaveBeenCalledWith(
        expect.stringMatching(/^materiales\/7\//),
      );
    });
  });

  describe('listar', () => {
    it('consulta solo los materiales del docente y aplica los filtros', async () => {
      const { servicio, material } = montar();
      material.find.mockResolvedValue([]);

      await servicio.listar(7, { materia_id: 3, activo: true });

      expect(material.find).toHaveBeenCalledWith({
        where: { docente_id: 7, materia_id: 3, activo: true },
        relations: { materia: true, tema: true },
        order: { fecha_subida: 'DESC', material_id: 'DESC' },
      });
    });

    it('sin filtros devuelve todos los materiales del docente', async () => {
      const { servicio, material } = montar();
      material.find.mockResolvedValue([]);

      await servicio.listar(7);

      expect(material.find).toHaveBeenCalledWith({
        where: { docente_id: 7 },
        relations: { materia: true, tema: true },
        order: { fecha_subida: 'DESC', material_id: 'DESC' },
      });
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el material es de otro docente', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue(null);

      await expect(servicio.obtener(7, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(material.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { material_id: 99, docente_id: 7 },
        }),
      );
    });
  });

  describe('estadoExtraccion', () => {
    it('informa el texto disponible y si el material puede usarse en IA', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({
        material_id: 4,
        texto_extraido: 'abc',
        activo: true,
        autorizado_ia: false,
      });

      await expect(servicio.estadoExtraccion(7, 4)).resolves.toEqual({
        material_id: 4,
        estado: 'completado',
        caracteres: 3,
        activo: true,
        autorizado_ia: false,
        disponible_para_ia: false,
      });
    });

    it('informa sin_texto cuando no hay extracción', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({
        material_id: 4,
        texto_extraido: null,
        activo: true,
        autorizado_ia: false,
      });

      await expect(servicio.estadoExtraccion(7, 4)).resolves.toMatchObject({
        estado: 'sin_texto',
        caracteres: 0,
        disponible_para_ia: false,
      });
    });
  });

  describe('autorizar', () => {
    const MATERIAL_BASE = {
      material_id: 5,
      docente_id: 7,
      activo: true,
      autorizado_ia: false,
      autorizado_en: null,
      texto_extraido: 'contenido',
      fecha_subida: new Date(),
    };

    it('activa la autorización con fecha explícita', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({ ...MATERIAL_BASE });
      material.update.mockResolvedValue({ affected: 1 });

      const resultado = await servicio.autorizar(7, 5, { autorizado: true });

      expect(resultado.autorizado_ia).toBe(true);
      expect(resultado.autorizado_en).toBeInstanceOf(Date);
      expect(material.update).toHaveBeenCalledWith(
        { material_id: 5, docente_id: 7 },
        {
          autorizado_ia: true,
          autorizado_en: expect.any(Date),
        },
      );
    });

    it('revoca la autorización y borra la fecha', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({
        ...MATERIAL_BASE,
        autorizado_ia: true,
        autorizado_en: new Date(),
      });
      material.update.mockResolvedValue({ affected: 1 });

      const resultado = await servicio.autorizar(7, 5, { autorizado: false });

      expect(resultado.autorizado_ia).toBe(false);
      expect(resultado.autorizado_en).toBeNull();
      expect(material.update).toHaveBeenCalledWith(
        { material_id: 5, docente_id: 7 },
        { autorizado_ia: false, autorizado_en: null },
      );
    });

    it('no autoriza materiales sin texto extraído', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({
        ...MATERIAL_BASE,
        texto_extraido: null,
      });

      await expect(
        servicio.autorizar(7, 5, { autorizado: true }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(material.update).not.toHaveBeenCalled();
    });

    it('no autoriza materiales inactivos', async () => {
      const { servicio, material } = montar();
      material.findOne.mockResolvedValue({
        ...MATERIAL_BASE,
        activo: false,
      });

      await expect(
        servicio.autorizar(7, 5, { autorizado: true }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('eliminar', () => {
    it('borra el registro y el archivo cuando nunca se usó en IA', async () => {
      const { servicio, material, generacionMaterial, almacen } = montar();
      material.findOne.mockResolvedValue({
        material_id: 5,
        storage_key: 'materiales/7/abc.pdf',
      });
      generacionMaterial.count.mockResolvedValue(0);
      material.delete.mockResolvedValue({ affected: 1 });

      await servicio.eliminar(7, 5);

      expect(material.delete).toHaveBeenCalledWith({
        material_id: 5,
        docente_id: 7,
      });
      expect(almacen.eliminar).toHaveBeenCalledWith('materiales/7/abc.pdf');
    });

    it('no elimina un material que forma parte de una generación', async () => {
      const { servicio, material, generacionMaterial, almacen } = montar();
      material.findOne.mockResolvedValue({
        material_id: 5,
        storage_key: 'materiales/7/abc.pdf',
      });
      generacionMaterial.count.mockResolvedValue(1);

      await expect(servicio.eliminar(7, 5)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(material.delete).not.toHaveBeenCalled();
      expect(almacen.eliminar).not.toHaveBeenCalled();
    });
  });
});
