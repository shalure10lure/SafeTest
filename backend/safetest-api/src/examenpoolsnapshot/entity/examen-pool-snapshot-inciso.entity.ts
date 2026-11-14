import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';
import { ExamenPoolSnapshotPregunta } from './examen-pool-snapshot-pregunta.entity';

@Check('CHK_epsi_puntaje', '"puntaje_max" > 0')
@Entity('examen_pool_snapshot_inciso')
export class ExamenPoolSnapshotInciso {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @Column({ type: 'numeric' })
  puntaje_max: string;

  @ManyToOne(
    () => ExamenPoolSnapshotPregunta,
    (preguntaSnapshot) => preguntaSnapshot.incisos,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn([
    {
      name: 'examen_id',
      referencedColumnName: 'examen_id',
      foreignKeyConstraintName: 'FK_epsi_pregunta_snapshot',
    },
    { name: 'tema_id', referencedColumnName: 'tema_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
  ])
  preguntaSnapshot: ExamenPoolSnapshotPregunta;

  @ManyToOne(() => Inciso, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'pregunta_id',
      referencedColumnName: 'pregunta_id',
      foreignKeyConstraintName: 'FK_epsi_inciso',
    },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;
}
