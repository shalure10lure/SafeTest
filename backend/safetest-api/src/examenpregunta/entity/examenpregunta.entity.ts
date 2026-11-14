import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';

@Check('CHK_examen_pregunta_puntaje_positivo', '"puntaje" IS NULL OR "puntaje" > 0')
@Entity('examen_pregunta')
export class ExamenPregunta {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'pregunta_id', type: 'int' })
  pregunta_id: number;

  @Column({ type: 'int' })
  orden: number;

  // Puntaje propio de la pregunta dentro de esta evaluación. Al agregarla se
  // inicializa con la suma de los `puntaje_max` de sus incisos y luego puede
  // diferir del banco. `NULL` en evaluaciones creadas antes de esta columna.
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  puntaje: string | null;

  @ManyToOne(() => Examen, (examen) => examen.preguntas, {
    nullable: false,
  })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(
    () => Pregunta,
    (pregunta) => pregunta.examenes,
    { nullable: false },
  )
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: Pregunta;
}
