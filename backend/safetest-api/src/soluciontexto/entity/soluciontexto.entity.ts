import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';

@Entity('solucion_texto')
export class SolucionTexto {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ type: 'varchar' })
  respuesta_aceptada: string;

  @ManyToOne(
    () => Inciso,
    (inciso) => inciso.solucionesTexto,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;
}
