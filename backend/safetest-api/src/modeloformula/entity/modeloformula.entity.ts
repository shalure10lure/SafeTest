import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';

import { Formula } from '../../formula/entity/formula.entity';
import { Modelo } from '../../modelo/entity/modelo.entity';

@Index('IDX_modelo_formula_formula', ['formula_id'])
@Entity('modelo_formula')
export class ModeloFormula {
  @PrimaryColumn({ name: 'modelo_id', type: 'int' })
  modelo_id: number;

  @PrimaryColumn({ name: 'formula_id', type: 'int' })
  formula_id: number;

  @ManyToOne(() => Modelo, (modelo) => modelo.formulas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'modelo_id',
    foreignKeyConstraintName: 'FK_modelo_formula_modelo',
  })
  modelo: Relation<Modelo>;

  @ManyToOne(() => Formula, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'formula_id',
    foreignKeyConstraintName: 'FK_modelo_formula_formula',
  })
  formula: Relation<Formula>;
}
