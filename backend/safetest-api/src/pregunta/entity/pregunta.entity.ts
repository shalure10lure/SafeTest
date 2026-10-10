import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tema } from '../../tema/entity/tema.entity';
import { Inciso } from '../../inciso/entity/inciso.entity';
import { PreguntaRecurso } from '../../preguntarecurso/entity/preguntarecurso.entity';
import { PreguntaCompetencia } from '../../preguntacompetencia/entity/preguntacompetencia.entity';
import { ExamenPregunta } from '../../examenpregunta/entity/examenpregunta.entity';
import { ParaleloPregunta } from '../../paralelopregunta/entity/paralelopregunta.entity';
import { AsignacionPregunta } from '../../asignacionpregunta/entity/asignacionpregunta.entity';

@Entity('pregunta')
export class Pregunta {
  @PrimaryGeneratedColumn({ name: 'pregunta_id' })
  pregunta_id: number;

  @Column({ type: 'text' })
  enunciado: string;

  @Column({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @ManyToOne(() => Tema, (tema) => tema.preguntas, {
    nullable: false,
  })
  @JoinColumn({ name: 'tema_id' })
  tema: Tema;

  @OneToMany(() => Inciso, (inciso) => inciso.pregunta)
  incisos: Inciso[];

  @OneToMany(
    () => PreguntaRecurso,
    (preguntaRecurso) => preguntaRecurso.pregunta,
  )
  recursos: PreguntaRecurso[];

  @OneToMany(
    () => PreguntaCompetencia,
    (preguntaCompetencia) => preguntaCompetencia.pregunta,
  )
  competencias: PreguntaCompetencia[];

  @OneToMany(
    () => ExamenPregunta,
    (examenPregunta) => examenPregunta.pregunta,
  )
  examenes: ExamenPregunta[];

  @OneToMany(
    () => ParaleloPregunta,
    (paraleloPregunta) => paraleloPregunta.pregunta,
  )
  paralelos: ParaleloPregunta[];

  @OneToMany(
    () => AsignacionPregunta,
    (asignacion) => asignacion.pregunta,
  )
  asignaciones: AsignacionPregunta[];
}