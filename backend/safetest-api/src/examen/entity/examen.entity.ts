import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Semestre } from '../../semestre/entity/semestre.entity';
import { Docente } from '../../docente/entity/docente.entity';
import { Materia } from '../../materia/entity/materia.entity';
import { ExamenTema } from '../../examentema/entity/examentema.entity';
import { ExamenPregunta } from '../../examenpregunta/entity/examenpregunta.entity';
import { ExamenEstudiante } from '../../examenestudiante/entity/examenestudiante.entity';
import { ParaleloExamen } from '../../paraleloexamen/entity/paraleloexamen.entity';
import { Rendicion } from '../../rendicion/entity/rendicion.entity';

@Entity('examen')
export class Examen {
  @PrimaryGeneratedColumn({ name: 'examen_id' })
  examen_id: number;

  // CAMBIO: ahora opcional (un borrador aún no tiene número ni fecha).
  @Column({ type: 'int', nullable: true })
  nro_prueba: number | null;

  // CAMBIO: ahora opcional.
  @Column({ type: 'date', nullable: true })
  fecha: string | null;

  // CAMBIO: valor por defecto. Valores: 'manual' | 'aleatorio'
  @Column({ type: 'varchar', default: 'manual' })
  modo_seleccion: string;

  // CAMBIO: valor por defecto. Valores: 'al_publicar' | 'inmediata'
  @Column({ type: 'varchar', default: 'al_publicar' })
  modo_entrega_nota: string;

  @Column({ name: 'semestre_id', type: 'int' })
  semestre_id: number;

  // ---------- NUEVO ----------
  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number | null;

  @Column({ name: 'materia_id', type: 'int', nullable: true })
  materia_id: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  titulo: string | null;

  @Column({ type: 'text', nullable: true })
  instrucciones: string | null;

  @Column({ name: 'duracion_min', type: 'int', nullable: true })
  duracion_min: number | null;

  @Column({ name: 'disponible_desde', type: 'timestamptz', nullable: true })
  disponible_desde: Date | null;

  @Column({ name: 'disponible_hasta', type: 'timestamptz', nullable: true })
  disponible_hasta: Date | null;

  // 'borrador' | 'publicado'
  @Column({ type: 'varchar', length: 20, default: 'borrador' })
  estado: string;

  // 'definido' | 'aleatorio'
  @Column({ name: 'orden_preguntas', type: 'varchar', length: 20, default: 'definido' })
  orden_preguntas: string;

  // 'enviar_automatico' | 'bloquear'
  @Column({ name: 'al_terminar_tiempo', type: 'varchar', length: 20, default: 'enviar_automatico' })
  al_terminar_tiempo: string;

  // NULL = resultados aún no publicados (HU-32)
  @Column({ name: 'resultados_publicados_en', type: 'timestamptz', nullable: true })
  resultados_publicados_en: Date | null;

  @Column({ name: 'enviar_resultados_correo', type: 'boolean', default: false })
  enviar_resultados_correo: boolean;

  // 'paralelos' (paralelos completos) | 'estudiantes' (estudiantes específicos)
  @Column({ name: 'modo_asignacion', type: 'varchar', length: 20, default: 'paralelos' })
  modo_asignacion: string;

  @ManyToOne(() => Docente, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente | null;

  @ManyToOne(() => Materia, { nullable: true })
  @JoinColumn({ name: 'materia_id' })
  materia: Materia | null;
  // ---------- FIN NUEVO ----------

  @ManyToOne(() => Semestre, (semestre) => semestre.examenes, {
    nullable: false,
  })
  @JoinColumn({ name: 'semestre_id' })
  semestre: Semestre;

  @OneToMany(() => ExamenTema, (examenTema) => examenTema.examen)
  temas: ExamenTema[];

  @OneToMany(
    () => ExamenPregunta,
    (examenPregunta) => examenPregunta.examen,
  )
  preguntas: ExamenPregunta[];

  @OneToMany(
    () => ParaleloExamen,
    (paraleloExamen) => paraleloExamen.examen,
  )
  paralelos: ParaleloExamen[];

  @OneToMany(
    () => ExamenEstudiante,
    (examenEstudiante) => examenEstudiante.examen,
  )
  estudiantes: ExamenEstudiante[];

  @OneToMany(() => Rendicion, (rendicion) => rendicion.examen)
  rendiciones: Rendicion[];
}