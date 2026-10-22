import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';

@Entity('docente')
export class Docente {
  @PrimaryGeneratedColumn()
  docente_id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 150, unique: true })
  correo: string;

    @Column({
      name: 'password_hash',
      type: 'varchar',
      length: 255,
      nullable: true,
      select: false,
    })
    passwordHash: string | null;

    // Identificador único de Google.
    // Se completa únicamente cuando existe una
    // vinculación autorizada con Google.
    @Column({
      name: 'google_sub',
      type: 'varchar',
      length: 255,
      nullable: true,
      select: false,
    })
    googleSub: string | null;


  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  refreshToken: string | null;

  @OneToMany(() => Paralelo, (paralelo) => paralelo.docente)
  paralelos: Paralelo[];
}