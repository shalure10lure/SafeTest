import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Entity('examen_pregunta')
export class ExamenPregunta {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ type: 'int' })
  orden: number;

  @ManyToOne(() => Examen, (examen) => examen.preguntas, {
    nullable: false,
  })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.examenes,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
