import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { ExamenPoolSnapshotInciso } from './examen-pool-snapshot-inciso.entity';
import { ExamenPoolSnapshotTema } from './examen-pool-snapshot-tema.entity';

@Check('CHK_epsp_puntaje', '"puntaje_maximo_pregunta" > 0')
@Unique('UQ_epsp_examen_pregunta', ['examen_id', 'pregunta_id'])
@Entity('examen_pool_snapshot_pregunta')
export class ExamenPoolSnapshotPregunta {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ name: 'puntaje_maximo_pregunta', type: 'numeric' })
  puntaje_maximo_pregunta: string;

  @ManyToOne(
    () => ExamenPoolSnapshotTema,
    (temaSnapshot) => temaSnapshot.preguntas,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn([
    {
      name: 'examen_id',
      referencedColumnName: 'examen_id',
      foreignKeyConstraintName: 'FK_epsp_tema',
    },
    { name: 'tema_id', referencedColumnName: 'tema_id' },
  ])
  temaSnapshot: ExamenPoolSnapshotTema;

  @ManyToOne(() => Pregunta, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'pregunta_id',
      referencedColumnName: 'pregunta_id',
      foreignKeyConstraintName: 'FK_epsp_pregunta_tema',
    },
    { name: 'tema_id', referencedColumnName: 'tema_id' },
  ])
  pregunta: Pregunta;

  @OneToMany(
    () => ExamenPoolSnapshotInciso,
    (incisoSnapshot) => incisoSnapshot.preguntaSnapshot,
  )
  incisos: ExamenPoolSnapshotInciso[];
}
