import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tema } from '../../tema/entity/tema.entity';
import { Paralelo } from '../../paralelo/entity/paralelo.entity';

@Entity('materia')
export class Materia {
  @PrimaryGeneratedColumn()
  materia_id: number;

  @Column({ length: 150 })
  nombre: string;

  @OneToMany(() => Tema, (tema) => tema.materia)
  temas: Tema[];

  @OneToMany(() => Paralelo, (paralelo) => paralelo.materia)
  paralelos: Paralelo[];
}