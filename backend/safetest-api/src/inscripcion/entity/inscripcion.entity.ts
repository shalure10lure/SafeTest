import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Estudiante } from '../../estudiante/entity/estudiante.entity';
import { Paralelo } from '../../paralelo/entity/paralelo.entity';

@Entity('inscripcion')
export class Inscripcion {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @ManyToOne(
    () => Estudiante,
    (estudiante) => estudiante.inscripciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Relation<Estudiante>;

  @ManyToOne(
    () => Paralelo,
    (paralelo) => paralelo.inscripciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Relation<Paralelo>;
}