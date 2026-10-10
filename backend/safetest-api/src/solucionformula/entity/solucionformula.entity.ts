import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { SolucionInciso } from '../../solucioninciso/entity/solucioninciso.entity';
import { Formula } from '../../formula/entity/formula.entity';

@Entity('solucion_formula')
export class SolucionFormula {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ name: 'formula_id', type: 'int' })
  formula_id: number;

  @ManyToOne(
    () => SolucionInciso,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  solucionInciso: SolucionInciso;

  @ManyToOne(
    () => Formula,
    (formula) => formula.soluciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'formula_id' })
  formula: Formula;
}
