import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Entity('pregunta_recurso')
export class PreguntaRecurso {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  recurso: string;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.recursos,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
