import {
  Column,
  CreateDateColumn,
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

  // ---------- NUEVO ----------
  // 'facil' | 'media' | 'dificil'
  @Column({ type: 'varchar', length: 10, nullable: true })
  dificultad: string | null;

  // 'manual' | 'ia'
  @Column({ type: 'varchar', length: 10, default: 'manual' })
  origen: string;

  // Baja lógica: no borrar físicamente preguntas usadas en exámenes.
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Fecha de creación; se usa para ordenar y mostrar el banco.
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;
  // ---------- FIN NUEVO ----------

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
