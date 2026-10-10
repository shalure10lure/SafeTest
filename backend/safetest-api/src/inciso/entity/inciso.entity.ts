import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { Opcion } from '../../opcion/entity/opcion.entity';
import { SolucionInciso } from '../../solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from '../../solucionopcion/entity/solucionopcion.entity';
import { SolucionTexto } from '../../soluciontexto/entity/soluciontexto.entity';

@Entity('inciso')
export class Inciso {
  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @PrimaryColumn({ type: 'varchar' })
  letra: string;

  @Column({ type: 'text' })
  enunciado_inciso: string;

  @Column({ type: 'varchar' })
  tipo_respuesta: string;

  @Column({ type: 'decimal' })
  puntaje_max: string;

  @ManyToOne(() => Pregunta, (pregunta) => pregunta.incisos, {
    nullable: false,
  })
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;

  @OneToMany(() => Opcion, (opcion) => opcion.inciso)
  opciones: Opcion[];

  @OneToOne(
    () => SolucionInciso,
    (solucion) => solucion.inciso,
  )
  solucion: SolucionInciso;

  @OneToMany(
    () => SolucionOpcion,
    (solucionOpcion) => solucionOpcion.inciso,
  )
  solucionesOpcion: SolucionOpcion[];

  @OneToMany(
    () => SolucionTexto,
    (solucionTexto) => solucionTexto.inciso,
  )
  solucionesTexto: SolucionTexto[];
}
