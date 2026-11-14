import 'reflect-metadata';

import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

class ExamenPregunta {}
class Inciso {}
class Materia {}
class Opcion {}
class SolucionInciso {}
class SolucionOpcion {}
class SolucionTexto {}
class Tema {}
class Pregunta {}

let PreguntaService: typeof import('./pregunta.service').PreguntaService;

beforeAll(async () => {
    jest.unstable_mockModule('../examenpregunta/entity/examenpregunta.entity', () => ({ ExamenPregunta }));
    jest.unstable_mockModule('../inciso/entity/inciso.entity', () => ({
        Inciso,
    }));
    jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
        Materia,
    }));
    jest.unstable_mockModule('../opcion/entity/opcion.entity', () => ({
        Opcion,
    }));
    jest.unstable_mockModule('../solucioninciso/entity/solucioninciso.entity', () => ({ SolucionInciso }));
    jest.unstable_mockModule('../solucionopcion/entity/solucionopcion.entity', () => ({ SolucionOpcion }));
    jest.unstable_mockModule('../soluciontexto/entity/soluciontexto.entity', () => ({ SolucionTexto }));
    jest.unstable_mockModule('../tema/entity/tema.entity', () => ({ Tema }));
    jest.unstable_mockModule('./entity/pregunta.entity', () => ({ Pregunta }));

    ({ PreguntaService } = await import('./pregunta.service'));
});

interface QueryBuilderMock {
    innerJoin: jest.Mock;
    leftJoin: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    having: jest.Mock;
    groupBy: jest.Mock;
    addGroupBy: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getOne: jest.Mock;
    getRawMany: jest.Mock;
}

function queryBuilderMock(): QueryBuilderMock {
    const query = {
        getOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
    } as QueryBuilderMock;

    const encadenables = [
        'innerJoin',
        'leftJoin',
        'select',
        'addSelect',
        'where',
        'andWhere',
        'having',
        'groupBy',
        'addGroupBy',
        'orderBy',
        'addOrderBy',
    ] as const;

    for (const metodo of encadenables) {
        query[metodo] = jest.fn().mockReturnValue(query);
    }

    return query;
}

interface RepoMock {
    findOneBy: jest.Mock;
    createQueryBuilder: jest.Mock;
}

function repoMock(): RepoMock {
    return {
        findOneBy: jest.fn().mockResolvedValue(null),
        createQueryBuilder: jest.fn(),
    };
}

function montar() {
    const pregunta = repoMock();
    const tema = repoMock();
    const materia = repoMock();
    const examenPregunta = repoMock();
    const consultaPreguntas = queryBuilderMock();
    const consultaTemas = queryBuilderMock();
    pregunta.createQueryBuilder.mockReturnValue(consultaPreguntas);
    tema.createQueryBuilder.mockReturnValue(consultaTemas);

    const dataSource = {
        getRepository: jest.fn(),
    };

    const servicio = new PreguntaService(
        pregunta as unknown as Repository<Pregunta>,
        tema as unknown as Repository<Tema>,
        materia as unknown as Repository<Materia>,
        examenPregunta as unknown as Repository<ExamenPregunta>,
        dataSource as unknown as DataSource,
    );

    return {
        servicio,
        pregunta,
        tema,
        materia,
        consultaPreguntas,
        consultaTemas,
    };
}

function filaPregunta(overrides: Record<string, unknown> = {}) {
    return {
        pregunta_id: '13',
        enunciado: '¿Cuánto es dos más dos?',
        tema_id: '4',
        dificultad: 'facil',
        origen: 'manual',
        activo: true,
        creado_en: new Date('2026-01-02T00:00:00.000Z'),
        nombre_tema: 'Aritmética',
        materia_id: '3',
        materia_nombre: 'Matemática',
        puntos: '2.5',
        tipo_respuesta: 'opcion_unica',
        ...overrides,
    };
}

describe('PreguntaService.findAll', () => {
    it('lista preguntas activas dentro del ámbito del docente y transforma los resultados', async () => {
        const montaje = montar();
        montaje.consultaPreguntas.getRawMany.mockResolvedValue([filaPregunta()]);

        const resultado = await montaje.servicio.findAll(7);

        expect(montaje.consultaPreguntas.where).toHaveBeenCalledWith('materia.docente_id = :docenteId', {
            docenteId: 7,
        });
        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith('pregunta.activo = :activo', { activo: true });
        expect(resultado).toEqual([
            {
                pregunta_id: 13,
                enunciado: '¿Cuánto es dos más dos?',
                tema_id: 4,
                dificultad: 'facil',
                origen: 'manual',
                activo: true,
                creado_en: new Date('2026-01-02T00:00:00.000Z'),
                tipo_respuesta: 'opcion_unica',
                puntos: 2.5,
                tema: { tema_id: 4, nombre_tema: 'Aritmética' },
                materia: { materia_id: 3, nombre: 'Matemática' },
            },
        ]);
    });

    it('no consulta preguntas de otro docente ni permite filtrar por materia ajena', async () => {
        const montaje = montar();
        montaje.materia.findOneBy.mockResolvedValue(null);

        await expect(montaje.servicio.findAll(99, { materia_id: 3 })).rejects.toBeInstanceOf(NotFoundException);

        expect(montaje.materia.findOneBy).toHaveBeenCalledWith({
            materia_id: 3,
            docente_id: 99,
            activo: true,
        });
        expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('busca por texto del enunciado', async () => {
        const montaje = montar();
        montaje.consultaPreguntas.getRawMany.mockResolvedValue([]);

        await montaje.servicio.findAll(7, { buscar: 'dos más dos' });

        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith(
            "pregunta.enunciado ILIKE :buscar ESCAPE '\\'",
            { buscar: '%dos más dos%' },
        );
    });

    it('filtra por una materia perteneciente al docente', async () => {
        const montaje = montar();
        montaje.materia.findOneBy.mockResolvedValue({
            materia_id: 3,
            docente_id: 7,
            activo: true,
        });

        await montaje.servicio.findAll(7, { materia_id: 3 });

        expect(montaje.materia.findOneBy).toHaveBeenCalledWith({
            materia_id: 3,
            docente_id: 7,
            activo: true,
        });
        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', {
            materiaId: 3,
        });
    });

    it('filtra por un tema perteneciente al docente', async () => {
        const montaje = montar();
        montaje.consultaTemas.getOne.mockResolvedValue({ tema_id: 4 });

        await montaje.servicio.findAll(7, { tema_id: 4 });

        expect(montaje.consultaTemas.where).toHaveBeenCalledWith('tema.tema_id = :temaId', { temaId: 4 });
        expect(montaje.consultaTemas.andWhere).toHaveBeenCalledWith('materia.docente_id = :docenteId', {
            docenteId: 7,
        });
        expect(montaje.consultaTemas.andWhere).toHaveBeenCalledWith('materia.activo = :activo', { activo: true });
        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith('tema.tema_id = :temaId', { temaId: 4 });
    });

    it('filtra por tipo de pregunta', async () => {
        const montaje = montar();

        await montaje.servicio.findAll(7, { tipo: 'opcion_unica' });

        expect(montaje.consultaPreguntas.having).toHaveBeenCalledWith(
            'COUNT(DISTINCT inciso.tipo_respuesta) = 1 AND MIN(inciso.tipo_respuesta) = :tipo',
            { tipo: 'opcion_unica' },
        );
    });

    it('combina materia, tema, texto y tipo cuando se indican juntos', async () => {
        const montaje = montar();
        montaje.materia.findOneBy.mockResolvedValue({
            materia_id: 3,
            docente_id: 7,
            activo: true,
        });
        montaje.tema.findOneBy.mockResolvedValue({
            tema_id: 4,
            materia_id: 3,
        });

        await montaje.servicio.findAll(7, {
            materia_id: 3,
            tema_id: 4,
            buscar: 'integral',
            tipo: 'desarrollo',
        });

        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', {
            materiaId: 3,
        });
        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith('tema.tema_id = :temaId', { temaId: 4 });
        expect(montaje.consultaPreguntas.andWhere).toHaveBeenCalledWith(
            "pregunta.enunciado ILIKE :buscar ESCAPE '\\'",
            { buscar: '%integral%' },
        );
        expect(montaje.consultaPreguntas.having).toHaveBeenCalledWith(
            'COUNT(DISTINCT inciso.tipo_respuesta) = 1 AND MIN(inciso.tipo_respuesta) = :tipo',
            { tipo: 'desarrollo' },
        );
    });

    it('devuelve una lista vacía cuando no hay preguntas que coincidan', async () => {
        const montaje = montar();

        await expect(montaje.servicio.findAll(7)).resolves.toEqual([]);
        expect(montaje.consultaPreguntas.getRawMany).toHaveBeenCalledTimes(1);
    });
});
