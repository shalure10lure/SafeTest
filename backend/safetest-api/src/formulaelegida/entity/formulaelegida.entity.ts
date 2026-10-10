import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { RespuestaInciso } from '../../respuestainciso/entity/respuestainciso.entity';
import { Formula } from '../../formula/entity/formula.entity';

@Entity('formula_elegida')
export class FormulaElegida {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ name: 'formula_id', type: 'int' })
  formula_id: number;

  @ManyToOne(
    () => RespuestaInciso,
    (respuesta) => respuesta.formulasElegidas,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  respuesta: RespuestaInciso;

  @ManyToOne(
    () => Formula,
    (formula) => formula.elecciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'formula_id' })
  formula: Formula;
}
