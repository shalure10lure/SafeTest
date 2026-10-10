import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Rendicion } from '../../rendicion/entity/rendicion.entity';

@Entity('envio_calificacion')
export class EnvioCalificacion {
  @PrimaryGeneratedColumn({ name: 'envio_id' })
  envio_id: number;

  @Column({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @Column({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'varchar' })
  estado: string;

  @ManyToOne(
    () => Rendicion,
    (rendicion) => rendicion.enviosCalificacion,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
  ])
  rendicion: Rendicion;
}
