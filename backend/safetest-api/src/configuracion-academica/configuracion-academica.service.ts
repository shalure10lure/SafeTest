import {
    BadRequestException,
    ConflictException,
    Injectable,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { Materia } from '../materia/entity/materia.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { ConfigurarPeriodoDto } from './dto/configurar-periodo.dto';
import {
    normalizarMaterias,
    normalizarNombresParalelos,
} from './gestion-academica.utils';

export interface ResultadoConfiguracion {
    periodo: { semestre_id: number; gestion: string };
    materias_creadas: number;
    paralelos_creados: number;
}

/**
 * Asistente "Configurar periodo": crea en UNA sola transacción
 *   1. el periodo,
 *   2. las materias nuevas (si hay),
 *   3. la asociación periodo <-> materias,
 *   4. los paralelos de cada materia.
 *
 * Si algo falla, no se guarda nada: el docente nunca queda con un periodo
 * a medio crear.
 */
@Injectable()
export class ConfiguracionAcademicaService {
    constructor(private readonly dataSource: DataSource) {}

    async configurarPeriodo(
        dto: ConfigurarPeriodoDto,
        docenteId: number,
    ): Promise<ResultadoConfiguracion> {
        const { periodo: datos } = dto;

        if (new Date(datos.fecha_fin) < new Date(datos.fecha_inicio)) {
            throw new BadRequestException(
                'La fecha de fin no puede ser anterior a la fecha de inicio',
            );
        }

        const gestion = datos.gestion.trim();
        const idsExistentes = [...new Set(dto.materia_ids ?? [])];
        const filasNuevas = dto.materias_nuevas ?? [];

        // `manager` es la conexión de la transacción: todo lo que se haga
        // con él se confirma junto o se deshace junto.
        return this.dataSource.transaction(async (manager) => {
            // 1. La gestión no puede repetirse para este docente
            const gestionRepetida = await manager.existsBy(Semestre, {
                gestion,
                docente_id: docenteId,
            });
            if (gestionRepetida) {
                throw new ConflictException('Ya tienes un periodo con esa gestión');
            }

            // 2. Las materias existentes deben ser del docente
            const existentes = idsExistentes.length
                ? await manager.find(Materia, {
                      where: { materia_id: In(idsExistentes), docente_id: docenteId },
                  })
                : [];
            if (existentes.length !== idsExistentes.length) {
                throw new BadRequestException(
                    'Una o más materias no existen o no te pertenecen',
                );
            }

            // 3. Materias nuevas: se validan todas antes de guardar
            const codigosDelDocente = await manager.find(Materia, {
                where: { docente_id: docenteId },
                select: { codigo: true },
            });
            const { materias, errores } = normalizarMaterias(
                filasNuevas,
                codigosDelDocente.map((materia) => materia.codigo),
            );
            if (errores.length > 0) {
                throw new BadRequestException({
                    message: 'Revisa las materias nuevas marcadas en rojo',
                    errores,
                });
            }

            const nuevas = await manager.save(
                materias.map((materia) =>
                    manager.create(Materia, {
                        ...materia,
                        activo: true,
                        docente_id: docenteId,
                    }),
                ),
            );

            // 4. El periodo, con todas sus materias
            const periodo = await manager.save(
                manager.create(Semestre, {
                    gestion,
                    nro_pruebas: datos.nro_pruebas,
                    fecha_inicio: datos.fecha_inicio,
                    fecha_fin: datos.fecha_fin,
                    activo: true,
                    docente_id: docenteId,
                    materias: [...existentes, ...nuevas],
                }),
            );

            // 5. Paralelos de cada materia
            const idsMateriasDelPeriodo = new Set(
                [...existentes, ...nuevas].map((materia) => materia.materia_id),
            );
            // materiaId -> nombres ya agregados (para no repetir entre grupos)
            const nombresPorMateria = new Map<number, Set<string>>();
            const paralelos: Paralelo[] = [];

            for (const grupo of dto.paralelos ?? []) {
                const materiaId = this.resolverMateria(grupo, nuevas);

                if (!idsMateriasDelPeriodo.has(materiaId)) {
                    throw new BadRequestException(
                        'No puedes crear paralelos de una materia que no está en el periodo',
                    );
                }

                const { nombres, errores: erroresNombres } =
                    normalizarNombresParalelos(grupo.nombres);
                if (erroresNombres.length > 0) {
                    throw new BadRequestException(erroresNombres.join('. '));
                }

                const usados = nombresPorMateria.get(materiaId) ?? new Set<string>();
                for (const nombre of nombres) {
                    if (usados.has(nombre.toLowerCase())) {
                        throw new BadRequestException(
                            `El paralelo "${nombre}" está repetido en la misma materia`,
                        );
                    }
                    usados.add(nombre.toLowerCase());

                    paralelos.push(
                        manager.create(Paralelo, {
                            nombre_paralelo: nombre,
                            materia_id: materiaId,
                            semestre_id: periodo.semestre_id,
                            docente_id: docenteId,
                        }),
                    );
                }
                nombresPorMateria.set(materiaId, usados);
            }

            if (paralelos.length > 0) await manager.save(paralelos);

            return {
                periodo: {
                    semestre_id: periodo.semestre_id,
                    gestion: periodo.gestion,
                },
                materias_creadas: nuevas.length,
                paralelos_creados: paralelos.length,
            };
        });
    }

    /** Averigua el id real de la materia a la que pertenece un grupo de paralelos. */
    private resolverMateria(
        grupo: { materia_id?: number; materia_nueva_indice?: number },
        nuevas: Materia[],
    ): number {
        const tieneId = grupo.materia_id !== undefined;
        const tieneIndice = grupo.materia_nueva_indice !== undefined;

        // Debe indicar exactamente una de las dos formas
        if (tieneId === tieneIndice) {
            throw new BadRequestException(
                'Cada grupo de paralelos debe indicar una materia',
            );
        }

        if (tieneId) return grupo.materia_id as number;

        const nueva = nuevas[grupo.materia_nueva_indice as number];
        if (!nueva) {
            throw new BadRequestException(
                'Un grupo de paralelos apunta a una materia nueva que no existe',
            );
        }

        return nueva.materia_id;
    }
}
