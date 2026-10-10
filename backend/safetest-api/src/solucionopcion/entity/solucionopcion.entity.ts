import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';
import { Opcion } from '../../opcion/entity/opcion.entity';

@Entity('solucion_opcion')
export class SolucionOpcion {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ name: 'nro_opcion', type: 'int' })
  nro_opcion: number;

  @ManyToOne(
    () => Inciso,
    (inciso) => inciso.solucionesOpcion,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;

  @ManyToOne(() => Opcion, { nullable: false })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
    { name: 'nro_opcion', referencedColumnName: 'nro_opcion' },
  ])
  opcion: Opcion;
}
