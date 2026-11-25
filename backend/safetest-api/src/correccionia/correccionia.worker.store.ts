import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Not } from 'typeorm';

import { Examen } from '../examen/entity/examen.entity';
import { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import type { CriterioCorreccionIa } from '../ia/ai.types';
import { Inciso } from '../inciso/entity/inciso.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { TIPOS_RESPUESTA } from '../pregunta/entity/dtos/create-pregunta.dto';
import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import {
  ErrorProcesamientoCorreccionIa,
  MENSAJE_EXAMEN_PUBLICADO,
  MENSAJE_TIEMPO_AGOTADO,
  sanitizarMensajeError,
} from './correccionia.errores';
import { resolverCriterio } from './correccionia.criterio';
import { CorreccionIa } from './entity/correccionia.entity';
import type {
  AlmacenCorreccionIa,
  ContextoCorreccionIa,
  FuenteCriterioCorreccionIa,
  ResultadoCorreccionAlmacenado,
  ResultadoPersistenciaCorreccionIa,
  ResultadoRecuperacionCorreccionIa,
} from './correccionia.types';

interface FilasAfectadas {
  propuesta_id: number;
}

/**
 * Con PostgreSQL, TypeORM devuelve `[filas, conteo]` en las sentencias
 * `UPDATE ... RETURNING`, y solo `filas` en los `SELECT`. Sin normalizar, el
 * reclamo leía `filas[0]` como si fuera una fila (era el arreglo de filas) y
 * devolvía siempre `null`: la propuesta quedaba en `procesando` sin que el
 * worker la ejecutara jamás.
 */
export function extraerFilas(resultado: unknown): FilasAfectadas[] {
  if (!Array.isArray(resultado)) {
    return [];
  }

  if (
    resultado.length === 2 &&
    Array.isArray(resultado[0]) &&
    typeof resultado[1] === 'number'
  ) {
    return resultado[0] as FilasAfectadas[];
  }

  return resultado as FilasAfectadas[];
}

const SQL_RECLAMAR = `
  UPDATE correccion_ia AS c
     SET estado = 'procesando',
         iniciada_en = $1,
         actualizada_en = $1,
         reintentos_worker = c.reintentos_worker + 1,
         error_codigo = NULL,
         error_mensaje = NULL
   WHERE c.propuesta_id = (
     SELECT p.propuesta_id
       FROM correccion_ia AS p
       INNER JOIN examen AS e ON e.examen_id = p.examen_id
      WHERE p.estado = 'pendiente'
        AND e.calificaciones_revisadas_en IS NULL
        AND e.resultados_publicados_en IS NULL
      ORDER BY p.creada_en, p.propuesta_id
      FOR UPDATE OF p SKIP LOCKED
      LIMIT 1
   )
  RETURNING c.propuesta_id
`;

const SQL_CERRAR_PROCESANDO_DE_EXAMEN_CERRADO = `
  UPDATE correccion_ia AS c
     SET estado = 'error',
         error_codigo = 'EXAMEN_PUBLICADO',
         error_mensaje = $3,
         finalizada_en = $1,
         actualizada_en = $1
    FROM examen AS e
   WHERE e.examen_id = c.examen_id
     AND c.estado = 'procesando'
     AND (c.iniciada_en IS NULL OR c.iniciada_en < $1::timestamptz - ($2::text || ' seconds')::interval)
     AND (e.calificaciones_revisadas_en IS NOT NULL OR e.resultados_publicados_en IS NOT NULL)
  RETURNING c.propuesta_id
`;

const SQL_REENCOLAR = `
  UPDATE correccion_ia AS c
     SET estado = 'pendiente',
         iniciada_en = NULL,
         actualizada_en = $1,
         error_codigo = NULL,
         error_mensaje = NULL
    FROM examen AS e
   WHERE e.examen_id = c.examen_id
     AND c.estado = 'procesando'
     AND (c.iniciada_en IS NULL OR c.iniciada_en < $1::timestamptz - ($2::text || ' seconds')::interval)
     AND c.reintentos_worker < $3
     AND e.calificaciones_revisadas_en IS NULL
     AND e.resultados_publicados_en IS NULL
  RETURNING c.propuesta_id
`;

const SQL_AGOTAR = `
  UPDATE correccion_ia AS c
     SET estado = 'error',
         error_codigo = 'TIEMPO_AGOTADO',
         error_mensaje = $4,
         finalizada_en = $1,
         actualizada_en = $1
    FROM examen AS e
   WHERE e.examen_id = c.examen_id
     AND c.estado = 'procesando'
     AND (c.iniciada_en IS NULL OR c.iniciada_en < $1::timestamptz - ($2::text || ' seconds')::interval)
     AND c.reintentos_worker >= $3
     AND e.calificaciones_revisadas_en IS NULL
     AND e.resultados_publicados_en IS NULL
  RETURNING c.propuesta_id
`;

@Injectable()
export class CorreccionIaWorkerStore implements AlmacenCorreccionIa {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async reclamar(ahora: Date): Promise<number | null> {
    const filas = extraerFilas(
      await this.dataSource.query<unknown>(SQL_RECLAMAR, [ahora]),
    );

    return filas[0]?.propuesta_id ?? null;
  }

  async cargarContexto(propuestaId: number): Promise<ContextoCorreccionIa> {
    const propuesta = await this.dataSource
      .getRepository(CorreccionIa)
      .findOne({ where: { propuesta_id: propuestaId } });

    if (!propuesta) {
      throw new ErrorProcesamientoCorreccionIa(
        'PROPUESTA_NO_ENCONTRADA',
        'La propuesta ya no existe.',
      );
    }

    if (propuesta.estado !== 'procesando') {
      throw new ErrorProcesamientoCorreccionIa(
        'ESTADO_INESPERADO',
        'La propuesta ya no está en proceso.',
      );
    }

    const examen = await this.dataSource
      .getRepository(Examen)
      .findOne({ where: { examen_id: propuesta.examen_id } });

    if (!examen) {
      throw new ErrorProcesamientoCorreccionIa(
        'DATOS_INVALIDOS',
        'No se encontró el examen de la propuesta.',
      );
    }

    const inciso = await this.dataSource.getRepository(Inciso).findOne({
      where: { pregunta_id: propuesta.pregunta_id, letra: propuesta.letra },
      relations: { pregunta: true },
    });

    if (!inciso) {
      throw new ErrorProcesamientoCorreccionIa(
        'DATOS_INVALIDOS',
        'No se encontró el inciso de la propuesta.',
      );
    }

    if (!esTipoRespuesta(inciso.tipo_respuesta)) {
      throw new ErrorProcesamientoCorreccionIa(
        'DATOS_INVALIDOS',
        'El tipo de respuesta del inciso no es válido.',
      );
    }

    const puntajeMaximo = convertirNumero(
      propuesta.puntaje_max_inciso ?? inciso.puntaje_max,
    );
    if (puntajeMaximo === null || puntajeMaximo <= 0) {
      throw new ErrorProcesamientoCorreccionIa(
        'PUNTAJE_MAX_INVALIDO',
        'El puntaje máximo del inciso no es válido.',
      );
    }

    const claveRespuesta = {
      examen_id: propuesta.examen_id,
      estudiante_id: propuesta.estudiante_id,
      pregunta_id: propuesta.pregunta_id,
      letra: propuesta.letra,
    };

    const respuesta = await this.dataSource
      .getRepository(RespuestaInciso)
      .findOne({ where: claveRespuesta });
    const opcionesMarcadas = await this.dataSource
      .getRepository(OpcionMarcada)
      .find({
        where: claveRespuesta,
        relations: { opcion: true },
        order: { nro_opcion: 'ASC' },
      });

    const solucion = await this.dataSource
      .getRepository(SolucionInciso)
      .findOne({
        where: {
          pregunta_id: propuesta.pregunta_id,
          letra: propuesta.letra,
        },
      });
    const referencia = await this.dataSource
      .getRepository(IaSolucionReferencia)
      .findOne({
        where: {
          pregunta_id: propuesta.pregunta_id,
          docente_id: propuesta.docente_id,
          revisada_en: Not(IsNull()),
        },
        order: { revisada_en: 'DESC' },
      });

    const { criterio, fuente } = construirCriterio(
      solucion,
      referencia,
      inciso.tipo_respuesta,
    );

    return {
      propuesta_id: propuesta.propuesta_id,
      examen_cerrado:
        examen.calificaciones_revisadas_en !== null ||
        examen.resultados_publicados_en !== null,
      enunciado: construirEnunciado(inciso),
      tipo_respuesta: inciso.tipo_respuesta as TipoRespuesta,
      respuesta_estudiante: construirRespuestaEstudiante(
        respuesta?.respuesta_texto ?? null,
        opcionesMarcadas,
      ),
      criterio,
      criterio_fuente: fuente,
      puntaje_max: puntajeMaximo,
    };
  }

  async guardarGenerada(
    propuestaId: number,
    resultado: ResultadoCorreccionAlmacenado,
    ahora: Date,
  ): Promise<ResultadoPersistenciaCorreccionIa> {
    return this.dataSource.transaction(async (manager) => {
      const correcciones = manager.getRepository(CorreccionIa);
      const referencia = await correcciones.findOne({
        where: { propuesta_id: propuestaId },
        select: { propuesta_id: true, examen_id: true },
      });

      if (!referencia) {
        return 'omitida';
      }

      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: referencia.examen_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!examen) {
        throw new ErrorProcesamientoCorreccionIa(
          'DATOS_INVALIDOS',
          'No se encontró el examen al persistir el resultado.',
        );
      }

      const propuesta = await correcciones.findOne({
        where: { propuesta_id: propuestaId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!propuesta || propuesta.estado !== 'procesando') {
        return 'omitida';
      }

      if (
        examen.calificaciones_revisadas_en !== null ||
        examen.resultados_publicados_en !== null
      ) {
        return 'examen_publicado';
      }

      propuesta.estado = 'generada';
      propuesta.puntaje_sugerido = resultado.puntaje_sugerido.toFixed(2);
      propuesta.valoracion = resultado.valoracion;
      propuesta.explicacion = resultado.explicacion;
      propuesta.errores = resultado.errores;
      propuesta.confianza =
        resultado.confianza === null ? null : resultado.confianza.toFixed(2);
      propuesta.proveedor = resultado.proveedor;
      propuesta.modelo = resultado.modelo;
      propuesta.criterio_fuente = resultado.criterio_fuente;
      propuesta.criterio_hash = resultado.criterio_hash;
      propuesta.finalizada_en = ahora;
      propuesta.error_codigo = null;
      propuesta.error_mensaje = null;
      propuesta.version += 1;

      await manager.getRepository(CorreccionIa).save(propuesta);

      return 'generada';
    });
  }

  async marcarError(
    propuestaId: number,
    codigo: string,
    mensaje: string,
    ahora: Date,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const correcciones = manager.getRepository(CorreccionIa);
      const referencia = await correcciones.findOne({
        where: { propuesta_id: propuestaId },
        select: { propuesta_id: true, examen_id: true },
      });
      if (!referencia) {
        return false;
      }

      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: referencia.examen_id },
        lock: { mode: 'pessimistic_write' },
      });
      const propuesta = await correcciones.findOne({
        where: { propuesta_id: propuestaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!propuesta || propuesta.estado !== 'procesando') {
        return false;
      }

      const examenCerrado =
        examen !== null &&
        (examen.calificaciones_revisadas_en !== null ||
          examen.resultados_publicados_en !== null);
      propuesta.estado = 'error';
      propuesta.error_codigo = examenCerrado
        ? 'EXAMEN_PUBLICADO'
        : codigo.slice(0, 40);
      propuesta.error_mensaje = sanitizarMensajeError(
        examenCerrado ? MENSAJE_EXAMEN_PUBLICADO : mensaje,
      );
      propuesta.finalizada_en = ahora;
      propuesta.actualizada_en = ahora;

      await correcciones.save(propuesta);
      return true;
    });
  }

  async recuperarAbandonadas(
    ahora: Date,
    leaseSegundos: number,
    maxIntentos: number,
  ): Promise<ResultadoRecuperacionCorreccionIa> {
    const cerradas = extraerFilas(
      await this.dataSource.query<unknown>(
        SQL_CERRAR_PROCESANDO_DE_EXAMEN_CERRADO,
        [ahora, leaseSegundos, MENSAJE_EXAMEN_PUBLICADO],
      ),
    );
    const reencoladas = extraerFilas(
      await this.dataSource.query<unknown>(SQL_REENCOLAR, [
        ahora,
        leaseSegundos,
        maxIntentos,
      ]),
    );
    const agotadas = extraerFilas(
      await this.dataSource.query<unknown>(SQL_AGOTAR, [
        ahora,
        leaseSegundos,
        maxIntentos,
        MENSAJE_TIEMPO_AGOTADO,
      ]),
    );

    return {
      reencoladas: reencoladas.length,
      agotadas: agotadas.length,
      cerradas: cerradas.length,
    };
  }
}

function esTipoRespuesta(valor: string): valor is TipoRespuesta {
  return (TIPOS_RESPUESTA as readonly string[]).includes(valor);
}

function convertirNumero(
  valor: number | string | null | undefined,
): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  if (typeof valor !== 'string' || valor.trim().length === 0) {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function construirEnunciado(inciso: Inciso): string {
  const partes = [inciso.pregunta?.enunciado, inciso.enunciado_inciso]
    .filter((parte): parte is string => typeof parte === 'string')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  return [...new Set(partes)].join('\n');
}

function construirRespuestaEstudiante(
  respuestaTexto: string | null,
  opcionesMarcadas: OpcionMarcada[],
): string {
  const partes: string[] = [];
  const texto = respuestaTexto?.trim();

  if (texto) {
    partes.push(texto);
  }

  for (const marcada of opcionesMarcadas) {
    const opcion =
      marcada.opcion?.texto_opcion?.trim() || `opción ${marcada.nro_opcion}`;
    if (opcion) {
      partes.push(opcion);
    }
  }

  return partes.join(' | ');
}

function construirCriterio(
  solucion: SolucionInciso | null,
  referencia: IaSolucionReferencia | null,
  tipoRespuesta: string,
): {
  criterio: CriterioCorreccionIa;
  fuente: FuenteCriterioCorreccionIa;
} {
  const resuelto = resolverCriterio(tipoRespuesta, solucion, referencia);

  if (!resuelto) {
    throw new ErrorProcesamientoCorreccionIa(
      'SIN_CRITERIOS',
      'La propuesta ya no tiene criterios utilizables para corregir la respuesta.',
    );
  }

  return resuelto;
}

function textoDesdeContenido(contenido: unknown): string {
  if (typeof contenido === 'string') {
    return contenido.trim();
  }

  if (typeof contenido !== 'object' || contenido === null) {
    return '';
  }

  const partes: string[] = [];

  for (const [clave, valor] of Object.entries(
    contenido as Record<string, unknown>,
  )) {
    if (valor === null || valor === undefined) {
      continue;
    }

    const texto =
      typeof valor === 'string' ? valor.trim() : JSON.stringify(valor);

    if (typeof texto === 'string' && texto.trim().length > 0) {
      partes.push(`${clave}: ${texto.trim()}`);
    }
  }

  return partes.join('\n');
}


