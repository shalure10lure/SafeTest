import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tema } from '../../tema/entity/tema.entity';
import { SolucionFormula } from '../../solucionformula/entity/solucionformula.entity';
import { FormulaElegida } from '../../formulaelegida/entity/formulaelegida.entity';

@Entity('formula')
export class Formula {
  @PrimaryGeneratedColumn({ name: 'formula_id' })
  formula_id: number;

  @Column({ type: 'varchar' })
  expresion: string;

  @Column({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @ManyToOne(() => Tema, (tema) => tema.formulas, {
    nullable: false,
  })
  @JoinColumn({ name: 'tema_id' })
  tema: Tema;

  @OneToMany(
    () => SolucionFormula,
    (solucionFormula) => solucionFormula.formula,
  )
  soluciones: SolucionFormula[];

  @OneToMany(
    () => FormulaElegida,
    (formulaElegida) => formulaElegida.formula,
  )
  elecciones: FormulaElegida[];
}
