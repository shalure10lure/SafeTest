import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Estudiante } from '../../estudiante/entity/estudiante.entity';
import { Examen } from '../../examen/entity/examen.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Entity('asignacion_pregunta')
export class AsignacionPregunta {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ type: 'int' })
  orden: number;

  @ManyToOne(() => Estudiante, { nullable: false })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @ManyToOne(() => Examen, { nullable: false })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.asignaciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
