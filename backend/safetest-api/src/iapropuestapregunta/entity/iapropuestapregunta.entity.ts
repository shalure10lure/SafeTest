import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { IaGeneracion } from '../../iageneracion/entity/iageneracion.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

// HU-44: propuesta de la IA. Aceptarla solo cambia su estado; la inserción
// definitiva en el banco queda a cargo del flujo T12.
@Entity('ia_propuesta_pregunta')
@Index('IDX_ia_propuesta_generacion', ['generacion_id'])
// Una pregunta del banco solo puede provenir de una propuesta aceptada.
@Index('UQ_ia_propuesta_pregunta_pregunta', ['pregunta_id'], {
  unique: true,
  where: '"pregunta_id" IS NOT NULL',
})
export class IaPropuestaPregunta {
  @PrimaryGeneratedColumn({ name: 'propuesta_id' })
  propuesta_id: number;

  @Column({ name: 'generacion_id', type: 'int' })
  generacion_id: number;

  // Contrato según el tipo de pregunta:
  // - opcion_unica / opcion_multiple: enunciado, dificultad, puntaje_max,
  //   opciones[] y explicacion opcional.
  // - verdadero_falso: igual, con exactamente las opciones Verdadero y Falso.
  // - numerica: enunciado, dificultad, puntaje_max, valor_correcto,
  //   tolerancia y explicacion opcional.
  // - desarrollo: enunciado, dificultad, puntaje_max, solucion_referencia
  //   y explicacion opcional.
  // La validación detallada vive en los DTOs del módulo de IA.
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
