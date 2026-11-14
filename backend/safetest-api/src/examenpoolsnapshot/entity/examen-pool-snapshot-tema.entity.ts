import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

import { ExamenPoolSnapshot } from './examen-pool-snapshot.entity';
import { ExamenTema } from '../../examentema/entity/examentema.entity';
import { ExamenPoolSnapshotPregunta } from './examen-pool-snapshot-pregunta.entity';

@Check(
  'CHK_epst_cantidad_seleccionada',
  '"cantidad_seleccionada" > 0',
)
@Check('CHK_epst_cantidad_candidatas', '"cantidad_candidatas" > 0')
@Check(
  'CHK_epst_cantidad',
  '"cantidad_seleccionada" <= "cantidad_candidatas"',
)
@Check('CHK_epst_puntaje', '"puntaje_maximo_tema" > 0')
@Entity('examen_pool_snapshot_tema')
export class ExamenPoolSnapshotTema {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @Column({ name: 'cantidad_seleccionada', type: 'int' })
  cantidad_seleccionada: number;

  @Column({ name: 'cantidad_candidatas', type: 'int' })
  cantidad_candidatas: number;

  @Column({ name: 'puntaje_maximo_tema', type: 'numeric' })
  puntaje_maximo_tema: string;

  @ManyToOne(
    () => ExamenPoolSnapshot,
    (snapshot) => snapshot.temas,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({
    name: 'examen_id',
    foreignKeyConstraintName: 'FK_epst_snapshot',
  })
  snapshot: ExamenPoolSnapshot;

  @OneToOne(() => ExamenTema, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'examen_id',
      referencedColumnName: 'examen_id',
      foreignKeyConstraintName: 'FK_epst_examen_tema',
    },
    { name: 'tema_id', referencedColumnName: 'tema_id' },
  ])
  examenTema: ExamenTema;

  @OneToMany(
    () => ExamenPoolSnapshotPregunta,
    (preguntaSnapshot) => preguntaSnapshot.temaSnapshot,
  )
  preguntas: ExamenPoolSnapshotPregunta[];
}
