import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Rendicion } from '../../rendicion/entity/rendicion.entity';

@Entity('evento_seguridad')
export class EventoSeguridad {
  @PrimaryGeneratedColumn({ name: 'evento_id' })
  evento_id: number;

  @Column({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @Column({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ type: 'varchar' })
  tipo: string;

  @Column({ type: 'timestamp' })
  fecha_hora: Date;

  @ManyToOne(
    () => Rendicion,
    (rendicion) => rendicion.eventosSeguridad,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
  ])
  rendicion: Rendicion;
}