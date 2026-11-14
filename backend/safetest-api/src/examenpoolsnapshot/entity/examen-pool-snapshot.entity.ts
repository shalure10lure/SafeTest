import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { ExamenPoolSnapshotTema } from './examen-pool-snapshot-tema.entity';

@Check('CHK_examen_pool_snapshot_version', '"version" > 0')
@Check(
  'CHK_examen_pool_snapshot_puntaje',
  '"puntaje_maximo_garantizado" > 0',
)
@Entity('examen_pool_snapshot')
export class ExamenPoolSnapshot {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'numeric' })
  puntaje_maximo_garantizado: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;

  @OneToOne(() => Examen, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'examen_id',
    foreignKeyConstraintName: 'FK_examen_pool_snapshot_examen',
  })
  examen: Examen;

  @OneToMany(
    () => ExamenPoolSnapshotTema,
    (temaSnapshot) => temaSnapshot.snapshot,
  )
  temas: ExamenPoolSnapshotTema[];
}
