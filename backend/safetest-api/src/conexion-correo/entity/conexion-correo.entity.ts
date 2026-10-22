
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';

@Entity('conexion_correo')
export class ConexionCorreo {
  @PrimaryGeneratedColumn({
    name: 'conexion_correo_id',
  })
  conexionCorreoId: number;

  @Column({
    name: 'docente_id',
    type: 'int',
    unique: true,
  })
  docenteId: number;

  @OneToOne(() => Docente, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'google',
  })
  proveedor: string;

  @Column({
    name: 'google_sub',
    type: 'varchar',
    length: 255,
  })
  googleSub: string;

  @Column({
    name: 'correo_autorizado',
    type: 'varchar',
    length: 150,
  })
  correoAutorizado: string;

  @Column({
    name: 'refresh_token_cifrado',
    type: 'text',
    select: false,
  })
  refreshTokenCifrado: string;

  @Column({
    type: 'varchar',
    length: 25,
    default: 'conectada',
  })
  estado: 'conectada' | 'requiere_reconexion';

  @CreateDateColumn({
    name: 'fecha_conexion',
    type: 'timestamptz',
  })
  fechaConexion: Date;

  @UpdateDateColumn({
    name: 'fecha_actualizacion',
    type: 'timestamptz',
  })
  fechaActualizacion: Date;
}
