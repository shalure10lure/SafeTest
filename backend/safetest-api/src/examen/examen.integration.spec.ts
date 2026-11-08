import 'reflect-metadata';

import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  Column,
  DataSource,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Prueba de integración real de HU-19.
 *
 * Solo se ejecuta si existe `TEST_DATABASE_URL`. Esa URL debe apuntar a una
 * base desechable cuyo nombre contenga `_test` y no al puerto de desarrollo
 * (`5433`). Las entidades son espejos mínimos de las tablas que usa
 * `ExamenService`; el esquema se crea únicamente en esa base temporal.
 *
 * No usa `.env`, no toca `safetest` y no ejecuta migraciones del proyecto.
 */

const URL_PRUEBA = process.env.TEST_DATABASE_URL?.trim();

const PUERTO_DE_DESARROLLO = '5433';
const NOMBRE_DE_BD_DE_DESARROLLO = 'safetest';

function validarUrlDePrueba(url: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Las pruebas de integración no se ejecutan en producción.');
  }

  const parsed = new URL(url);

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('TEST_DATABASE_URL debe ser una URL de PostgreSQL.');
  }

  if (parsed.port === PUERTO_DE_DESARROLLO) {
    throw new Error(
      'TEST_DATABASE_URL apunta al puerto de la base de desarrollo (5433).',
    );
  }

  const nombreBd = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

  if (!nombreBd.includes('_test')) {
    throw new Error(
      'La base de TEST_DATABASE_URL debe ser desechable y contener "_test" en el nombre.',
    );
  }

  if (nombreBd === NOMBRE_DE_BD_DE_DESARROLLO) {
    throw new Error('TEST_DATABASE_URL apunta a la base de desarrollo.');
  }
}

@Entity('examen')
class Examen {
  @PrimaryGeneratedColumn({ name: 'examen_id' })
  examen_id: number;

  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number | null;

  @Column({ name: 'materia_id', type: 'int', nullable: true })
  materia_id: number | null;

  @Column({ name: 'semestre_id', type: 'int' })
  semestre_id: number;

  @Column({ type: 'varchar', length: 20, default: 'borrador' })
  estado: string;

  @Column({ name: 'modo_asignacion', type: 'varchar', length: 20, default: 'paralelos' })
  modo_asignacion: string;

  @Column({ name: 'modo_seleccion', type: 'varchar', default: 'manual' })
  modo_seleccion: string;

  @Column({ name: 'duracion_min', type: 'int', nullable: true })
  duracion_min: number | null;

  @Column({ name: 'disponible_desde', type: 'timestamptz', nullable: true })
  disponible_desde: Date | null;

  @Column({ name: 'disponible_hasta', type: 'timestamptz', nullable: true })
  disponible_hasta: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  titulo: string | null;

  @Column({ type: 'text', nullable: true })
  instrucciones: string | null;

  @Column({ name: 'orden_preguntas', type: 'varchar', default: 'definido' })
  orden_preguntas: string;

  @Column({ name: 'al_terminar_tiempo', type: 'varchar', default: 'enviar_automatico' })
  al_terminar_tiempo: string;

  @Column({ name: 'modo_entrega_nota', type: 'varchar', default: 'al_publicar' })
  modo_entrega_nota: string;

  @Column({ name: 'resultados_publicados_en', type: 'timestamptz', nullable: true })
  resultados_publicados_en: Date | null;

  @OneToMany(() => ParaleloExamen, (paraleloExamen) => paraleloExamen.examen)
  paralelos: ParaleloExamen[];

  @OneToMany(() => ExamenEstudiante, (examenEstudiante) => examenEstudiante.examen)
  estudiantes: ExamenEstudiante[];
}

@Entity('paralelo')
class Paralelo {
  @PrimaryGeneratedColumn({ name: 'paralelo_id' })
  paralelo_id: number;

  @Column({ name: 'docente_id', type: 'int' })
  docente_id: number;

  @Column({ name: 'materia_id', type: 'int' })
  materia_id: number;

  @Column({ name: 'semestre_id', type: 'int' })
  semestre_id: number;

  @Column({ name: 'nombre_paralelo', type: 'varchar' })
  nombre_paralelo: string;
}

@Entity('estudiante')
class Estudiante {
  @PrimaryGeneratedColumn({ name: 'estudiante_id' })
  estudiante_id: number;

  @Column({ name: 'nombre_completo', type: 'varchar' })
  nombre_completo: string;

  @Column({ name: 'correo_institucional', type: 'varchar', unique: true })
  correo_institucional: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}

@Entity('inscripcion')
class Inscripcion {
  @PrimaryGeneratedColumn({ name: 'inscripcion_id' })
  inscripcion_id: number;

  @Column({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @Column({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @ManyToOne(() => Estudiante, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;
}

@Entity('paralelo_examen')
class ParaleloExamen {
  @PrimaryColumn({ name: 'paralelo_id', type: 'int' })
  paralelo_id: number;

  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @ManyToOne(() => Paralelo, { nullable: false })
  @JoinColumn({ name: 'paralelo_id' })
  paralelo: Paralelo;

  @ManyToOne(() => Examen, (examen) => examen.paralelos, { nullable: false })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;
}

@Entity('examen_estudiante')
class ExamenEstudiante {
  @PrimaryColumn({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @PrimaryColumn({ name: 'estudiante_id', type: 'int' })
  estudiante_id: number;

  @ManyToOne(() => Examen, (examen) => examen.estudiantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examen_id' })
  examen: Examen;

  @ManyToOne(() => Estudiante, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;
}

@Entity('examen_pregunta')
class ExamenPregunta {
  @PrimaryGeneratedColumn({ name: 'examen_pregunta_id' })
  examen_pregunta_id: number;

  @Column({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ name: 'pregunta_id', type: 'int', nullable: true })
  pregunta_id: number | null;
}

@Entity('materia')
class Materia {
  @PrimaryGeneratedColumn({ name: 'materia_id' })
  materia_id: number;

  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number | null;

  @Column({ type: 'varchar', nullable: true })
  nombre: string | null;
}

@Entity('semestre')
class Semestre {
  @PrimaryGeneratedColumn({ name: 'semestre_id' })
  semestre_id: number;

  @Column({ name: 'docente_id', type: 'int', nullable: true })
  docente_id: number | null;

  @Column({ type: 'varchar', nullable: true })
  gestion: string | null;
}

@Entity('pregunta')
class Pregunta {
  @PrimaryGeneratedColumn({ name: 'pregunta_id' })
  pregunta_id: number;
}

@Entity('tema')
class Tema {
  @PrimaryGeneratedColumn({ name: 'tema_id' })
  tema_id: number;
}

@Entity('examen_tema')
class ExamenTema {
  @PrimaryGeneratedColumn({ name: 'examen_tema_id' })
  examen_tema_id: number;

  @Column({ name: 'examen_id', type: 'int' })
  examen_id: number;

  @Column({ name: 'tema_id', type: 'int' })
  tema_id: number;

  @Column({ type: 'int' })
  cantidad: number;
}

const ENTIDADES = [
  Examen,
  Paralelo,
  Estudiante,
  Inscripcion,
  ParaleloExamen,
  ExamenEstudiante,
  ExamenPregunta,
  Materia,
  Semestre,
  Pregunta,
  Tema,
  ExamenTema,
];

let ExamenService: typeof import('./examen.service').ExamenService;

const describir = URL_PRUEBA ? describe : describe.skip;

describir('HU-19 — integración real con PostgreSQL', () => {
  let setup: DataSource;
  let conexionA: DataSource;
  let conexionB: DataSource;
  let servicioA: InstanceType<typeof ExamenService>;
  let servicioB: InstanceType<typeof ExamenService>;

  const creadoEn = new Date(Date.now() + 60 * 60 * 1000);
  const expiraEn = new Date(Date.now() + 3 * 60 * 60 * 1000);

  beforeAll(async () => {
    validarUrlDePrueba(URL_PRUEBA!);

    jest.unstable_mockModule('./entity/examen.entity', () => ({ Examen }));
    jest.unstable_mockModule('../estudiante/entity/estudiante.entity', () => ({
      Estudiante,
    }));
    jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
      Materia,
    }));
    jest.unstable_mockModule('../semestre/entity/semestre.entity', () => ({
      Semestre,
    }));
    jest.unstable_mockModule('../paralelo/entity/paralelo.entity', () => ({
      Paralelo,
    }));
    jest.unstable_mockModule(
      '../paraleloexamen/entity/paraleloexamen.entity',
      () => ({ ParaleloExamen }),
    );
    jest.unstable_mockModule('../inscripcion/entity/inscripcion.entity', () => ({
      Inscripcion,
    }));
    jest.unstable_mockModule(
      '../examenpregunta/entity/examenpregunta.entity',
      () => ({ ExamenPregunta }),
    );
    jest.unstable_mockModule(
      '../examentema/entity/examentema.entity',
      () => ({ ExamenTema }),
    );
    jest.unstable_mockModule(
      '../examenestudiante/entity/examenestudiante.entity',
      () => ({ ExamenEstudiante }),
    );
    jest.unstable_mockModule('../pregunta/entity/pregunta.entity', () => ({
      Pregunta,
    }));
    jest.unstable_mockModule('../tema/entity/tema.entity', () => ({ Tema }));

    ({ ExamenService } = await import('./examen.service'));

    setup = new DataSource({
      type: 'postgres',
      url: URL_PRUEBA!,
      entities: ENTIDADES,
      synchronize: true,
      dropSchema: true,
      logging: false,
    });
    await setup.initialize();

    await setup.query(
      `INSERT INTO estudiante
        (estudiante_id, nombre_completo, correo_institucional, activo)
       VALUES
        (101, 'Ana Activa', 'ana@test.local', true),
        (102, 'Beto Activo', 'beto@test.local', true),
        (103, 'Carla Inactiva', 'carla@test.local', false)`,
    );

    await setup.query(
      `INSERT INTO paralelo
        (paralelo_id, docente_id, materia_id, semestre_id, nombre_paralelo)
       VALUES
        (10, 7, 1, 2, 'A'),
        (11, 7, 1, 2, 'B')`,
    );

    await setup.query(
      `INSERT INTO inscripcion
        (inscripcion_id, estudiante_id, paralelo_id)
       VALUES
        (1, 101, 10),
        (2, 102, 11),
        (3, 103, 10)`,
    );

    await setup.query(
      `INSERT INTO examen
        (examen_id, docente_id, materia_id, semestre_id, estado,
         modo_asignacion, modo_seleccion, duracion_min, disponible_desde,
         disponible_hasta, titulo, instrucciones, orden_preguntas,
         al_terminar_tiempo, modo_entrega_nota, resultados_publicados_en)
       VALUES
        (5, 7, 1, 2, 'borrador', 'paralelos', 'manual', 60, $1, $2,
         'Evaluación HU-19', NULL, 'definido', 'enviar_automatico',
         'al_publicar', NULL)`,
      [creadoEn, expiraEn],
    );

    conexionA = new DataSource({
      type: 'postgres',
      url: URL_PRUEBA!,
      entities: ENTIDADES,
      synchronize: false,
      logging: false,
    });
    conexionB = new DataSource({
      type: 'postgres',
      url: URL_PRUEBA!,
      entities: ENTIDADES,
      synchronize: false,
      logging: false,
    });

    await Promise.all([conexionA.initialize(), conexionB.initialize()]);

    servicioA = crearServicio(conexionA);
    servicioB = crearServicio(conexionB);
  }, 60000);

  afterAll(async () => {
    await Promise.allSettled([
      conexionA?.destroy(),
      conexionB?.destroy(),
      setup?.destroy(),
    ]);
  });

  beforeEach(async () => {
    await reiniciarExamen();
  });

  function crearServicio(dataSource: DataSource) {
    return new ExamenService(
      dataSource,
      dataSource.getRepository(Examen) as never,
      dataSource.getRepository(Materia) as never,
      dataSource.getRepository(Semestre) as never,
      dataSource.getRepository(Paralelo) as never,
      dataSource.getRepository(Inscripcion) as never,
      dataSource.getRepository(Pregunta) as never,
      dataSource.getRepository(Tema) as never,
    );
  }

  async function reiniciarExamen(estado = 'borrador') {
    await setup.getRepository(ExamenEstudiante).clear();
    await setup.getRepository(ParaleloExamen).clear();
    await setup.getRepository(ExamenPregunta).clear();

    await setup.getRepository(Examen).update(
      { examen_id: 5 },
      {
        estado,
        modo_asignacion: 'paralelos',
        modo_seleccion: 'manual',
        docente_id: 7,
        materia_id: 1,
        semestre_id: 2,
        duracion_min: 60,
        disponible_desde: creadoEn,
        disponible_hasta: expiraEn,
      },
    );

    await setup.getRepository(ParaleloExamen).insert({
      examen_id: 5,
      paralelo_id: 10,
    });
    await setup.getRepository(ExamenPregunta).insert({
      examen_id: 5,
      pregunta_id: 1,
    });
  }

  async function estadoDelExamen() {
    return setup.getRepository(Examen).findOneByOrFail({ examen_id: 5 });
  }

  it('Caso A: serializa dos asignaciones concurrentes sin estados parciales', async () => {
    const resultados = await Promise.allSettled([
      servicioA.guardarAsignacion(
        5,
        { modo_asignacion: 'estudiantes', estudiante_ids: [101] },
        7,
      ),
      servicioB.guardarAsignacion(
        5,
        { modo_asignacion: 'estudiantes', estudiante_ids: [102] },
        7,
      ),
    ]);

    expect(resultados.map((resultado) => resultado.status)).toEqual([
      'fulfilled',
      'fulfilled',
    ]);

    const examen = await estadoDelExamen();
    const asignados = await setup
      .getRepository(ExamenEstudiante)
      .find({ where: { examen_id: 5 } });

    expect(examen.modo_asignacion).toBe('estudiantes');
    expect(asignados).toHaveLength(1);

    const estudianteFinal = asignados[0].estudiante_id;
    expect([101, 102]).toContain(estudianteFinal);

    // El paralelo de contexto debe corresponder exactamente al estudiante
    // que ganó la última escritura, no una mezcla de ambas operaciones.
    const paralelos = await setup
      .getRepository(ParaleloExamen)
      .find({ where: { examen_id: 5 } });

    expect(paralelos).toHaveLength(1);
    expect(paralelos[0].paralelo_id).toBe(
      estudianteFinal === 101 ? 10 : 11,
    );
  }, 30000);

  it('Caso B: solo una publicación concurrente gana el estado', async () => {
    const resultados = await Promise.allSettled([
      servicioA.publicar(5, 7),
      servicioB.publicar(5, 7),
    ]);

    const exitosas = resultados.filter(
      (resultado) => resultado.status === 'fulfilled',
    );
    const rechazadas = resultados.filter(
      (resultado) => resultado.status === 'rejected',
    );

    expect(exitosas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);

    const rechazo = rechazadas[0] as PromiseRejectedResult;
    expect(rechazo.reason).toBeInstanceOf(BadRequestException);

    const examen = await estadoDelExamen();
    expect(examen.estado).toBe('publicado');
  }, 30000);

  it('Caso C: un cambio de estado concurrente impide publicar', async () => {
    let liberar!: () => void;
    const esperaLiberacion = new Promise<void>((resolve) => {
      liberar = resolve;
    });

    let notificarActualizacion!: () => void;
    const actualizacionHecha = new Promise<void>((resolve) => {
      notificarActualizacion = resolve;
    });

    // La conexión B bloquea la fila y cambia el estado, pero no confirma hasta
    // que la publicación de A ya está esperando el bloqueo.
    const transaccionExterna = conexionB.transaction(async (manager) => {
      await manager.update(
        Examen,
        { examen_id: 5 },
        { estado: 'publicado' },
      );
      notificarActualizacion();
      await esperaLiberacion;
    });

    await actualizacionHecha;

    const publicacion = servicioA.publicar(5, 7).then(
      () => 'publicado',
      (error: unknown) => error,
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
    liberar();
    await transaccionExterna;

    const resultado = await publicacion;

    expect(resultado).toBeInstanceOf(BadRequestException);
    expect((await estadoDelExamen()).estado).toBe('publicado');
  }, 30000);

  it('Caso D: revierte la asignación completa ante un error de persistencia', async () => {
    await servicioA.guardarAsignacion(
      5,
      { modo_asignacion: 'estudiantes', estudiante_ids: [101] },
      7,
    );

    // Falla controlada únicamente en la base temporal de prueba.
    await setup.query(`
      CREATE OR REPLACE FUNCTION hu19_fallar_asignacion()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.estudiante_id = 102 THEN
          RAISE EXCEPTION 'fallo controlado HU-19';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await setup.query(`
      CREATE TRIGGER hu19_fallar_asignacion
      BEFORE INSERT ON examen_estudiante
      FOR EACH ROW EXECUTE FUNCTION hu19_fallar_asignacion();
    `);

    try {
      await expect(
        servicioA.guardarAsignacion(
          5,
          { modo_asignacion: 'estudiantes', estudiante_ids: [102] },
          7,
        ),
      ).rejects.toThrow('fallo controlado HU-19');
    } finally {
      await setup.query(
        'DROP TRIGGER IF EXISTS hu19_fallar_asignacion ON examen_estudiante',
      );
      await setup.query(
        'DROP FUNCTION IF EXISTS hu19_fallar_asignacion()',
      );
    }

    const examen = await estadoDelExamen();
    const asignados = await setup
      .getRepository(ExamenEstudiante)
      .find({ where: { examen_id: 5 } });
    const paralelos = await setup
      .getRepository(ParaleloExamen)
      .find({ where: { examen_id: 5 } });

    expect(examen.modo_asignacion).toBe('estudiantes');
    expect(asignados.map((fila) => fila.estudiante_id)).toEqual([101]);
    expect(paralelos.map((fila) => fila.paralelo_id)).toEqual([10]);
  }, 30000);
});
