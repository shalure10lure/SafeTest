import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Materia } from '../../materia/entity/materia.entity';
import { Semestre } from '../../semestre/entity/semestre.entity';
import { Docente } from '../../docente/entity/docente.entity';
import { Inscripcion } from '../../inscripcion/entity/inscripcion.entity';

@Entity('paralelo')
export class Paralelo {
  @PrimaryGeneratedColumn()
  paralelo_id: number;

  @Column({ length: 100 })
  nombre_paralelo: string;

  @Column()
  materia_id: number;

  @Column()
  semestre_id: number;

  @Column()
  docente_id: number;

  @ManyToOne(
    () => Materia,
    (materia) => materia.paralelos,
  )
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  @ManyToOne(
    () => Semestre,
    (semestre) => semestre.paralelos,
  )
  @JoinColumn({ name: 'semestre_id' })
  semestre: Semestre;

  @ManyToOne(
    () => Docente,
    (docente) => docente.paralelos,
  )
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @OneToMany(
    () => Inscripcion,
    (inscripcion) => inscripcion.paralelo,
  )
  inscripciones: Inscripcion[];
}