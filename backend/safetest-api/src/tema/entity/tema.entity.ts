import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Materia } from '../../materia/entity/materia.entity';

@Entity('tema')
export class Tema {
  @PrimaryGeneratedColumn()
  tema_id: number;

  @Column({ length: 150 })
  nombre_tema: string;

  @Column()
  materia_id: number;

  @ManyToOne(
    () => Materia,
    (materia) => materia.temas,
  )
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;
}