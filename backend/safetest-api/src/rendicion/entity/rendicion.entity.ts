import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

import { Estudiante } from '../../estudiante/entity/estudiante.entity';
import { Examen } from '../../examen/entity/examen.entity';
import { Paralelo } from '../../paralelo/entity/paralelo.entity';
import { EnvioCalificacion } from '../../enviocalificacion/entity/enviocalificacion.entity';
import { EventoSeguridad } from '../../eventoseguridad/entity/eventoseguridad.entity';

@Entity('rendicion')
export class Rendicion {
  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @Column({ name: 'nota_final', type: 'decimal' })
  nota_final: string;

  @Column({ type: 'varchar' })
  estado: string;

  @ManyToOne(
    () => Estudiante,
    (estudiante) => estudiante.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @ManyToOne(
    () => Examen,
    (examen) => examen.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(
    () => Paralelo,
    (paralelo) => paralelo.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;

  @OneToMany(
    () => EnvioCalificacion,
    (envio) => envio.rendicion,
  )
  enviosCalificacion: EnvioCalificacion[];

  @OneToMany(
    () => EventoSeguridad,
    (evento) => evento.rendicion,
  )
  eventosSeguridad: EventoSeguridad[];
}
