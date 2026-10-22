
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Paralelo } from '../../paralelo/entity/paralelo.entity';

export enum EstadoInvitacion {
  PENDIENTE = 'pendiente',
  ACEPTADA = 'aceptada',
  ERROR = 'error',
}

@Entity('invitacion')
export class Invitacion {
  @PrimaryGeneratedColumn()
  invitacion_id: number;

  @Column({ type: 'int' })
  paralelo_id: number;

  @Column({ type: 'varchar', length: 150 })
  correo_institucional: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EstadoInvitacion.PENDIENTE,
  })
  estado: EstadoInvitacion;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  token_hash: string;

  @Column({ type: 'timestamp with time zone' })
  fecha_expiracion: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  fecha_creacion: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  fecha_envio: Date | null;

  @ManyToOne(() => Paralelo, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;
}
