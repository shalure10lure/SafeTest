import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Materia } from '../../materia/entity/materia.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { Formula } from '../../formula/entity/formula.entity';

@Entity('tema')
export class Tema {
  @PrimaryGeneratedColumn({ name: 'tema_id' })
  tema_id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre_tema: string;

  @Column({ name: 'materia_id', type: 'int' })
  materia_id: number;

  @ManyToOne(() => Materia, (materia) => materia.temas, {
    nullable: false,
  })
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  // Un tema puede contener varias preguntas.
  @OneToMany(() => Pregunta, (pregunta) => pregunta.tema)
  preguntas: Pregunta[];

  // Un tema puede asociarse con varias fórmulas.
  @OneToMany(() => Formula, (formula) => formula.tema)
  formulas: Formula[];
}