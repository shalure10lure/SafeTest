import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Entity('pregunta_competencia')
export class PreguntaCompetencia {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  competencia: string;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.competencias,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
