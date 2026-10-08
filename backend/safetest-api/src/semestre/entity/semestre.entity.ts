import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';

@Entity('semestre')
export class Semestre {
  @PrimaryGeneratedColumn()
  semestre_id: number;

  @Column({ length: 50 })
  gestion: string;

  @Column()
  nro_pruebas: number;

  @OneToMany(
    () => Paralelo,
    (paralelo) => paralelo.semestre,
  )
  paralelos: Paralelo[];
}