import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';

@Entity('opcion')
export class Opcion {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ type: 'int' })
  nro_opcion: number;

  @Column({ type: 'varchar' })
  texto_opcion: string;

  @ManyToOne(() => Inciso, (inciso) => inciso.opciones, {
    nullable: false,
  })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Relation<Inciso>;
}
