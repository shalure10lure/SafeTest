import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';
import { AsignacionPregunta } from '../../asignacionpregunta/entity/asignacionpregunta.entity';
import { OpcionMarcada } from '../../opcionmarcada/entity/opcionmarcada.entity';
import { FormulaElegida } from '../../formulaelegida/entity/formulaelegida.entity';

@Entity('respuesta_inciso')
export class RespuestaInciso {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  // CAMBIO: opcional (se puede guardar una respuesta vacía / parcial).
  @Column({ type: 'text', nullable: true })
  respuesta_texto: string | null;

  // RESULTADO OFICIAL (lo fija el sistema o el docente).
  // CAMBIO: opcional hasta que se corrija.
  @Column({ type: 'decimal', nullable: true })
  puntaje_obtenido: string | null;

  // CAMBIO: valor por defecto.
  // 'pendiente' | 'automatica' | 'manual' | 'revisada'
  @Column({ type: 'varchar', default: 'pendiente' })
  estado_correccion: string;

  // CAMBIO: opcional.
  @Column({ type: 'text', nullable: true })
  retroalimentacion: string | null;

  // ---------- NUEVO ----------
  @Column({ name: 'guardado_en', type: 'timestamptz', default: () => 'now()' })
  guardado_en: Date;

  // RESULTADO PROVISIONAL (propuesta de la IA, HU-45).
  // 'sin_propuesta' | 'pendiente' | 'aceptada' | 'modificada' | 'descartada'
  @Column({ name: 'ia_estado', type: 'varchar', length: 15, default: 'sin_propuesta' })
  ia_estado: string;

  @Column({ name: 'ia_puntaje_sugerido', type: 'numeric', precision: 6, scale: 2, nullable: true })
  ia_puntaje_sugerido: string | null;

  @Column({ name: 'ia_valoracion', type: 'text', nullable: true })
  ia_valoracion: string | null;

  @Column({ name: 'ia_explicacion', type: 'text', nullable: true })
  ia_explicacion: string | null;

  @Column({ name: 'ia_errores', type: 'jsonb', nullable: true })
  ia_errores: unknown | null;

  // 0.00 a 1.00
  @Column({ name: 'ia_confianza', type: 'numeric', precision: 3, scale: 2, nullable: true })
  ia_confianza: string | null;

  @Column({ name: 'ia_generado_en', type: 'timestamptz', nullable: true })
  ia_generado_en: Date | null;
  // ---------- FIN NUEVO ----------

  @ManyToOne(() => Inciso, { nullable: false })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;

  @ManyToOne(() => AsignacionPregunta, { nullable: false })
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
  ])
  asignacion: AsignacionPregunta;

  @OneToMany(
    () => OpcionMarcada,
    (opcionMarcada) => opcionMarcada.respuesta,
  )
  opcionesMarcadas: OpcionMarcada[];

  @OneToMany(
    () => FormulaElegida,
    (formulaElegida) => formulaElegida.respuesta,
  )
  formulasElegidas: FormulaElegida[];
}
