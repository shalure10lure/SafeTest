import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { Examen } from '../../examen/entity/examen.entity';

@Entity('paralelo_examen')
export class ParaleloExamen {
  @PrimaryColumn({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @ManyToOne(() => Paralelo, { nullable: false })
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;

  @ManyToOne(
    () => Examen,
    (examen) => examen.paralelos,
    { nullable: false },
  )
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;
}
