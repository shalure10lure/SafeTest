import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Modelo } from '../../modelo/entity/modelo.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { RespuestaModelo } from '../../respuestamodelo/entity/respuestamodelo.entity';

@Index('IDX_pregunta_modelo_modelo', ['modelo_id'])
@Entity('pregunta_modelo')
export class PreguntaModelo {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ name: 'modelo_id', type: 'int' })
  modelo_id: number;

  @ManyToOne(() => Pregunta, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'pregunta_id',
    foreignKeyConstraintName: 'FK_pregunta_modelo_pregunta',
  })
  pregunta: Relation<Pregunta>;

  @ManyToOne(() => Modelo, (modelo) => modelo.preguntas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'modelo_id',
    foreignKeyConstraintName: 'FK_pregunta_modelo_modelo',
  })
  modelo: Relation<Modelo>;

  @OneToMany(
    () => RespuestaModelo,
    (respuestaModelo) => respuestaModelo.preguntaModelo,
  )
  respuestas: Relation<RespuestaModelo[]>;
}
