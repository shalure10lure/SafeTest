import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Docente } from '../../docente/entity/docente.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion: string;

  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number | null;

  @ManyToOne(() => Docente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente | null;
}