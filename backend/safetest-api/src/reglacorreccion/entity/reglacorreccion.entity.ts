import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';
import {
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../../pregunta/entity/dtos/create-pregunta.dto';

// HU-29: regla de corrección configurable por docente y tipo de pregunta.
// Los valores correctos (solución de referencia, tolerancia, rúbrica) siguen
// viviendo en solucion_texto / solucion_inciso. Esta tabla solo almacena la
// configuración de la estrategia de corrección, nunca la respuesta correcta.
const LISTA_TIPOS_RESPUESTA = TIPOS_RESPUESTA.map((tipo) => `'${tipo}'`).join(
  ', ',
);

@Entity('regla_correccion')
@Unique('UQ_regla_correccion_docente_tipo', ['docente_id', 'tipo_respuesta'])
@Check(
  'CHK_regla_correccion_tipo',
  `"tipo_respuesta" IN (${LISTA_TIPOS_RESPUESTA})`,
)
@Check(
  'CHK_regla_correccion_parametros',
  `jsonb_typeof("parametros") = 'object'`,
)
@Index('IDX_regla_correccion_docente_activo', ['docente_id', 'activo'])
export class ReglaCorreccion {
  @PrimaryGeneratedColumn({ name: 'regla_id' })
  regla_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ name: 'tipo_respuesta', type: 'varchar', length: 30 })
  tipo_respuesta: TipoRespuesta;

  // Configuración específica de la estrategia. Debe ser un objeto JSON; el
  // contrato detallado por tipo se validará en la capa de aplicación (T2).
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  parametros: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizado_en: Date;

  @ManyToOne(() => Docente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'docente_id',
    foreignKeyConstraintName: 'FK_regla_correccion_docente',
  })
  docente: Docente;
}
