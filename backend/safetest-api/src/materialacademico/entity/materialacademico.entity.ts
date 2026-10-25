import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';
import { Materia } from '../../materia/entity/materia.entity';
import { Tema } from '../../tema/entity/tema.entity';

// RF-19: material académico del docente. El archivo está en MinIO;
// aquí solo se guarda la referencia y el texto extraído para la IA.
@Entity('material_academico')
export class MaterialAcademico {
  @PrimaryGeneratedColumn({ name: 'material_id' })
  material_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ name: 'materia_id', type: 'int' })
  materia_id: number;

  @Column({ name: 'tema_id', type: 'int', nullable: true })
  tema_id: number | null;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombre_archivo: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mime_type: string;

  // bigint llega como string en TypeORM/pg
  @Column({ name: 'tamano_bytes', type: 'bigint' })
  tamano_bytes: string;

  // Ruta del objeto en MinIO
  @Column({ name: 'storage_key', type: 'varchar', length: 300, unique: true })
  storage_key: string;

  @Column({ name: 'texto_extraido', type: 'text', nullable: true })
  texto_extraido: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_subida', type: 'timestamptz' })
  fecha_subida: Date;

  @ManyToOne(() => Docente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Materia, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materia_id' })
  materia: Materia;

  @ManyToOne(() => Tema, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tema_id' })
  tema: Tema | null;
}
