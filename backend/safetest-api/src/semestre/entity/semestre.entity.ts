import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { Examen } from '../../examen/entity/examen.entity';
import { Docente } from '../../docente/entity/docente.entity';
import { Materia } from '../../materia/entity/materia.entity';

@Entity('semestre')
@Unique(['docente_id', 'gestion'])
export class Semestre {
  @PrimaryGeneratedColumn({ name: 'semestre_id' })
  semestre_id: number;

  // Nombre del periodo, ej: "2026-II"
  @Column({ type: 'varchar', length: 50 })
  gestion: string;

  @Column({ type: 'int' })
  nro_pruebas: number;

  // nullable en BD para no romper filas existentes; el DTO los exige.
  @Column({ type: 'date', nullable: true })
  fecha_inicio: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_fin: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number;

  @ManyToOne(() => Docente, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  // Materias relacionadas con el periodo
  @ManyToMany(() => Materia)
  @JoinTable({
    name: 'periodo_materia',
    joinColumn: {
      name: 'semestre_id',
      referencedColumnName: 'semestre_id',
    },
    inverseJoinColumn: {
      name: 'materia_id',
      referencedColumnName: 'materia_id',
    },
  })
  materias: Materia[];

  @OneToMany(() => Paralelo, (paralelo) => paralelo.semestre)
  paralelos: Paralelo[];

  @OneToMany(() => Examen, (examen) => examen.semestre)
  examenes: Examen[];
}