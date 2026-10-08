import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Estudiante } from '../../estudiante/entity/estudiante.entity';
import { Paralelo } from '../../paralelo/entity/paralelo.entity';

@Entity('inscripcion')
export class Inscripcion {
  @PrimaryColumn()
  estudiante_id: number;

  @PrimaryColumn()
  paralelo_id: number;

  @ManyToOne(
    () => Estudiante,
    (estudiante) => estudiante.inscripciones,
  )
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @ManyToOne(
    () => Paralelo,
    (paralelo) => paralelo.inscripciones,
  )
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;
}