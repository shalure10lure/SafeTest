import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Semestre } from '../../semestre/entity/semestre.entity';
import { ExamenTema } from '../../examentema/entity/examentema.entity';
import { ExamenPregunta } from '../../examenpregunta/entity/examenpregunta.entity';
import { ParaleloExamen } from '../../paraleloexamen/entity/paraleloexamen.entity';
import { Rendicion } from '../../rendicion/entity/rendicion.entity';

@Entity('examen')
export class Examen {
  @PrimaryGeneratedColumn({ name: 'examen_id' })
  examen_id: number;

  @Column({ type: 'int' })
  nro_prueba: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar' })
  modo_seleccion: string;

  @Column({ type: 'varchar' })
  modo_entrega_nota: string;

  @Column({ name: 'semestre_id', type: 'int' })
  semestre_id: number;

  @ManyToOne(() => Semestre, (semestre) => semestre.examenes, {
    nullable: false,
  })
  @JoinColumn({ name: 'semestre_id' })
  semestre: Semestre;

  @OneToMany(() => ExamenTema, (examenTema) => examenTema.examen)
  temas: ExamenTema[];

  @OneToMany(
    () => ExamenPregunta,
    (examenPregunta) => examenPregunta.examen,
  )
  preguntas: ExamenPregunta[];

  @OneToMany(
    () => ParaleloExamen,
    (paraleloExamen) => paraleloExamen.examen,
  )
  paralelos: ParaleloExamen[];

  @OneToMany(() => Rendicion, (rendicion) => rendicion.examen)
  rendiciones: Rendicion[];
}
