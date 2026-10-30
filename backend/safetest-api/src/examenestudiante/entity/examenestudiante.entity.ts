import {
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { Estudiante } from '../../estudiante/entity/estudiante.entity';

// Estudiantes elegidos uno por uno (modo_asignacion = 'estudiantes').
@Entity('examen_estudiante')
export class ExamenEstudiante {
    @PrimaryColumn({ name: 'examen_id', type: 'int' })
    examen_id: number;

    @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
    estudiante_id: number;

    @ManyToOne(
        () => Examen,
        (examen) => examen.estudiantes,
        { nullable: false, onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'examen_id' })
    examen: Examen;

    @ManyToOne(() => Estudiante, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'estudiante_id' })
    estudiante: Estudiante;
}