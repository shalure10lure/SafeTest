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
import { Rendicion } from '../../rendicion/entity/rendicion.entity';
import { ParaleloPregunta } from '../../paralelopregunta/entity/paralelopregunta.entity';

@Entity('paralelo')
export class Paralelo {
  @PrimaryGeneratedColumn({ name: 'paralelo_id' })
  paralelo_id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre_paralelo: string;

  @Column({ name: 'materia_id', type: 'int' })
  materia_id: number;

  @Column({ name: 'semestre_id', type: 'int' })
  semestre_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @ManyToOne(
    () => Materia,
    (materia) => materia.paralelos,
    { nullable: false },
  )
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  @ManyToOne(
    () => Semestre,
    (semestre) => semestre.paralelos,
    { nullable: false },
  )
  @JoinColumn({ name: 'semestre_id' })
  semestre: Semestre;

  @ManyToOne(
    () => Docente,
    (docente) => docente.paralelos,
    { nullable: false },
  )
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @OneToMany(
    () => Inscripcion,
    (inscripcion) => inscripcion.paralelo,
  )
  inscripciones: Inscripcion[];

  @OneToMany(
    () => Rendicion,
    (rendicion) => rendicion.paralelo,
  )
  rendiciones: Rendicion[];

  @OneToMany(
    () => ParaleloPregunta,
    (paraleloPregunta) => paraleloPregunta.paralelo,
  )
  preguntas: ParaleloPregunta[];
}