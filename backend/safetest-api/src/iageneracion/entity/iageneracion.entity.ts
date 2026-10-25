import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';
import { Materia } from '../../materia/entity/materia.entity';
import { Tema } from '../../tema/entity/tema.entity';
import { IaGeneracionMaterial } from '../../iageneracionmaterial/entity/iageneracionmaterial.entity';
import { IaPropuestaPregunta } from '../../iapropuestapregunta/entity/iapropuestapregunta.entity';

// HU-44: registro de cada solicitud de generación de preguntas.
@Entity('ia_generacion')
export class IaGeneracion {
  @PrimaryGeneratedColumn({ name: 'generacion_id' })
  generacion_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ name: 'materia_id', type: 'int' })
  materia_id: number;

  @Column({ name: 'tema_id', type: 'int', nullable: true })
  tema_id: number | null;

  @Column({ name: 'tipo_respuesta', type: 'varchar', length: 30, nullable: true })
  tipo_respuesta: string | null;

  @Column({ type: 'int', nullable: true })
  cantidad: number | null;

  // 'facil' | 'media' | 'dificil'
  @Column({ type: 'varchar', length: 10, nullable: true })
  dificultad: string | null;

  // Modelo de IA usado (trazabilidad)
  @Column({ type: 'varchar', length: 100, nullable: true })
  modelo: string | null;

  // 'completada' | 'error'
  @Column({ type: 'varchar', length: 15, default: 'completada' })
  estado: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @ManyToOne(() => Docente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Materia, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  @ManyToOne(() => Tema, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tema_id' })
  tema: Tema | null;

  @OneToMany(() => IaGeneracionMaterial, (gm) => gm.generacion)
  materiales: IaGeneracionMaterial[];

  @OneToMany(() => IaPropuestaPregunta, (p) => p.generacion)
  propuestas: IaPropuestaPregunta[];
}
