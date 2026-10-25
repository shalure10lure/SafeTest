import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { Docente } from '../../docente/entity/docente.entity';

// HU-46: solución de referencia propuesta por la IA.
// Solo se usa como referencia cuando revisada_en NO es NULL.
// contenido: variables, modelo, formulas, funcion_objetivo,
//            restricciones, procedimiento, resultado.
@Entity('ia_solucion_referencia')
export class IaSolucionReferencia {
  @PrimaryGeneratedColumn({ name: 'solucion_ref_id' })
  solucion_ref_id: number;

  @Column({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ type: 'jsonb' })
  contenido: unknown;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelo: string | null;

  // 'propuesta' | 'revisada' | 'descartada'
  @Column({ type: 'varchar', length: 15, default: 'propuesta' })
  estado: string;

  @Column({ name: 'revisada_en', type: 'timestamptz', nullable: true })
  revisada_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @ManyToOne(() => Pregunta, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;

  @ManyToOne(() => Docente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;
}
