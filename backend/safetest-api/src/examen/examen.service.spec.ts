import 'reflect-metadata';

import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

/**
 * Las entidades reales forman ciclos bajo ESM. El servicio solo las usa como
 * tokens de TypeORM y para tipar, así que se sustituyen por clases vacías.
 */
class Examen {}
class Estudiante {}
class Materia {}
class Semestre {}
class Paralelo {}
class ParaleloExamen {}
class Inscripcion {}
class ExamenPregunta {}
class ExamenTema {}
class ExamenEstudiante {}
class Pregunta {}
class Tema {}

let ExamenService: typeof import('./examen.service').ExamenService;

beforeAll(async () => {
    jest.unstable_mockModule('./entity/examen.entity', () => ({ Examen }));
    jest.unstable_mockModule('../estudiante/entity/estudiante.entity', () => ({
        Estudiante,
    }));
    jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
        Materia,
    }));
    jest.unstable_mockModule('../semestre/entity/semestre.entity', () => ({
        Semestre,
    }));
    jest.unstable_mockModule('../paralelo/entity/paralelo.entity', () => ({
        Paralelo,
    }));
    jest.unstable_mockModule('../paraleloexamen/entity/paraleloexamen.entity', () => ({ ParaleloExamen }));
    jest.unstable_mockModule('../inscripcion/entity/inscripcion.entity', () => ({
        Inscripcion,
    }));
    jest.unstable_mockModule('../examenpregunta/entity/examenpregunta.entity', () => ({ ExamenPregunta }));
    jest.unstable_mockModule('../examentema/entity/examentema.entity', () => ({
        ExamenTema,
    }));
    jest.unstable_mockModule('../examenestudiante/entity/examenestudiante.entity', () => ({ ExamenEstudiante }));
    jest.unstable_mockModule('../pregunta/entity/pregunta.entity', () => ({
        Pregunta,
    }));
    jest.unstable_mockModule('../tema/entity/tema.entity', () => ({ Tema }));

    ({ ExamenService } = await import('./examen.service'));
});

interface RepoMock {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
}

function repoMock(): RepoMock {
    return {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn(),
    };
}

interface QueryBuilderMock {
    innerJoin: jest.Mock;
    innerJoinAndSelect: jest.Mock;
    leftJoin: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    groupBy: jest.Mock;
    addGroupBy: jest.Mock;
    setLock: jest.Mock;
    getOne: jest.Mock;
    getMany: jest.Mock;
    getRawOne: jest.Mock;
    getRawMany: jest.Mock;
    getCount: jest.Mock;
    execute: jest.Mock;
}

function queryBuilderMock(): QueryBuilderMock {
    const qb = {
        getOne: jest.fn().mockResolvedValue(null),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        execute: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    } as QueryBuilderMock;

    const encadenables = [
        'innerJoin',
        'innerJoinAndSelect',
        'leftJoin',
        'leftJoinAndSelect',
        'select',
        'addSelect',
        'where',
        'andWhere',
        'orderBy',
        'addOrderBy',
        'groupBy',
        'addGroupBy',
        'setLock',
    ] as const;

    for (const metodo of encadenables) {
        qb[metodo] = jest.fn().mockReturnValue(qb);
    }

    return qb;
}

interface ManagerMock {
    getRepository: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    insert: jest.Mock;
}

interface Montaje {
    servicio: ExamenService;
    dataSource: {
        transaction: jest.Mock;
        manager: ManagerMock;
        getRepository: jest.Mock;
    };
    manager: ManagerMock;
    examen: RepoMock;
    materia: RepoMock;
    semestre: RepoMock;
    paralelo: RepoMock;
    inscripcion: RepoMock;
    pregunta: RepoMock;
    tema: RepoMock;
    examenPregunta: RepoMock;
    examenTema: RepoMock;
    examenEstudiante: RepoMock;
}

function montar(): Montaje {
    const examen = repoMock();
    const materia = repoMock();
    const semestre = repoMock();
    const paralelo = repoMock();
    const inscripcion = repoMock();
    const pregunta = repoMock();
    const tema = repoMock();
    const examenPregunta = repoMock();
    const examenTema = repoMock();
    const examenEstudiante = repoMock();

    const repositorios = new Map<unknown, RepoMock>([
        [Examen, examen],
        [Materia, materia],
        [Semestre, semestre],
        [Paralelo, paralelo],
        [Inscripcion, inscripcion],
        [Pregunta, pregunta],
        [Tema, tema],
        [ExamenPregunta, examenPregunta],
        [ExamenTema, examenTema],
        [ExamenEstudiante, examenEstudiante],
    ]);

    const manager: ManagerMock = {
        getRepository: jest.fn((entidad: unknown) => {
            const repo = repositorios.get(entidad);

            if (!repo) {
                throw new Error('Repositorio no configurado en la prueba.');
            }

            return repo;
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        insert: jest.fn().mockResolvedValue({}),
    };

    const dataSource = {
        transaction: jest.fn(async (callback: (manager: ManagerMock) => Promise<unknown>) => callback(manager)),
        manager,
        getRepository: manager.getRepository,
    };

    const servicio = new ExamenService(
        dataSource as unknown as DataSource,
        examen as unknown as Repository<Examen>,
        materia as unknown as Repository<Materia>,
        semestre as unknown as Repository<Semestre>,
        paralelo as unknown as Repository<Paralelo>,
        inscripcion as unknown as Repository<Inscripcion>,
        pregunta as unknown as Repository<Pregunta>,
        tema as unknown as Repository<Tema>,
    );

    return {
        servicio,
        dataSource,
        manager,
        examen,
        materia,
        semestre,
        paralelo,
        inscripcion,
        pregunta,
        tema,
        examenPregunta,
        examenTema,
        examenEstudiante,
    };
}

const EXAMEN_BORRADOR = {
    examen_id: 5,
    docente_id: 7,
    materia_id: 1,
    semestre_id: 2,
    estado: 'borrador',
    modo_asignacion: 'paralelos',
};

describe('ExamenService — asignación de evaluaciones', () => {
    let montaje: Montaje;

    beforeEach(() => {
        montaje = montar();
    });

    describe('getBanco', () => {
        it('devuelve preguntas activas de la materia solicitada y limita la consulta al docente', async () => {
            montaje.examen.findOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                materia_id: 2,
            });
            montaje.materia.findOne.mockResolvedValue({
                materia_id: 2,
                docente_id: 7,
            });

            const preguntas = queryBuilderMock();
            preguntas.getRawMany.mockResolvedValue([
                {
                    pregunta_id: '11',
                    enunciado: 'Pregunta de otra materia',
                    dificultad: 'facil',
                    tema_id: '10',
                    nombre_tema: 'Aritmética',
                    materia_id: '1',
                    materia_nombre: 'Matemática básica',
                    puntos: '2',
                    tipo_respuesta: 'opcion_unica',
                },
                {
                    pregunta_id: '22',
                    enunciado: 'Pregunta seleccionable',
                    dificultad: 'media',
                    tema_id: '20',
                    nombre_tema: 'Álgebra',
                    materia_id: '2',
                    materia_nombre: 'Álgebra',
                    puntos: '3',
                    tipo_respuesta: 'desarrollo',
                },
            ]);
            montaje.pregunta.createQueryBuilder.mockReturnValue(preguntas);

            const usos = queryBuilderMock();
            usos.getRawMany.mockResolvedValue([{ pregunta_id: '22', total: '2' }]);
            montaje.examenPregunta.createQueryBuilder.mockReturnValue(usos);
            montaje.tema.find.mockResolvedValue([{ tema_id: 20, nombre_tema: 'Álgebra' }]);

            const resultado = await montaje.servicio.getBanco(5, 7, 2);

            expect(montaje.examen.findOne).toHaveBeenCalledWith({
                where: { examen_id: 5, docente_id: 7 },
            });
            expect(montaje.materia.findOne).toHaveBeenCalledWith({
                where: { materia_id: 2, docente_id: 7 },
            });
            expect(preguntas.where).toHaveBeenCalledWith('materia.docente_id = :docenteId', { docenteId: 7 });
            expect(preguntas.andWhere).toHaveBeenCalledWith('pregunta.activo = true');
            expect(usos.where).toHaveBeenCalledWith('ep.pregunta_id IN (:...ids)', {
                ids: [11, 22],
            });
            expect(usos.andWhere).toHaveBeenCalledWith('ep.examen_id <> :examenId', {
                examenId: 5,
            });
            expect(montaje.tema.find).toHaveBeenCalledWith({
                where: { materia_id: 2 },
                order: { nombre_tema: 'ASC' },
            });
            expect(resultado).toEqual({
                materia_id: 2,
                total_banco: 2,
                preguntas: [
                    {
                        pregunta_id: 22,
                        enunciado: 'Pregunta seleccionable',
                        dificultad: 'media',
                        tipo_respuesta: 'desarrollo',
                        puntos: 3,
                        usada_en: 2,
                        tema: { tema_id: 20, nombre_tema: 'Álgebra' },
                        materia: { materia_id: 2, nombre: 'Álgebra' },
                    },
                ],
                temas: [{ tema_id: 20, nombre_tema: 'Álgebra', disponibles: 1 }],
            });
        });

        it('rechaza evaluaciones ajenas y materias distintas a la de la evaluación', async () => {
            montaje.examen.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(EXAMEN_BORRADOR);

            await expect(montaje.servicio.getBanco(5, 99)).rejects.toBeInstanceOf(NotFoundException);
            await expect(montaje.servicio.getBanco(5, 7, 99)).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
        });
    });

    describe('guardarSeleccion', () => {
        function prepararBloqueoExamen(examen = EXAMEN_BORRADOR, porId = false) {
            let examenIdActual = examen.examen_id;
            const bloqueo = queryBuilderMock();
            bloqueo.where.mockImplementation((_condicion: string, parametros: { examenId: number }) => {
                examenIdActual = parametros.examenId;
                return bloqueo;
            });
            bloqueo.getOne.mockImplementation(async () => (porId ? { ...examen, examen_id: examenIdActual } : examen));
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            return bloqueo;
        }

        function prepararValidacionPreguntas(cantidadValida: number) {
            prepararBloqueoExamen();
            const validacion = queryBuilderMock();
            validacion.getCount.mockResolvedValue(cantidadValida);
            montaje.pregunta.createQueryBuilder.mockReturnValue(validacion);
            return validacion;
        }

        it('guarda varias preguntas en el orden recibido sin modificar los registros originales', async () => {
            const validacion = prepararValidacionPreguntas(3);
            const preguntaIds = [31, 12, 25];

            const resultado = await montaje.servicio.guardarSeleccion(
                5,
                { modo_seleccion: 'manual', pregunta_ids: preguntaIds },
                7,
            );

            expect(montaje.examen.createQueryBuilder).toHaveBeenCalledWith('examen');
            expect(montaje.examen.createQueryBuilder().setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(validacion.where).toHaveBeenCalledWith('pregunta.pregunta_id IN (:...ids)', { ids: preguntaIds });
            expect(validacion.andWhere).toHaveBeenCalledWith('pregunta.activo = true');
            expect(validacion.andWhere).toHaveBeenCalledWith('materia.docente_id = :docenteId', { docenteId: 7 });
            expect(validacion.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', { materiaId: 1 });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenPregunta, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenTema, {
                examen_id: 5,
            });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenPregunta, [
                { examen_id: 5, pregunta_id: 31, orden: 1 },
                { examen_id: 5, pregunta_id: 12, orden: 2 },
                { examen_id: 5, pregunta_id: 25, orden: 3 },
            ]);
            expect(montaje.manager.update).toHaveBeenCalledWith(Examen, { examen_id: 5 }, { modo_seleccion: 'manual' });
            expect(montaje.manager.update).not.toHaveBeenCalledWith(Pregunta, expect.anything(), expect.anything());
            expect(montaje.manager.delete).not.toHaveBeenCalledWith(Pregunta, expect.anything());
            expect(resultado).toEqual({
                modo_seleccion: 'manual',
                pregunta_ids: preguntaIds,
                criterios: [],
                total_preguntas: 3,
            });
        });

        it.each([
            { descripcion: 'inexistentes', preguntaId: 999 },
            { descripcion: 'inactivas', preguntaId: 18 },
            { descripcion: 'de otro docente', preguntaId: 44 },
        ])('rechaza preguntas $descripcion', async ({ preguntaId }) => {
            const validacion = prepararValidacionPreguntas(0);

            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: [preguntaId] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(validacion.where).toHaveBeenCalledWith('pregunta.pregunta_id IN (:...ids)', { ids: [preguntaId] });
            expect(validacion.andWhere).toHaveBeenCalledWith('pregunta.activo = true');
            expect(validacion.andWhere).toHaveBeenCalledWith('materia.docente_id = :docenteId', { docenteId: 7 });
            expect(montaje.manager.delete).not.toHaveBeenCalled();
            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza IDs repetidos antes de escribir la selección', async () => {
            const validacion = prepararValidacionPreguntas(1);
            const preguntaIds = [12, 12];

            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: preguntaIds }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(validacion.where).toHaveBeenCalledWith('pregunta.pregunta_id IN (:...ids)', { ids: preguntaIds });
            expect(montaje.manager.insert).not.toHaveBeenCalled();
            expect(montaje.manager.delete).not.toHaveBeenCalled();
        });

        it('permite asociar la misma pregunta a evaluaciones distintas', async () => {
            prepararValidacionPreguntas(1);
            prepararBloqueoExamen(EXAMEN_BORRADOR, true);

            const relaciones: {
                examen_id: number;
                pregunta_id: number;
                orden: number;
            }[] = [];
            montaje.manager.insert.mockImplementation(
                async (
                    entidad: unknown,
                    filas: {
                        examen_id: number;
                        pregunta_id: number;
                        orden: number;
                    }[],
                ) => {
                    if (entidad === ExamenPregunta) relaciones.push(...filas);
                    return {};
                },
            );

            await montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: [21] }, 7);
            await montaje.servicio.guardarSeleccion(6, { modo_seleccion: 'manual', pregunta_ids: [21] }, 7);

            expect(relaciones).toEqual([
                { examen_id: 5, pregunta_id: 21, orden: 1 },
                { examen_id: 6, pregunta_id: 21, orden: 1 },
            ]);
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenPregunta, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenPregunta, {
                examen_id: 6,
            });
            expect(montaje.manager.delete).not.toHaveBeenCalledWith(Pregunta, expect.anything());
        });

        it('rechaza guardar una selección cuando la evaluación ya no está en borrador', async () => {
            const bloqueo = prepararBloqueoExamen({
                ...EXAMEN_BORRADOR,
                estado: 'publicado',
            });

            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: [21] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
            expect(montaje.manager.delete).not.toHaveBeenCalled();
            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza preguntas de otra materia, aunque pertenezcan al docente', async () => {
            const validacion = prepararValidacionPreguntas(0);

            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: [21] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(validacion.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', { materiaId: 1 });
            expect(montaje.manager.delete).not.toHaveBeenCalled();
        });

        it('guarda criterios aleatorios solo con temas de la materia y cantidades disponibles', async () => {
            prepararBloqueoExamen();
            montaje.tema.find.mockResolvedValue([{ tema_id: 4, materia_id: 1, nombre_tema: 'Álgebra' }]);
            const disponibilidad = queryBuilderMock();
            disponibilidad.getRawMany.mockResolvedValue([{ tema_id: '4', total: '3' }]);
            montaje.pregunta.createQueryBuilder.mockReturnValue(disponibilidad);

            const resultado = await montaje.servicio.guardarSeleccion(
                5,
                {
                    modo_seleccion: 'aleatorio',
                    criterios: [{ tema_id: 4, cantidad: 2 }],
                },
                7,
            );

            expect(montaje.tema.find).toHaveBeenCalledWith({
                where: { tema_id: expect.anything(), materia_id: 1 },
            });
            expect(disponibilidad.where).toHaveBeenCalledWith('pregunta.tema_id IN (:...ids)', { ids: [4] });
            expect(disponibilidad.andWhere).toHaveBeenCalledWith('pregunta.activo = true');
            expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenTema, [
                { examen_id: 5, tema_id: 4, cantidad: 2 },
            ]);
            expect(resultado).toEqual({
                modo_seleccion: 'aleatorio',
                pregunta_ids: [],
                criterios: [{ tema_id: 4, cantidad: 2 }],
                total_preguntas: 2,
            });
        });

        it('rechaza cantidades aleatorias superiores a las preguntas activas disponibles', async () => {
            prepararBloqueoExamen();
            montaje.tema.find.mockResolvedValue([{ tema_id: 4, materia_id: 1, nombre_tema: 'Álgebra' }]);
            const disponibilidad = queryBuilderMock();
            disponibilidad.getRawMany.mockResolvedValue([{ tema_id: '4', total: '1' }]);
            montaje.pregunta.createQueryBuilder.mockReturnValue(disponibilidad);

            await expect(
                montaje.servicio.guardarSeleccion(
                    5,
                    {
                        modo_seleccion: 'aleatorio',
                        criterios: [{ tema_id: 4, cantidad: 2 }],
                    },
                    7,
                ),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.insert).not.toHaveBeenCalled();
            expect(montaje.manager.delete).not.toHaveBeenCalled();
        });

        it('rechaza selecciones manuales y aleatorias vacías', async () => {
            prepararBloqueoExamen();

            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'manual', pregunta_ids: [] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);
            await expect(
                montaje.servicio.guardarSeleccion(5, { modo_seleccion: 'aleatorio', criterios: [] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.delete).not.toHaveBeenCalled();
            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });
    });

    describe('guardarAsignacion', () => {
        it('guarda una selección individual deduplicada dentro de una transacción bloqueada', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }, { paralelo_id: 11 }]);

            const inscripciones = queryBuilderMock();
            inscripciones.getRawMany.mockResolvedValue([{ estudiante_id: '100', paralelo_id: '10' }]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            const resultado = await montaje.servicio.guardarAsignacion(
                5,
                { modo_asignacion: 'estudiantes', estudiante_ids: [100, 100] },
                7,
            );

            expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);

            expect(montaje.manager.update).toHaveBeenCalledWith(
                Examen,
                { examen_id: 5 },
                { modo_asignacion: 'estudiantes' },
            );
            expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
                examen_id: 5,
            });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, [{ paralelo_id: 10, examen_id: 5 }]);
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
                examen_id: 5,
            });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenEstudiante, [
                { examen_id: 5, estudiante_id: 100 },
            ]);

            expect(resultado).toEqual({
                modo_asignacion: 'estudiantes',
                total_estudiantes: 1,
            });
        });

        it('guarda una asignación por paralelos deduplicada y cuenta solo estudiantes activos', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }, { paralelo_id: 11 }]);

            const conteo = queryBuilderMock();
            conteo.getRawOne.mockResolvedValue({ total: '4' });
            montaje.inscripcion.createQueryBuilder.mockReturnValue(conteo);

            const resultado = await montaje.servicio.guardarAsignacion(
                5,
                { modo_asignacion: 'paralelos', paralelo_ids: [10, 10, 11] },
                7,
            );

            expect(conteo.innerJoin).toHaveBeenCalledWith('inscripcion.estudiante', 'estudiante');
            expect(conteo.andWhere).toHaveBeenCalledWith('estudiante.activo = :activo', { activo: true });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, [
                { paralelo_id: 10, examen_id: 5 },
                { paralelo_id: 11, examen_id: 5 },
            ]);
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
                examen_id: 5,
            });
            expect(resultado).toEqual({
                modo_asignacion: 'paralelos',
                total_estudiantes: 4,
            });
        });

        it('rechaza un modo de asignación desconocido antes de abrir la transacción', async () => {
            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'todos', estudiante_ids: [100] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.dataSource.transaction).not.toHaveBeenCalled();
            expect(montaje.examen.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('rechaza una evaluación inexistente o de otro docente', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(null);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'paralelos', paralelo_ids: [10] }, 99),
            ).rejects.toBeInstanceOf(NotFoundException);

            expect(bloqueo.where).toHaveBeenCalledWith('examen.examen_id = :examenId', { examenId: 5 });
            expect(bloqueo.andWhere).toHaveBeenCalledWith('examen.docente_id = :docenteId', { docenteId: 99 });
            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza modificar la asignación de una evaluación publicada', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                estado: 'publicado',
            });
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'paralelos', paralelo_ids: [10] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza paralelos que no pertenecen al docente o al periodo', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'paralelos', paralelo_ids: [10, 99] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza selecciones vacías', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'paralelos', paralelo_ids: [] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'estudiantes', estudiante_ids: [] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('rechaza estudiantes inactivos o fuera del ámbito del docente', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

            const inscripciones = queryBuilderMock();
            // La consulta filtra activos: el estudiante 100 no aparece.
            inscripciones.getRawMany.mockResolvedValue([]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'estudiantes', estudiante_ids: [100] }, 7),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(inscripciones.andWhere).toHaveBeenCalledWith('estudiante.activo = :activo', { activo: true });
            expect(montaje.manager.insert).not.toHaveBeenCalled();
        });

        it('propaga errores de persistencia y revierte la transacción', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

            const conteo = queryBuilderMock();
            conteo.getRawOne.mockResolvedValue({ total: '2' });
            montaje.inscripcion.createQueryBuilder.mockReturnValue(conteo);

            montaje.manager.insert.mockRejectedValueOnce(new Error('fallo de persistencia'));

            await expect(
                montaje.servicio.guardarAsignacion(5, { modo_asignacion: 'paralelos', paralelo_ids: [10] }, 7),
            ).rejects.toThrow('fallo de persistencia');

            expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);
        });
    });

    describe('obtenerAsignacion', () => {
        it('devuelve solo los estudiantes activos y marca los seleccionados', async () => {
            montaje.examen.findOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                modo_asignacion: 'estudiantes',
                materia: { materia_id: 1, nombre: 'Matemática' },
                semestre: { semestre_id: 2, gestion: '2026' },
                paralelos: [{ paralelo_id: 10 }],
                estudiantes: [{ estudiante_id: 100 }],
            });
            montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10, nombre_paralelo: 'A' }]);

            const inscripciones = queryBuilderMock();
            inscripciones.getMany.mockResolvedValue([
                {
                    paralelo_id: 10,
                    estudiante: {
                        estudiante_id: 100,
                        nombre_completo: 'Ana',
                        correo_institucional: 'ana@x',
                    },
                },
                {
                    paralelo_id: 10,
                    estudiante: {
                        estudiante_id: 101,
                        nombre_completo: 'Beto',
                        correo_institucional: 'beto@x',
                    },
                },
            ]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            const resultado = await montaje.servicio.obtenerAsignacion(5, 7);

            expect(montaje.examen.findOne).toHaveBeenCalledWith({
                where: { examen_id: 5, docente_id: 7 },
                relations: {
                    materia: true,
                    semestre: true,
                    paralelos: true,
                    estudiantes: true,
                },
            });
            expect(inscripciones.andWhere).toHaveBeenCalledWith('estudiante.activo = :activo', { activo: true });
            expect(resultado.modo_asignacion).toBe('estudiantes');
            expect(resultado.paralelos).toEqual([
                {
                    paralelo_id: 10,
                    nombre_paralelo: 'A',
                    total_estudiantes: 2,
                    seleccionado: true,
                    estudiantes: [
                        {
                            estudiante_id: 100,
                            nombre_completo: 'Ana',
                            correo_institucional: 'ana@x',
                            seleccionado: true,
                        },
                        {
                            estudiante_id: 101,
                            nombre_completo: 'Beto',
                            correo_institucional: 'beto@x',
                            seleccionado: false,
                        },
                    ],
                },
            ]);
        });

        it('rechaza una evaluación inexistente o de otro docente', async () => {
            montaje.examen.findOne.mockResolvedValue(null);

            await expect(montaje.servicio.obtenerAsignacion(5, 99)).rejects.toBeInstanceOf(NotFoundException);

            expect(montaje.paralelo.find).not.toHaveBeenCalled();
        });

        it('rechaza una evaluación sin materia asociada', async () => {
            montaje.examen.findOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                materia_id: null,
            });

            await expect(montaje.servicio.obtenerAsignacion(5, 7)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('no consulta inscripciones cuando el docente no tiene paralelos', async () => {
            montaje.examen.findOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                materia: { materia_id: 1, nombre: 'Matemática' },
                semestre: { semestre_id: 2, gestion: '2026' },
                paralelos: [],
                estudiantes: [],
            });
            montaje.paralelo.find.mockResolvedValue([]);

            const resultado = await montaje.servicio.obtenerAsignacion(5, 7);

            expect(montaje.inscripcion.createQueryBuilder).not.toHaveBeenCalled();
            expect(resultado.paralelos).toEqual([]);
        });
    });

    describe('publicar', () => {
        function prepararPreguntas(total: number, validas: number) {
            montaje.examenPregunta.count.mockResolvedValue(total);
            const query = queryBuilderMock();
            query.getCount.mockResolvedValue(validas);
            montaje.examenPregunta.createQueryBuilder.mockReturnValue(query);

            return query;
        }

        function examenPublicable() {
            return {
                ...EXAMEN_BORRADOR,
                modo_asignacion: 'paralelos',
                modo_seleccion: 'manual',
                duracion_min: 60,
                disponible_desde: new Date(Date.now() + 60 * 60 * 1000),
                disponible_hasta: new Date(Date.now() + 3 * 60 * 60 * 1000),
                paralelos: [{ paralelo_id: 10 }],
            };
        }

        it('publica bloqueando el examen y condiciona la actualización a borrador', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue(examenPublicable());

            const preguntas = prepararPreguntas(1, 1);

            const inscripciones = queryBuilderMock();
            inscripciones.getMany.mockResolvedValue([
                {
                    estudiante: { estudiante_id: 100, nombre_completo: 'Ana' },
                },
            ]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            const resultado = await montaje.servicio.publicar(5, 7);

            expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(preguntas.innerJoin).toHaveBeenCalledWith('examenPregunta.pregunta', 'pregunta');
            expect(preguntas.andWhere).toHaveBeenCalledWith('pregunta.activo = :activo', { activo: true });
            expect(preguntas.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', { materiaId: 1 });
            expect(preguntas.andWhere).toHaveBeenCalledWith('materia.docente_id = :docenteId', { docenteId: 7 });
            expect(inscripciones.andWhere).toHaveBeenCalledWith('estudiante.activo = :activo', { activo: true });
            expect(montaje.manager.update).toHaveBeenCalledWith(
                Examen,
                { examen_id: 5, estado: 'borrador' },
                { estado: 'publicado' },
            );
            expect(resultado).toEqual({ examen_id: 5, estado: 'publicado' });
        });

        it('no publica si no quedan estudiantes activos asignados', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue(examenPublicable());
            prepararPreguntas(1, 1);

            const inscripciones = queryBuilderMock();
            // El filtro de activos deja la lista vacía (todos inactivos).
            inscripciones.getMany.mockResolvedValue([]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.update).not.toHaveBeenCalled();
        });

        it('impide publicar si no hay preguntas manuales asociadas', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue(examenPublicable());
            montaje.examenPregunta.count.mockResolvedValue(0);

            const inscripciones = queryBuilderMock();
            inscripciones.getMany.mockResolvedValue([
                {
                    estudiante: { estudiante_id: 100, nombre_completo: 'Ana' },
                },
            ]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            const error = await montaje.servicio.publicar(5, 7).catch((razon: unknown) => razon);

            expect(error).toBeInstanceOf(BadRequestException);
            if (!(error instanceof BadRequestException)) {
                throw error instanceof Error
                    ? error
                    : new Error('Se esperaba el rechazo de publicación.');
            }
            expect(error.getResponse()).toMatchObject({
                problemas: expect.arrayContaining([
                    expect.objectContaining({
                        paso: 2,
                        mensaje: 'Agrega al menos una pregunta a la evaluación.',
                    }),
                ]),
            });
            expect(montaje.examenPregunta.createQueryBuilder).not.toHaveBeenCalled();
            expect(montaje.manager.update).not.toHaveBeenCalled();
        });

        it('en modo estudiantes solo considera seleccionados activos', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                modo_asignacion: 'estudiantes',
            });
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue({
                ...examenPublicable(),
                modo_asignacion: 'estudiantes',
                paralelos: [],
            });
            prepararPreguntas(1, 1);

            const seleccionados = queryBuilderMock();
            // El estudiante asignado está inactivo: el filtro lo excluye.
            seleccionados.getMany.mockResolvedValue([]);
            montaje.examenEstudiante.createQueryBuilder.mockReturnValue(seleccionados);

            await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(BadRequestException);

            expect(seleccionados.innerJoinAndSelect).toHaveBeenCalledWith('examenEstudiante.estudiante', 'estudiante');
            expect(seleccionados.andWhere).toHaveBeenCalledWith('estudiante.activo = :activo', { activo: true });
            expect(montaje.manager.update).not.toHaveBeenCalled();
        });

        it('no publica si otra operación ya cambió el estado', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue(examenPublicable());
            prepararPreguntas(1, 1);

            const inscripciones = queryBuilderMock();
            inscripciones.getMany.mockResolvedValue([{ estudiante: { estudiante_id: 100, nombre_completo: 'Ana' } }]);
            montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

            montaje.manager.update.mockResolvedValueOnce({ affected: 0 });

            await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(BadRequestException);
        });

        it.each([
            {
                motivo: 'de otra materia',
                condicion: 'materia.materia_id = :materiaId',
                parametros: { materiaId: 1 },
            },
            {
                motivo: 'inactiva',
                condicion: 'pregunta.activo = :activo',
                parametros: { activo: true },
            },
            {
                motivo: 'a cargo de otro docente',
                condicion: 'materia.docente_id = :docenteId',
                parametros: { docenteId: 7 },
            },
        ])(
            'impide publicar si una pregunta asociada está $motivo',
            async ({ condicion, parametros }) => {
                const bloqueo = queryBuilderMock();
                bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
                montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
                montaje.examen.findOne.mockResolvedValue(examenPublicable());
                const preguntas = prepararPreguntas(2, 1);
                const inscripciones = queryBuilderMock();
                inscripciones.getMany.mockResolvedValue([
                    {
                        estudiante: { estudiante_id: 100, nombre_completo: 'Ana' },
                    },
                ]);
                montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

                const error = await montaje.servicio.publicar(5, 7).catch((razon: unknown) => razon);

                if (!(error instanceof BadRequestException)) {
                    throw error instanceof Error
                        ? error
                        : new Error('Se esperaba el rechazo de publicación.');
                }
                expect(error.getResponse()).toMatchObject({
                    problemas: expect.arrayContaining([
                        expect.objectContaining({
                            paso: 2,
                            mensaje:
                                'Todas las preguntas deben estar activas y pertenecer al docente y a la materia actuales de la evaluación.',
                        }),
                    ]),
                });
                expect(preguntas.andWhere).toHaveBeenCalledWith(condicion, parametros);
                expect(preguntas.andWhere).toHaveBeenCalledWith('materia.materia_id = :materiaId', { materiaId: 1 });
                expect(preguntas.andWhere).toHaveBeenCalledWith('materia.docente_id = :docenteId', { docenteId: 7 });
                expect(montaje.manager.update).not.toHaveBeenCalled();
            },
        );

        it('rechaza una evaluación inexistente o de otro docente', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(null);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            await expect(montaje.servicio.publicar(5, 99)).rejects.toBeInstanceOf(NotFoundException);

            expect(montaje.examen.findOne).not.toHaveBeenCalled();
        });

        it('rechaza publicar una evaluación que ya no está en borrador', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue({
                ...EXAMEN_BORRADOR,
                estado: 'publicado',
            });
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(BadRequestException);

            expect(montaje.manager.update).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        function prepararEdicion(
            overrides: Partial<{
                examen: Record<string, unknown>;
                materiaId: number;
                paraleloId: number;
            }> = {},
        ) {
            const examen = {
                ...EXAMEN_BORRADOR,
                titulo: 'Parcial',
                instrucciones: null,
                modo_seleccion: 'manual',
                paralelos: [{ paralelo_id: 10 }],
                ...overrides.examen,
            };

            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(examen);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
            montaje.examen.findOne.mockResolvedValue(examen);

            const materiaId = overrides.materiaId ?? 1;
            const paraleloId = overrides.paraleloId ?? 10;

            montaje.materia.findOne.mockResolvedValue({
                materia_id: materiaId,
                docente_id: 7,
            });
            montaje.semestre.findOne.mockResolvedValue({
                semestre_id: 2,
                docente_id: 7,
                materias: [{ materia_id: materiaId }],
            });
            montaje.paralelo.findOne.mockResolvedValue({
                paralelo_id: paraleloId,
                docente_id: 7,
                materia_id: materiaId,
                semestre_id: 2,
            });

            jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
                examen_id: 5,
            } as never);

            return { bloqueo };
        }

        it('no reinicia la asignación si solo cambian título o instrucciones', async () => {
            const { bloqueo } = prepararEdicion();

            const resultado = await montaje.servicio.update(
                5,
                { titulo: 'Parcial actualizado', instrucciones: 'Nuevas' },
                7,
            );

            expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(bloqueo.andWhere).toHaveBeenCalledWith('examen.docente_id = :docenteId', { docenteId: 7 });
            expect(montaje.manager.delete).not.toHaveBeenCalled();
            expect(montaje.manager.insert).not.toHaveBeenCalled();
            expect(montaje.manager.update).toHaveBeenCalledTimes(1);
            expect(resultado.criterios_reiniciados).toBe(false);
            expect(resultado.preguntas_reiniciadas).toBe(false);
        });

        it('reinicia la asignación al cambiar la materia y borra los criterios', async () => {
            prepararEdicion({ materiaId: 3 });

            const resultado = await montaje.servicio.update(5, { materia_id: 3 }, 7);

            expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
                examen_id: 5,
            });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, {
                paralelo_id: 10,
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
                examen_id: 5,
            });
            expect(montaje.manager.update).toHaveBeenCalledWith(
                Examen,
                { examen_id: 5 },
                { modo_asignacion: 'paralelos' },
            );
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenPregunta, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenTema, {
                examen_id: 5,
            });
            expect(resultado.criterios_reiniciados).toBe(true);
            expect(resultado.preguntas_reiniciadas).toBe(true);
            expect(montaje.manager.delete).not.toHaveBeenCalledWith(Pregunta, expect.anything());
        });

        it('borra los criterios aleatorios al cambiar la materia, sin modificar preguntas ni relaciones ajenas', async () => {
            prepararEdicion({
                materiaId: 3,
                examen: { modo_seleccion: 'aleatorio' },
            });

            const resultado = await montaje.servicio.update(5, { materia_id: 3 }, 7);

            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenPregunta, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenTema, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).not.toHaveBeenCalledWith(Pregunta, expect.anything());
            expect(resultado.preguntas_reiniciadas).toBe(true);
            expect(resultado.criterios_reiniciados).toBe(true);
        });

        it('reinicia la asignación al elegir un paralelo que no estaba asociado', async () => {
            prepararEdicion({ paraleloId: 11 });

            const resultado = await montaje.servicio.update(5, { paralelo_id: 11 }, 7);

            expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
                examen_id: 5,
            });
            expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, {
                paralelo_id: 11,
                examen_id: 5,
            });
            expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
                examen_id: 5,
            });
            expect(montaje.manager.delete).not.toHaveBeenCalledWith(ExamenTema, {
                examen_id: 5,
            });
            expect(resultado.criterios_reiniciados).toBe(false);
            expect(resultado.preguntas_reiniciadas).toBe(false);
        });

        it('rechaza editar una evaluación publicada dentro de la transacción', async () => {
            const { bloqueo } = prepararEdicion({
                examen: { estado: 'publicado' },
            });

            await expect(montaje.servicio.update(5, { titulo: 'Nuevo' }, 7)).rejects.toBeInstanceOf(
                BadRequestException,
            );

            expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(montaje.manager.update).not.toHaveBeenCalled();
        });

        it('rechaza una evaluación inexistente o de otro docente', async () => {
            const bloqueo = queryBuilderMock();
            bloqueo.getOne.mockResolvedValue(null);
            montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

            await expect(montaje.servicio.update(5, { titulo: 'Nuevo' }, 99)).rejects.toBeInstanceOf(NotFoundException);

            expect(montaje.examen.findOne).not.toHaveBeenCalled();
            expect(montaje.manager.update).not.toHaveBeenCalled();
        });
    });
});
