import {
  Check,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ModeloFormula } from '../../modeloformula/entity/modeloformula.entity';
import { PreguntaModelo } from '../../preguntamodelo/entity/preguntamodelo.entity';

@Check('CHK_modelo_variables_objeto', `jsonb_typeof("variables") = 'object'`)
@Index('IDX_modelo_activo_nombre', ['activo', 'nombre'])
@Entity('modelo')
export class Modelo {
  @PrimaryGeneratedColumn({ name: 'modelo_id' })
  modelo_id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  variables: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => PreguntaModelo, (preguntaModelo) => preguntaModelo.modelo)
  preguntas: PreguntaModelo[];

  @OneToMany(() => ModeloFormula, (modeloFormula) => modeloFormula.modelo)
  formulas: ModeloFormula[];
}
