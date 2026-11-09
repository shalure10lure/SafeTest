import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';

/** Tipos de contenido especializado que admite una pregunta. */
export const TIPOS_RECURSO = ['imagen', 'tabla', 'formula'] as const;
export type TipoRecurso = (typeof TIPOS_RECURSO)[number];

@Entity('pregunta_recurso')
export class PreguntaRecurso {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  // Imagen: clave del archivo en el almacén. Tabla y fórmula: UUID.
  @PrimaryColumn({ type: 'varchar' })
  recurso: string;

  @Column({ type: 'varchar', length: 10, default: 'imagen' })
  tipo: TipoRecurso;

  // Fórmula: expresión LaTeX. Tabla: JSON. Imagen: sin contenido.
  @Column({ type: 'text', nullable: true })
  contenido: string | null;

  // Solo imágenes.
  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  mime_type: string | null;

  @Column({
    name: 'nombre_original',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  nombre_original: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.recursos,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}