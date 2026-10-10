import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { Examen } from '../../examen/entity/examen.entity';

@Entity('semestre')
export class Semestre {
  @PrimaryGeneratedColumn({ name: 'semestre_id' })
  semestre_id: number;

  @Column({ type: 'varchar', length: 50 })
  gestion: string;

  @Column({ type: 'int' })
  nro_pruebas: number;

  @OneToMany(
    () => Paralelo,
    (paralelo) => paralelo.semestre,
  )
  paralelos: Paralelo[];

  @OneToMany(
    () => Examen,
    (examen) => examen.semestre,
  )
  examenes: Examen[];
}