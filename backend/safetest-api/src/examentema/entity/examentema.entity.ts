import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { Tema } from '../../tema/entity/tema.entity';

@Entity('examen_tema')
export class ExamenTema {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @Column({ type: 'int' })
  cantidad: number;

  @ManyToOne(() => Examen, (examen) => examen.temas, {
    nullable: false,
  })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(() => Tema, { nullable: false })
  @JoinColumn({ name: 'tema_id' })
  tema: Tema;
}
