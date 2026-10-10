import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Entity('paralelo_pregunta')
export class ParaleloPregunta {
  @PrimaryColumn({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @ManyToOne(
    () => Paralelo,
    (paralelo) => paralelo.preguntas,
    { nullable: false },
  )
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.paralelos,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
