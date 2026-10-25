import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { IaGeneracion } from '../../iageneracion/entity/iageneracion.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

// HU-44: propuesta de la IA. NO es parte del banco hasta que el docente
// la acepta; al aceptar se crea la Pregunta real y se guarda su id aquí.
@Entity('ia_propuesta_pregunta')
export class IaPropuestaPregunta {
  @PrimaryGeneratedColumn({ name: 'propuesta_id' })
  propuesta_id: number;

  @Column({ name: 'generacion_id', type: 'int' })
  generacion_id: number;

  // enunciado + incisos + opciones + solución sugerida
  @Column({ type: 'jsonb' })
  contenido: unknown;

  // 'pendiente' | 'aceptada' | 'descartada'
  @Column({ type: 'varchar', length: 15, default: 'pendiente' })
  estado: string;

  @Column({ name: 'pregunta_id', type: 'int', nullable: true })
  pregunta_id: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @ManyToOne(() => IaGeneracion, (g) => g.propuestas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'generacion_id' })
  generacion: IaGeneracion;

  @ManyToOne(() => Pregunta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta | null;
}
