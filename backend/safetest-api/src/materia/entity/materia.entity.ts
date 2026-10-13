import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Tema } from '../../tema/entity/tema.entity';
import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { Docente } from '../../docente/entity/docente.entity';

@Entity('materia')
@Unique(['docente_id', 'codigo'])
export class Materia {
  @PrimaryGeneratedColumn()
  materia_id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20 })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Dueño de la materia (ámbito académico).
  // nullable: true para que synchronize no falle si ya tienes filas.
  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number;

  @ManyToOne(() => Docente, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @OneToMany(() => Tema, (tema) => tema.materia)
  temas: Tema[];

  @OneToMany(() => Paralelo, (paralelo) => paralelo.materia)
  paralelos: Paralelo[];
}