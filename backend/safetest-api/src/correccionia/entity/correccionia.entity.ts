import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';
import { RespuestaInciso } from '../../respuestainciso/entity/respuestainciso.entity';

export type EstadoCorreccionIa =
  | 'pendiente'
  | 'procesando'
  | 'generada'
  | 'modificada'
  | 'aceptada'
  | 'descartada'
  | 'error'
  | 'reemplazada';

@Check(
  'CHK_correccion_ia_estado',
  `"estado" IN ('pendiente', 'procesando', 'generada', 'modificada', 'aceptada', 'descartada', 'error', 'reemplazada')`,
)
@Check(
  'CHK_correccion_ia_confianza',
  '"confianza" IS NULL OR ("confianza" >= 0 AND "confianza" <= 1)',
)
@Check(
  'CHK_correccion_ia_puntaje_no_negativo',
  '"puntaje_sugerido" IS NULL OR "puntaje_sugerido" >= 0',
)
@Check(
  'CHK_correccion_ia_puntaje_dentro_max',
  '"puntaje_sugerido" IS NULL OR "puntaje_max_inciso" IS NULL OR "puntaje_sugerido" <= "puntaje_max_inciso"',
)
@Check('CHK_correccion_ia_intento', '"intento" >= 1')
@Check('CHK_correccion_ia_version', '"version" >= 1')
@Check('CHK_correccion_ia_reintentos_worker', '"reintentos_worker" >= 0')
@Index(
  'UX_correccion_ia_activa',
  ['estudiante_id', 'examen_id', 'pregunta_id', 'letra'],
  {
    unique: true,
    where: `"estado" IN ('pendiente', 'procesando', 'generada', 'modificada')`,
  },
)
@Index(
  'UX_correccion_ia_intento',
  ['estudiante_id', 'examen_id', 'pregunta_id', 'letra', 'intento'],
  { unique: true },
)
@Index('IX_correccion_ia_examen_estado', ['examen_id', 'estado'])
@Index('IX_correccion_ia_docente_estado', ['docente_id', 'estado'])
@Index('IX_correccion_ia_revisada_por_docente', ['revisada_por_docente_id'])
@Index('IX_correccion_ia_reemplazada_por', ['reemplazada_por_id'])
@Index('IX_correccion_ia_historial', () => ({
  estudiante_id: 1,
  examen_id: 1,
  pregunta_id: 1,
  letra: 1,
  creada_en: -1,
}))
@Index('IX_correccion_ia_lease', ['iniciada_en'], {
  where: `"estado" = 'procesando'`,
})
@Entity('correccion_ia')
export class CorreccionIa {
  @PrimaryGeneratedColumn({
    name: 'propuesta_id',
    type: 'int',
    primaryKeyConstraintName: 'PK_correccion_ia',
  })
  propuesta_id: number;

  @Column({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @Column({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ type: 'varchar' })
  letra: string;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ type: 'varchar', length: 15, default: 'pendiente' })
  estado: EstadoCorreccionIa;

  @Column({
    name: 'puntaje_sugerido',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  puntaje_sugerido: string | null;

  @Column({
    name: 'puntaje_max_inciso',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  puntaje_max_inciso: string | null;

  @Column({ type: 'text', nullable: true })
  valoracion: string | null;

  @Column({ type: 'text', nullable: true })
  explicacion: string | null;

  @Column({ type: 'jsonb', nullable: true })
  errores: unknown | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  confianza: string | null;

  @Column({
    name: 'criterio_fuente',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  criterio_fuente: string | null;

  @Column({
    name: 'criterio_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  criterio_hash: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  proveedor: string | null;

  @Column({ type: 'smallint', default: 1 })
  intento: number;

  // Contador técnico independiente del ordinal de propuesta.
  @Column({ name: 'reintentos_worker', type: 'int', default: 0 })
  reintentos_worker: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamptz' })
  creada_en: Date;

  @Column({ name: 'iniciada_en', type: 'timestamptz', nullable: true })
  iniciada_en: Date | null;

  @Column({ name: 'finalizada_en', type: 'timestamptz', nullable: true })
  finalizada_en: Date | null;

  @UpdateDateColumn({ name: 'actualizada_en', type: 'timestamptz' })
  actualizada_en: Date;

  @Column({ name: 'revisada_en', type: 'timestamptz', nullable: true })
  revisada_en: Date | null;

  @Column({ name: 'revisada_por_docente_id', type: 'int', nullable: true })
  revisada_por_docente_id: number | null;

  @Column({ name: 'reemplazada_por_id', type: 'int', nullable: true })
  reemplazada_por_id: number | null;

  @Column({ name: 'error_codigo', type: 'varchar', length: 40, nullable: true })
  error_codigo: string | null;

  @Column({
    name: 'error_mensaje',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  error_mensaje: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo: string | null;

  @ManyToOne(() => RespuestaInciso, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'estudiante_id',
      referencedColumnName: 'estudiante_id',
      foreignKeyConstraintName: 'FK_correccion_ia_respuesta',
    },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  respuesta: Relation<RespuestaInciso>;

  @ManyToOne(() => Docente, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'docente_id',
    foreignKeyConstraintName: 'FK_correccion_ia_docente',
  })
  docente: Relation<Docente>;

  @ManyToOne(() => Docente, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'revisada_por_docente_id',
    foreignKeyConstraintName: 'FK_correccion_ia_revisor',
  })
  revisadaPor: Relation<Docente | null>;

  @ManyToOne(() => CorreccionIa, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'reemplazada_por_id',
    foreignKeyConstraintName: 'FK_correccion_ia_reemplazo',
  })
  reemplazadaPor: Relation<CorreccionIa | null>;
}
