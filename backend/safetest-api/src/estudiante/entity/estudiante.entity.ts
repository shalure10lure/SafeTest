import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Inscripcion } from '../../inscripcion/entity/inscripcion.entity';

import { Rendicion } from '../../rendicion/entity/rendicion.entity';
@Entity('estudiante')
export class Estudiante {
  @PrimaryGeneratedColumn()
  estudiante_id: number;

  @Column({ length: 150 })
  nombre_completo: string;

  @Column({ length: 30 })
  celular: string;

  @Column({ length: 150, unique: true })
  correo_institucional: string;

  @Column({
    name: 'password_hash',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  refreshToken: string | null;

  // Un estudiante puede tener varias inscripciones.
  @OneToMany(
    () => Inscripcion,
    (inscripcion) => inscripcion.estudiante,
  )
  inscripciones: Inscripcion[];

  // Un estudiante puede rendir varios exámenes.
  @OneToMany(
    () => Rendicion,
    (rendicion) => rendicion.estudiante,
  )
  rendiciones: Rendicion[];
}