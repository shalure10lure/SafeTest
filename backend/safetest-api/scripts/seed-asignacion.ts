/**
 * Seed de estudiantes e inscripciones para validar el paso 4 (Asignación)
 * y el paso 5 (Resumen y publicación) del asistente "Crear evaluación".
 *
 * Datos de destino (se buscan por sus datos, nunca por IDs fijos):
 *   Docente:  Ana Rivas <a.rivas@univ.edu>
 *   Materia:  Matemáticas I
 *   Periodo:  2027-I
 *   Paralelo: A -> 5 estudiantes
 *   Paralelo: B -> 2 estudiantes (se crea si no existe)
 *
 * Contraseña de todos los estudiantes de prueba: Estudiante123!
 * Se guarda con argon2, el mismo método que AuthService.registerEstudiante.
 *
 * El script es idempotente: busca cada estudiante por su correo y cada
 * inscripción por su clave compuesta antes de insertar. Si se ejecuta dos
 * veces no duplica registros ni modifica estudiantes existentes.
 *
 * Ejecutar: npm run seed:asignacion
 */

import argon2 from 'argon2';

import dataSource from '../src/data-source';
import { Docente } from '../src/docente/entity/docente.entity';
import { Estudiante } from '../src/estudiante/entity/estudiante.entity';
import { Inscripcion } from '../src/inscripcion/entity/inscripcion.entity';
import { Materia } from '../src/materia/entity/materia.entity';
import { Paralelo } from '../src/paralelo/entity/paralelo.entity';
import { Semestre } from '../src/semestre/entity/semestre.entity';

const DOCENTE_CORREO = 'a.rivas@univ.edu';
const MATERIA_NOMBRE = 'Matemáticas I';
const PERIODO_GESTION = '2027-I';
const PARALELO_A = 'A';
const PARALELO_B = 'B';
const PASSWORD_ESTUDIANTES = 'Estudiante123!';

interface DatosEstudiante {
    nombre_completo: string;
    celular: string;
    correo_institucional: string;
}

const ESTUDIANTES_PARALELO_A: DatosEstudiante[] = [
    {
        nombre_completo: 'Carlos Mendoza',
        celular: '71234567',
        correo_institucional: 'carlos.mendoza@univ.edu',
    },
    {
        nombre_completo: 'Lucía Paredes',
        celular: '71234568',
        correo_institucional: 'lucia.paredes@univ.edu',
    },
    {
        nombre_completo: 'Diego Salazar',
        celular: '71234569',
        correo_institucional: 'diego.salazar@univ.edu',
    },
    {
        nombre_completo: 'Valentina Rojas',
        celular: '71234570',
        correo_institucional: 'valentina.rojas@univ.edu',
    },
    {
        nombre_completo: 'Andrés Quispe',
        celular: '71234571',
        correo_institucional: 'andres.quispe@univ.edu',
    },
];

const ESTUDIANTES_PARALELO_B: DatosEstudiante[] = [
    {
        nombre_completo: 'Camila Fernández',
        celular: '71234572',
        correo_institucional: 'camila.fernandez@univ.edu',
    },
    {
        nombre_completo: 'Mateo Gutiérrez',
        celular: '71234573',
        correo_institucional: 'mateo.gutierrez@univ.edu',
    },
];

interface ResultadoSeed {
    docente: string;
    materia: string;
    periodo: string;
    paraleloA: number;
    paraleloB: number;
    paraleloBCreado: boolean;
    estudiantesCreados: string[];
    estudiantesReutilizados: string[];
    inscripcionesCreadas: string[];
    inscripcionesExistentes: string[];
}

async function sembrar(): Promise<ResultadoSeed> {
    return dataSource.transaction(async (manager) => {
        const docente = await manager
            .getRepository(Docente)
            .findOne({ where: { correo: DOCENTE_CORREO } });

        if (!docente) {
            throw new Error(
                `No existe el docente con correo "${DOCENTE_CORREO}".`,
            );
        }

        const materia = await manager.getRepository(Materia).findOne({
            where: {
                nombre: MATERIA_NOMBRE,
                docente_id: docente.docente_id,
            },
        });

        if (!materia) {
            throw new Error(
                `No existe la materia "${MATERIA_NOMBRE}" del docente ${docente.nombre}.`,
            );
        }

        const periodo = await manager.getRepository(Semestre).findOne({
            where: {
                gestion: PERIODO_GESTION,
                docente_id: docente.docente_id,
            },
        });

        if (!periodo) {
            throw new Error(
                `No existe el periodo "${PERIODO_GESTION}" del docente ${docente.nombre}.`,
            );
        }

        const paraleloA = await manager.getRepository(Paralelo).findOne({
            where: {
                nombre_paralelo: PARALELO_A,
                materia_id: materia.materia_id,
                semestre_id: periodo.semestre_id,
                docente_id: docente.docente_id,
            },
        });

        if (!paraleloA) {
            throw new Error(
                `No existe el paralelo "${PARALELO_A}" de "${MATERIA_NOMBRE}" · ${PERIODO_GESTION} para ${docente.nombre}.`,
            );
        }

        let paraleloB = await manager.getRepository(Paralelo).findOne({
            where: {
                nombre_paralelo: PARALELO_B,
                materia_id: materia.materia_id,
                semestre_id: periodo.semestre_id,
                docente_id: docente.docente_id,
            },
        });

        let paraleloBCreado = false;

        if (!paraleloB) {
            const repositorioParalelo = manager.getRepository(Paralelo);

            paraleloB = await repositorioParalelo.save(
                repositorioParalelo.create({
                    nombre_paralelo: PARALELO_B,
                    materia_id: materia.materia_id,
                    semestre_id: periodo.semestre_id,
                    docente_id: docente.docente_id,
                }),
            );

            paraleloBCreado = true;
        }

        const estudiantesCreados: string[] = [];
        const estudiantesReutilizados: string[] = [];
        const inscripcionesCreadas: string[] = [];
        const inscripcionesExistentes: string[] = [];

        const grupos = [
            { paralelo: paraleloA, estudiantes: ESTUDIANTES_PARALELO_A },
            { paralelo: paraleloB, estudiantes: ESTUDIANTES_PARALELO_B },
        ];

        for (const grupo of grupos) {
            for (const datos of grupo.estudiantes) {
                let estudiante = await manager
                    .getRepository(Estudiante)
                    .findOne({
                        where: {
                            correo_institucional:
                                datos.correo_institucional,
                        },
                    });

                if (!estudiante) {
                    const passwordHash = await argon2.hash(
                        PASSWORD_ESTUDIANTES,
                    );

                    estudiante = await manager
                        .getRepository(Estudiante)
                        .save(
                            manager.getRepository(Estudiante).create({
                                ...datos,
                                passwordHash,
                                // Alumnos ya inscritos, como tras aceptar
                                // una invitación en el flujo real.
                                correoVerificado: true,
                            }),
                        );

                    estudiantesCreados.push(datos.correo_institucional);
                } else {
                    estudiantesReutilizados.push(
                        datos.correo_institucional,
                    );
                }

                const inscripcion = await manager
                    .getRepository(Inscripcion)
                    .findOne({
                        where: {
                            estudiante_id: estudiante.estudiante_id,
                            paralelo_id: grupo.paralelo.paralelo_id,
                        },
                    });

                const referencia = `${datos.correo_institucional} -> ${grupo.paralelo.nombre_paralelo}`;

                if (!inscripcion) {
                    await manager.getRepository(Inscripcion).insert({
                        estudiante_id: estudiante.estudiante_id,
                        paralelo_id: grupo.paralelo.paralelo_id,
                    });

                    inscripcionesCreadas.push(referencia);
                } else {
                    inscripcionesExistentes.push(referencia);
                }
            }
        }

        return {
            docente: `${docente.nombre} <${docente.correo}>`,
            materia: `${materia.nombre} (${materia.codigo})`,
            periodo: periodo.gestion,
            paraleloA: paraleloA.paralelo_id,
            paraleloB: paraleloB.paralelo_id,
            paraleloBCreado,
            estudiantesCreados,
            estudiantesReutilizados,
            inscripcionesCreadas,
            inscripcionesExistentes,
        };
    });
}

async function verificarConteos(
    paraleloA: number,
    paraleloB: number,
): Promise<void> {
    const filas = await dataSource
        .getRepository(Inscripcion)
        .createQueryBuilder('inscripcion')
        .innerJoin('inscripcion.paralelo', 'paralelo')
        .innerJoin('inscripcion.estudiante', 'estudiante')
        .select('paralelo.nombre_paralelo', 'paralelo')
        .addSelect('COUNT(*)::int', 'total')
        .addSelect(
            "STRING_AGG(estudiante.nombre_completo, ', ' ORDER BY estudiante.nombre_completo)",
            'nombres',
        )
        .where('paralelo.paralelo_id IN (:...ids)', {
            ids: [paraleloA, paraleloB],
        })
        .groupBy('paralelo.nombre_paralelo')
        .orderBy('paralelo.nombre_paralelo', 'ASC')
        .getRawMany<{ paralelo: string; total: number; nombres: string }>();

    console.log('\nVerificación (consulta a la base de datos):');

    for (const fila of filas) {
        console.log(
            `  Paralelo ${fila.paralelo}: ${fila.total} estudiante(s) — ${fila.nombres}`,
        );
    }
}

async function main(): Promise<void> {
    console.log('Sembrando datos de prueba para el paso 4 y 5...');

    await dataSource.initialize();

    try {
        const resultado = await sembrar();

        console.log('\nResumen del seed:');
        console.log(`  Docente:  ${resultado.docente}`);
        console.log(`  Materia:  ${resultado.materia}`);
        console.log(`  Periodo:  ${resultado.periodo}`);
        console.log(
            `  Paralelo A (id ${resultado.paraleloA}): ${ESTUDIANTES_PARALELO_A.length} estudiantes`,
        );
        console.log(
            `  Paralelo B (id ${resultado.paraleloB}): ${ESTUDIANTES_PARALELO_B.length} estudiantes ${
                resultado.paraleloBCreado ? '[creado]' : '[ya existía]'
            }`,
        );
        console.log(
            `  Estudiantes creados: ${resultado.estudiantesCreados.length}`,
        );
        console.log(
            `  Estudiantes reutilizados: ${resultado.estudiantesReutilizados.length}`,
        );
        console.log(
            `  Inscripciones creadas: ${resultado.inscripcionesCreadas.length}`,
        );
        console.log(
            `  Inscripciones ya existentes: ${resultado.inscripcionesExistentes.length}`,
        );

        if (resultado.estudiantesCreados.length > 0) {
            console.log(
                `  Correos creados: ${resultado.estudiantesCreados.join(', ')}`,
            );
        }

        console.log(
            `\n  Contraseña de los estudiantes de prueba: ${PASSWORD_ESTUDIANTES}`,
        );

        await verificarConteos(resultado.paraleloA, resultado.paraleloB);
    } finally {
        await dataSource.destroy();
    }
}

main().catch((error: unknown) => {
    const mensaje =
        error instanceof Error ? error.message : String(error);

    console.error(`\nError al ejecutar el seed: ${mensaje}`);
    process.exitCode = 1;
});
