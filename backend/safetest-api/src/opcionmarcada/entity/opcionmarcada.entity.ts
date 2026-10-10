import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { RespuestaInciso } from '../../respuestainciso/entity/respuestainciso.entity';
import { Opcion } from '../../opcion/entity/opcion.entity';

@Entity('opcion_marcada')
export class OpcionMarcada {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @PrimaryColumn({ name: 'nro_opcion', type: 'int' })
  nro_opcion: number;

  @ManyToOne(
    () => RespuestaInciso,
    (respuesta) => respuesta.opcionesMarcadas,
    { nullable: false },
  )
  @JoinColumn([
    { name: 'estudiante_id', referencedColumnName: 'estudiante_id' },
    { name: 'examen_id', referencedColumnName: 'examen_id' },
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
  ])
  respuesta: RespuestaInciso;

  @ManyToOne(() => Opcion, { nullable: false })
  @JoinColumn([
    { name: 'pregunta_id', referencedColumnName: 'pregunta_id' },
    { name: 'letra', referencedColumnName: 'letra' },
    { name: 'nro_opcion', referencedColumnName: 'nro_opcion' },
  ])
  opcion: Opcion;
}
