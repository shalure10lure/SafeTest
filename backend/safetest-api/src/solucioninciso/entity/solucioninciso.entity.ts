import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';
import { SolucionFormula } from '../../solucionformula/entity/solucionformula.entity';

@Entity('solucion_inciso')
export class SolucionInciso {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @Column({ type: 'decimal' })
  valor_correcto: string;

  @Column({ type: 'decimal' })
  tolerancia: string;

  @Column({ type: 'text' })
  rubrica: string;

  @OneToOne(() => Inciso, (inciso) => inciso.solucion, {
    nullable: false,
  })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;
}
