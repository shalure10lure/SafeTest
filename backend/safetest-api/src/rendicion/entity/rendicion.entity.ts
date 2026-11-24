import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

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

  // CAMBIO: opcional (la nota no existe hasta corregir).
  @Column({ name: 'nota_final', type: 'decimal', nullable: true })
  nota_final: string | null;

  // CAMBIO: valor por defecto. 'en_curso' | 'enviada' | 'corregida'
  @Column({ type: 'varchar', default: 'en_curso' })
  estado: string;

  // ---------- NUEVO ----------
  @Column({ name: 'fecha_inicio', type: 'timestamptz', nullable: true })
  fecha_inicio: Date | null;

  @Column({ name: 'fecha_envio', type: 'timestamptz', nullable: true })
  fecha_envio: Date | null;
  // HU-43: bloqueo temporal independiente del estado de entrega.
  @Column({ name: 'bloqueada_seguridad_en', type: 'timestamptz', nullable: true })
  bloqueada_seguridad_en: Date | null;
  // ---------- FIN NUEVO ----------

  @ManyToOne(
    () => Estudiante,
    (estudiante) => estudiante.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Relation<Estudiante>;

  @ManyToOne(
    () => Examen,
    (examen) => examen.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'examen_id' })
  examen: Relation<Examen>;

  @ManyToOne(
    () => Paralelo,
    (paralelo) => paralelo.rendiciones,
    { nullable: false },
  )
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Relation<Paralelo>;

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
