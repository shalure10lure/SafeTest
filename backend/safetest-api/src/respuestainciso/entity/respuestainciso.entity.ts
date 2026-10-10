import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

import { Inciso } from '../../inciso/entity/inciso.entity';
import { AsignacionPregunta } from '../../asignacionpregunta/entity/asignacionpregunta.entity';
import { OpcionMarcada } from '../../opcionmarcada/entity/opcionmarcada.entity';
import { FormulaElegida } from '../../formulaelegida/entity/formulaelegida.entity';

@Entity('respuesta_inciso')
export class RespuestaInciso {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @Column({ type: 'text' })
  respuesta_texto: string;

  @Column({ type: 'decimal' })
  puntaje_obtenido: string;

  @Column({ type: 'varchar' })
  estado_correccion: string;

  @Column({ type: 'text' })
  retroalimentacion: string;

  @ManyToOne(() => Inciso, { nullable: false })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  inciso: Inciso;

  @ManyToOne(() => AsignacionPregunta, { nullable: false })
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
  ])
  asignacion: AsignacionPregunta;

  @OneToMany(
    () => OpcionMarcada,
    (opcionMarcada) => opcionMarcada.respuesta,
  )
  opcionesMarcadas: OpcionMarcada[];

  @OneToMany(
    () => FormulaElegida,
    (formulaElegida) => formulaElegida.respuesta,
  )
  formulasElegidas: FormulaElegida[];
}
