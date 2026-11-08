import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { ExamenEstudiante } from '../examenestudiante/entity/examenestudiante.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenTema } from '../examentema/entity/examentema.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Examen } from './entity/examen.entity';
import type {
  EstadoDisponibilidadEvaluacion,
  EvaluacionAsignadaDto,
} from './dto/evaluacion-asignada.dto';
import type { InstruccionesEvaluacionEstudianteDto } from './dto/instrucciones-evaluacion-estudiante.dto';
import {
  IncisoDocenteDto,
  OpcionDocenteDto,
  PreguntaDocenteDto,
  RespuestasEvaluacionDocenteDto,
  VistaEvaluacionEstudianteDto,
} from './dto/vista-evaluacion.dto';

interface FilaPregunta {
  pregunta_id: number | string;
  enunciado: string;
  explicacion?: string | null;
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  puntaje_max: string;
  nro_opcion: number | string | null;
  texto_opcion: string | null;
  solucion_nro_opcion?: number | string | null;
  valor_correcto?: string | null;
  tolerancia?: string | null;
  solucion_referencia?: string | null;
}

interface OpcionLeida {
  nro_opcion: number;
  texto_opcion: string;
  es_correcta: boolean;
}

interface IncisoLeido {
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  puntaje_max: number;
  opciones: OpcionLeida[];
  valor_correcto: number | null;
  tolerancia: number | null;
  solucion_referencia: string | null;
}

interface PreguntaLeida {
  pregunta_id: number;
  orden: number;
  enunciado: string;
  explicacion: string | null;
  incisos: IncisoLeido[];
}

interface OrdenPregunta {
  pregunta_id: number;
  orden: number;
}

/**
 * Acceso de lectura a las preguntas de una evaluación.
 *
 * La vista del estudiante solo selecciona enunciados y alternativas. La vista
 * del docente selecciona además explicación y solución, siempre que la
 * evaluación pertenezca al docente autenticado.
 */
@Injectable()
export class ExamenAccesoService {
  constructor(
    @InjectRepository(Examen)
    private readonly examenRepository: Repository<Examen>,

    @InjectRepository(ExamenPregunta)
    private readonly examenPreguntaRepository: Repository<ExamenPregunta>,

    @InjectRepository(ExamenTema)
    private readonly examenTemaRepository: Repository<ExamenTema>,

    @InjectRepository(AsignacionPregunta)
    private readonly asignacionPreguntaRepository: Repository<AsignacionPregunta>,

    @InjectRepository(Inscripcion)
    private readonly inscripcionRepository: Repository<Inscripcion>,

    @InjectRepository(ExamenEstudiante)
    private readonly examenEstudianteRepository: Repository<ExamenEstudiante>,

    @InjectRepository(Pregunta)
    private readonly preguntaRepository: Repository<Pregunta>,

    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,
  ) {}

  /**
   * Lista los metadatos de evaluaciones publicadas asignadas al estudiante.
   * La autorización se calcula con EXISTS para no duplicar filas por múltiples
   * inscripciones ni mezclar la selección individual con la grupal.
   */
  async listarEvaluacionesAsignadas(
    estudianteId: number,
  ): Promise<EvaluacionAsignadaDto[]> {
    const filas = await this.examenRepository
      .createQueryBuilder('examen')
      .distinct(true)
      .leftJoin('examen.materia', 'materia')
      .leftJoin('examen.docente', 'docente')
      .select('examen.examen_id', 'examen_id')
      .addSelect('examen.titulo', 'titulo')
      .addSelect('materia.nombre', 'materia')
      .addSelect('docente.nombre', 'docente')
      .addSelect('examen.disponible_desde', 'disponible_desde')
      .addSelect('examen.disponible_hasta', 'disponible_hasta')
      .addSelect('examen.duracion_min', 'duracion_min')
      .addSelect(
        `CASE
          WHEN examen.modo_seleccion = 'aleatorio' THEN COALESCE(
            (
              SELECT SUM(examenTema.cantidad)
              FROM examen_tema examenTema
              WHERE examenTema.examen_id = examen.examen_id
            ),
            0
          )
          ELSE (
            SELECT COUNT(*)
            FROM examen_pregunta examenPregunta
            WHERE examenPregunta.examen_id = examen.examen_id
          )
        END`,
        'total_preguntas',
      )
      .where('examen.estado = :estadoPublicado', {
        estadoPublicado: 'publicado',
      })
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM estudiante estudianteActivo
          WHERE estudianteActivo.estudiante_id = :estudianteId
            AND estudianteActivo.activo = true
        )`,
      )
      .andWhere(
        `(
          (
            examen.modo_asignacion = :modoEstudiantes
            AND EXISTS (
              SELECT 1
              FROM examen_estudiante asignacionIndividual
              WHERE asignacionIndividual.examen_id = examen.examen_id
                AND asignacionIndividual.estudiante_id = :estudianteId
            )
          )
          OR
          (
            examen.modo_asignacion = :modoParalelos
            AND EXISTS (
              SELECT 1
              FROM inscripcion
              INNER JOIN paralelo_examen
                ON paralelo_examen.paralelo_id = inscripcion.paralelo_id
              WHERE inscripcion.estudiante_id = :estudianteId
                AND paralelo_examen.examen_id = examen.examen_id
            )
          )
        )`,
        {
          modoEstudiantes: 'estudiantes',
          modoParalelos: 'paralelos',
          estudianteId,
        },
      )
      .orderBy('examen.disponible_desde', 'ASC')
      .addOrderBy('examen.examen_id', 'DESC')
      .getRawMany<{
        examen_id: number | string;
        titulo: string | null;
        materia: string | null;
        docente: string | null;
        disponible_desde: Date | string | null;
        disponible_hasta: Date | string | null;
        duracion_min: number | string | null;
        total_preguntas: number | string;
      }>();

    const ahora = Date.now();

    return filas.map((fila) => {
      const disponibleDesde = this.convertirFecha(fila.disponible_desde);
      const disponibleHasta = this.convertirFecha(fila.disponible_hasta);

      return {
        examen_id: Number(fila.examen_id),
        titulo: fila.titulo,
        materia: fila.materia,
        docente: fila.docente,
        disponible_desde: disponibleDesde,
        disponible_hasta: disponibleHasta,
        duracion_min:
          fila.duracion_min === null ? null : Number(fila.duracion_min),
        total_preguntas: Number(fila.total_preguntas),
        estado_disponibilidad: this.clasificarDisponibilidad(
          disponibleDesde,
          disponibleHasta,
          ahora,
        ),
      };
    });
  }

  /**
   * Devuelve solo la proyección previa de una evaluación disponible.
   * Reutiliza las reglas de asignación y ventana sin cargar preguntas.
   */
  async obtenerInstruccionesEstudiante(
    examenId: number,
    estudianteId: number,
  ): Promise<InstruccionesEvaluacionEstudianteDto> {
    const examen = await this.examenRepository.findOne({
      where: { examen_id: examenId },
      relations: { materia: true, docente: true },
      select: {
        examen_id: true,
        titulo: true,
        instrucciones: true,
        estado: true,
        modo_asignacion: true,
        modo_seleccion: true,
        duracion_min: true,
        disponible_desde: true,
        disponible_hasta: true,
        materia: { nombre: true },
        docente: { nombre: true },
      },
    });

    if (!examen || examen.estado !== 'publicado') {
      throw new NotFoundException('La evaluación no está disponible.');
    }

    if (!(await this.estaAsignado(examen, estudianteId))) {
      throw new NotFoundException('La evaluación no está disponible.');
    }

    if (!this.estaEnVentana(examen)) {
      throw new ForbiddenException(
        'Las instrucciones estarán disponibles durante el periodo de la evaluación.',
      );
    }

    const totalPreguntas =
      examen.modo_seleccion === 'aleatorio'
        ? (
            await this.examenTemaRepository.find({
              where: { examen_id: examenId },
              select: { cantidad: true },
            })
          ).reduce((total, criterio) => total + criterio.cantidad, 0)
        : await this.examenPreguntaRepository.count({
            where: { examen_id: examenId },
          });

    return {
      examen_id: examen.examen_id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones,
      materia: examen.materia?.nombre ?? null,
      docente: examen.docente?.nombre ?? null,
      duracion_min: examen.duracion_min,
      disponible_desde: examen.disponible_desde,
      disponible_hasta: examen.disponible_hasta,
      total_preguntas: totalPreguntas,
      estado_disponibilidad: 'disponible',
    };
  }

  /**
   * Vista segura del estudiante. Las respuestas correctas solo se agregan si
   * el docente publicó los resultados de la evaluación.
   */
  async obtenerVistaEstudiante(
    examenId: number,
    estudianteId: number,
  ): Promise<VistaEvaluacionEstudianteDto> {
    const examen = await this.examenRepository.findOne({
      where: { examen_id: examenId },
      select: {
        examen_id: true,
        titulo: true,
        instrucciones: true,
        estado: true,
        modo_asignacion: true,
        duracion_min: true,
        disponible_desde: true,
        disponible_hasta: true,
        resultados_publicados_en: true,
      },
    });

    // No se distingue entre "no existe", "no está publicada" y "no está
    // asignada": el estudiante no debe poder enumerar evaluaciones ajenas.
    if (!examen || examen.estado !== 'publicado') {
      throw new NotFoundException('La evaluación no está disponible.');
    }

    const asignado = await this.estaAsignado(examen, estudianteId);

    if (!asignado) {
      throw new NotFoundException('La evaluación no está disponible.');
    }

    const resultadosPublicados = examen.resultados_publicados_en !== null;

    // Mientras el examen está vigente se puede responder. Después de publicar
    // resultados se permite revisar la evaluación aunque la ventana cerró.
    if (!resultadosPublicados && !this.estaEnVentana(examen)) {
      throw new ForbiddenException(
        'La evaluación no está disponible en este momento.',
      );
    }

    const orden = await this.obtenerOrdenPreguntas(examenId, estudianteId);
    const ids: number[] = orden.map((fila) => fila.pregunta_id);

    const filas = await this.consultarPreguntas(ids, resultadosPublicados);
    const preguntas = this.construirPreguntas(filas, orden);

    return {
      examen_id: examen.examen_id,
      titulo: examen.titulo,
      instrucciones: examen.instrucciones,
      estado: examen.estado,
      duracion_min: examen.duracion_min,
      disponible_desde: examen.disponible_desde,
      disponible_hasta: examen.disponible_hasta,
      resultados_publicados: resultadosPublicados,
      respuestas_disponibles: resultadosPublicados,
      mensaje: resultadosPublicados
        ? null
        : 'Las respuestas correctas estarán disponibles cuando el docente publique los resultados.',
      preguntas: resultadosPublicados
        ? this.aPreguntasEstudiantePublicadas(preguntas)
        : this.aPreguntasEstudiante(preguntas),
    };
  }

  /**
   * Respuestas correctas y explicaciones para el docente propietario de la
   * evaluación. La consulta filtra por `docente_id`, no solo por el ID.
   */
  async obtenerRespuestasDocente(
    examenId: number,
    docenteId: number,
  ): Promise<RespuestasEvaluacionDocenteDto> {
    const examen = await this.examenRepository.findOne({
      where: { examen_id: examenId, docente_id: docenteId },
      select: {
        examen_id: true,
        titulo: true,
        estado: true,
        resultados_publicados_en: true,
      },
    });

    if (!examen) {
      throw new NotFoundException('La evaluación no existe.');
    }

    const filasOrden = await this.examenPreguntaRepository.find({
      where: { examen_id: examenId },
      select: { pregunta_id: true, orden: true },
      order: { orden: 'ASC' },
    });

    const orden: OrdenPregunta[] = filasOrden.map((fila) => ({
      pregunta_id: fila.pregunta_id,
      orden: fila.orden,
    }));

    const filas = await this.consultarPreguntas(
      orden.map((fila) => fila.pregunta_id),
      true,
    );

    return {
      examen_id: examen.examen_id,
      titulo: examen.titulo,
      estado: examen.estado,
      resultados_publicados_en: examen.resultados_publicados_en,
      preguntas: this.aPreguntasDocente(
        this.construirPreguntas(filas, orden),
      ),
    };
  }

  /**
   * Publica de forma autorizada las respuestas correctas de una evaluación ya
   * publicada. Se usa `resultados_publicados_en`, el campo existente para la
   * publicación de resultados; no se modifica el esquema.
   *
   * La escritura es atómica: el `UPDATE` solo afecta a la fila cuando
   * `resultados_publicados_en` sigue siendo `NULL`. Si dos solicitudes llegan
   * a la vez, PostgreSQL serializa el acceso a la fila; la primera escribe su
   * fecha y la segunda no coincide con la condición, por lo que conserva la
   * fecha original. Así se mantiene la idempotencia sin leer y escribir por
   * separado.
   */
  async publicarRespuestas(examenId: number, docenteId: number) {
    const publicacion = await this.examenRepository
      .createQueryBuilder()
      .update()
      .set({
        resultados_publicados_en: () => 'now()',
      })
      .where('examen_id = :examenId', { examenId })
      .andWhere('docente_id = :docenteId', { docenteId })
      .andWhere('estado = :estado', { estado: 'publicado' })
      .andWhere('resultados_publicados_en IS NULL')
      .returning(['examen_id', 'resultados_publicados_en'])
      .execute();

    const filaPublicada = publicacion.raw?.[0] as
      | { examen_id: number; resultados_publicados_en: Date }
      | undefined;

    // Esta solicitud fue la que publicó por primera vez.
    if (filaPublicada) {
      return {
        examen_id: Number(filaPublicada.examen_id),
        resultados_publicados_en: filaPublicada.resultados_publicados_en,
        ya_publicadas: false,
      };
    }

    // No hubo escritura: la evaluación no existe, no pertenece al docente, no
    // está publicada o ya tenía resultados. Se consulta solo para distinguir
    // el error correcto; la fecha existente no se modifica.
    const examen = await this.examenRepository.findOne({
      where: { examen_id: examenId, docente_id: docenteId },
      select: {
        examen_id: true,
        estado: true,
        resultados_publicados_en: true,
      },
    });

    if (!examen) {
      throw new NotFoundException('La evaluación no existe.');
    }

    if (examen.estado !== 'publicado') {
      throw new BadRequestException(
        'Primero debes publicar la evaluación antes de publicar sus respuestas.',
      );
    }

    return {
      examen_id: examen.examen_id,
      resultados_publicados_en: examen.resultados_publicados_en,
      ya_publicadas: true,
    };
  }

  /**
   * El estudiante debe estar activo y asignado según el modo de la evaluación.
   *
   * - `estudiantes`: solo la selección individual en `examen_estudiante`.
   *   `paralelo_examen` se conserva como contexto, nunca como autorización.
   * - `paralelos`: pertenencia dinámica al paralelo mediante `inscripcion`.
   *
   * Un modo desconocido se rechaza (fail closed).
   */
  private async estaAsignado(
    examen: Pick<Examen, 'examen_id' | 'modo_asignacion'>,
    estudianteId: number,
  ): Promise<boolean> {
    // Un estudiante inactivo no accede aunque conserve su asignación.
    const estudianteActivo = await this.estudianteRepository.count({
      where: { estudiante_id: estudianteId, activo: true },
    });

    if (estudianteActivo === 0) {
      return false;
    }

    if (examen.modo_asignacion === 'estudiantes') {
      const asignacionDirecta = await this.examenEstudianteRepository.count({
        where: {
          examen_id: examen.examen_id,
          estudiante_id: estudianteId,
        },
      });

      return asignacionDirecta > 0;
    }

    if (examen.modo_asignacion === 'paralelos') {
      const asignacionPorParalelo = await this.inscripcionRepository
        .createQueryBuilder('inscripcion')
        .innerJoin(
          ParaleloExamen,
          'paraleloExamen',
          'paraleloExamen.paralelo_id = inscripcion.paralelo_id',
        )
        .where('inscripcion.estudiante_id = :estudianteId', { estudianteId })
        .andWhere('paraleloExamen.examen_id = :examenId', {
          examenId: examen.examen_id,
        })
        .getCount();

      return asignacionPorParalelo > 0;
    }

    return false;
  }

  private estaEnVentana(examen: Examen): boolean {
    if (!examen.disponible_desde || !examen.disponible_hasta) {
      return false;
    }

    const ahora = Date.now();
    const desde = new Date(examen.disponible_desde).getTime();
    const hasta = new Date(examen.disponible_hasta).getTime();

    return ahora >= desde && ahora <= hasta;
  }

  private convertirFecha(fecha: Date | string | null): Date | null {
    if (fecha === null) {
      return null;
    }

    const resultado = fecha instanceof Date ? fecha : new Date(fecha);
    return Number.isNaN(resultado.getTime()) ? null : resultado;
  }

  private clasificarDisponibilidad(
    desde: Date | null,
    hasta: Date | null,
    ahora: number,
  ): EstadoDisponibilidadEvaluacion | null {
    if (!desde || !hasta || hasta.getTime() <= desde.getTime()) {
      return null;
    }

    if (ahora < desde.getTime()) {
      return 'proxima';
    }

    if (ahora <= hasta.getTime()) {
      return 'disponible';
    }

    return 'finalizada';
  }

  /**
   * Si el módulo de rendición ya generó preguntas por estudiante, se respeta
   * ese orden. Mientras no exista, se usa la selección de la evaluación.
   */
  private async obtenerOrdenPreguntas(
    examenId: number,
    estudianteId: number,
  ): Promise<OrdenPregunta[]> {
    const asignadas = await this.asignacionPreguntaRepository.find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      select: { pregunta_id: true, orden: true },
      order: { orden: 'ASC' },
    });

    if (asignadas.length > 0) {
      return asignadas.map((fila) => ({
        pregunta_id: fila.pregunta_id,
        orden: fila.orden,
      }));
    }

    const preguntasExamen = await this.examenPreguntaRepository.find({
      where: { examen_id: examenId },
      select: { pregunta_id: true, orden: true },
      order: { orden: 'ASC' },
    });

    return preguntasExamen.map((fila) => ({
      pregunta_id: fila.pregunta_id,
      orden: fila.orden,
    }));
  }

  /**
   * Consulta explícita de columnas. Sin `incluirSoluciones` no se toca ninguna
   * tabla de solución ni la explicación de la pregunta.
   */
  private async consultarPreguntas(
    ids: number[],
    incluirSoluciones: boolean,
  ): Promise<FilaPregunta[]> {
    if (ids.length === 0) {
      return [];
    }

    const consulta = this.preguntaRepository
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.incisos', 'inciso')
      .leftJoin('inciso.opciones', 'opcion')
      .select('pregunta.pregunta_id', 'pregunta_id')
      .addSelect('pregunta.enunciado', 'enunciado')
      .addSelect('inciso.letra', 'letra')
      .addSelect('inciso.enunciado_inciso', 'enunciado_inciso')
      .addSelect('inciso.tipo_respuesta', 'tipo_respuesta')
      .addSelect('inciso.puntaje_max', 'puntaje_max')
      .addSelect('opcion.nro_opcion', 'nro_opcion')
      .addSelect('opcion.texto_opcion', 'texto_opcion')
      .where('pregunta.pregunta_id IN (:...ids)', { ids });

    if (incluirSoluciones) {
      consulta
        .addSelect('pregunta.explicacion', 'explicacion')
        .leftJoin('inciso.solucion', 'solucionInciso')
        .leftJoin(
          'inciso.solucionesOpcion',
          'solucionOpcion',
          'solucionOpcion.nro_opcion = opcion.nro_opcion',
        )
        .addSelect('solucionInciso.valor_correcto', 'valor_correcto')
        .addSelect('solucionInciso.tolerancia', 'tolerancia')
        .addSelect('solucionInciso.rubrica', 'solucion_referencia')
        .addSelect('solucionOpcion.nro_opcion', 'solucion_nro_opcion');
    }

    return consulta
      .orderBy('pregunta.pregunta_id', 'ASC')
      .addOrderBy('inciso.letra', 'ASC')
      .addOrderBy('opcion.nro_opcion', 'ASC')
      .getRawMany<FilaPregunta>();
  }

  /** Agrupa las filas planas en preguntas con sus incisos y opciones. */
  private construirPreguntas(
    filas: FilaPregunta[],
    orden: OrdenPregunta[],
  ): PreguntaLeida[] {
    const ordenPorPregunta = new Map(
      orden.map((fila) => [fila.pregunta_id, fila.orden]),
    );

    const porPregunta = new Map<number, PreguntaLeida>();

    for (const fila of filas) {
      const preguntaId = Number(fila.pregunta_id);

      let pregunta = porPregunta.get(preguntaId);

      if (!pregunta) {
        pregunta = {
          pregunta_id: preguntaId,
          orden: ordenPorPregunta.get(preguntaId) ?? 0,
          enunciado: fila.enunciado,
          explicacion: fila.explicacion ?? null,
          incisos: [],
        };
        porPregunta.set(preguntaId, pregunta);
      }

      let inciso = pregunta.incisos.find(
        (item) => item.letra === fila.letra,
      );

      if (!inciso) {
        inciso = {
          letra: fila.letra,
          enunciado_inciso: fila.enunciado_inciso,
          tipo_respuesta: fila.tipo_respuesta,
          puntaje_max: Number(fila.puntaje_max) || 0,
          opciones: [],
          valor_correcto:
            fila.valor_correcto !== undefined &&
            fila.valor_correcto !== null
              ? Number(fila.valor_correcto)
              : null,
          tolerancia:
            fila.tolerancia !== undefined && fila.tolerancia !== null
              ? Number(fila.tolerancia)
              : null,
          solucion_referencia: fila.solucion_referencia ?? null,
        };
        pregunta.incisos.push(inciso);
      }

      if (fila.nro_opcion !== null && fila.nro_opcion !== undefined) {
        inciso.opciones.push({
          nro_opcion: Number(fila.nro_opcion),
          texto_opcion: fila.texto_opcion ?? '',
          es_correcta:
            fila.solucion_nro_opcion !== undefined &&
            fila.solucion_nro_opcion !== null,
        });
      }
    }

    return orden
      .map((fila) => porPregunta.get(fila.pregunta_id))
      .filter((pregunta): pregunta is PreguntaLeida => pregunta !== undefined);
  }

  /** Proyección segura: no incluye explicación ni solución. */
  private aPreguntasEstudiante(preguntas: PreguntaLeida[]) {
    return preguntas.map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado,
      tipo_respuesta: this.tipoRespuesta(pregunta),
      puntaje_max: this.puntajeTotal(pregunta),
      incisos: pregunta.incisos.map((inciso) => ({
        letra: inciso.letra,
        enunciado_inciso: inciso.enunciado_inciso,
        tipo_respuesta: inciso.tipo_respuesta,
        puntaje_max: inciso.puntaje_max,
        opciones: inciso.opciones.map((opcion) => ({
          nro_opcion: opcion.nro_opcion,
          texto_opcion: opcion.texto_opcion,
        })),
      })),
    }));
  }

  /** Proyección posterior a la publicación autorizada de resultados. */
  private aPreguntasEstudiantePublicadas(preguntas: PreguntaLeida[]) {
    return preguntas.map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado,
      tipo_respuesta: this.tipoRespuesta(pregunta),
      puntaje_max: this.puntajeTotal(pregunta),
      explicacion: pregunta.explicacion,
      incisos: pregunta.incisos.map((inciso) => ({
        letra: inciso.letra,
        enunciado_inciso: inciso.enunciado_inciso,
        tipo_respuesta: inciso.tipo_respuesta,
        puntaje_max: inciso.puntaje_max,
        valor_correcto: inciso.valor_correcto,
        tolerancia: inciso.tolerancia,
        solucion_referencia: inciso.solucion_referencia,
        opciones: inciso.opciones.map((opcion) => ({
          nro_opcion: opcion.nro_opcion,
          texto_opcion: opcion.texto_opcion,
          es_correcta: opcion.es_correcta,
        })),
      })),
    }));
  }

  /** Proyección completa para el docente propietario. */
  private aPreguntasDocente(preguntas: PreguntaLeida[]): PreguntaDocenteDto[] {
    return preguntas.map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado,
      tipo_respuesta: this.tipoRespuesta(pregunta),
      puntaje_max: this.puntajeTotal(pregunta),
      explicacion: pregunta.explicacion,
      incisos: pregunta.incisos.map(
        (inciso): IncisoDocenteDto => ({
          letra: inciso.letra,
          enunciado_inciso: inciso.enunciado_inciso,
          tipo_respuesta: inciso.tipo_respuesta,
          puntaje_max: inciso.puntaje_max,
          valor_correcto: inciso.valor_correcto,
          tolerancia: inciso.tolerancia,
          solucion_referencia: inciso.solucion_referencia,
          opciones: inciso.opciones.map(
            (opcion): OpcionDocenteDto => ({
              nro_opcion: opcion.nro_opcion,
              texto_opcion: opcion.texto_opcion,
              es_correcta: opcion.es_correcta,
            }),
          ),
        }),
      ),
    }));
  }

  private tipoRespuesta(pregunta: PreguntaLeida): string | null {
    const tipos = new Set(
      pregunta.incisos.map((inciso) => inciso.tipo_respuesta),
    );

    if (tipos.size === 0) return null;
    if (tipos.size === 1) return [...tipos][0];
    return 'mixto';
  }

  private puntajeTotal(pregunta: PreguntaLeida): number {
    return pregunta.incisos.reduce(
      (total, inciso) => total + inciso.puntaje_max,
      0,
    );
  }
}
