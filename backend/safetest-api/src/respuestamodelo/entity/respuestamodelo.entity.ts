import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { RespuestaInciso } from '../../respuestainciso/entity/respuestainciso.entity';
import { PreguntaModelo } from '../../preguntamodelo/entity/preguntamodelo.entity';

@Check(
  'CHK_respuesta_modelo_valores_objeto',
  `jsonb_typeof("valores") = 'object'`,
)
@Index('IDX_respuesta_modelo_modelo', ['modelo_id'])
@Entity('respuesta_modelo')
export class RespuestaModelo {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @Column({ name: 'modelo_id', type: 'int' })
  modelo_id: number;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  valores: Record<string, unknown>;

  @Column({ name: 'resultado_final', type: 'text', nullable: true })
  resultado_final: string | null;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizado_en: Date;

  @OneToOne(() => RespuestaInciso, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    {
      name: 'estudiante_id',
      referencedColumnName: 'estudiante_id',
      foreignKeyConstraintName: 'FK_respuesta_modelo_respuesta_inciso',
    },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  respuestaInciso: Relation<RespuestaInciso>;

  @ManyToOne(
    () => PreguntaModelo,
    (preguntaModelo) => preguntaModelo.respuestas,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn([
    {
      name: 'pregunta_id',
      referencedColumnName: 'pregunta_id',
      foreignKeyConstraintName: 'FK_respuesta_modelo_pregunta_modelo',
    },
    { name: 'modelo_id', referencedColumnName: 'modelo_id' },
  ])
  preguntaModelo: Relation<PreguntaModelo>;
}
