import { Logger } from '@nestjs/common';

import {
  ErrorConfiguracionIa,
  type IaConfig,
} from '../../config/ia.config';
import type {
  ResultadoGeneracionIa,
  SolicitudGeneracionIa,
} from '../ai.types';
import { ErrorGeneracionIa } from '../ia.errors';
import type { AiProvider } from './ai.provider';
import type {
  ClienteGemini,
  PeticionGemini,
  RespuestaGemini,
} from './gemini-client';
import {
  construirEsquemaRespuesta,
  construirPrompt,
  INSTRUCCION_SISTEMA,
} from './gemini-prompt';
import { validarRespuestaGemini } from './gemini-respuesta';

interface GeminiAiProviderOptions {
  config: IaConfig;
  cliente: ClienteGemini;
}

const PROVEEDOR = 'gemini';
const MAX_LONGITUD_MENSAJE = 200;
const PATRON_CLAVE = /AIza[0-9A-Za-z_-]{10,}/g;

/**
 * Proveedor real sobre la Google Gemini API.
 *
 * Envía el material con salida JSON estructurada, valida cada propuesta con
 * las reglas del banco y traduce los fallos del SDK a errores de dominio sin
 * exponer credenciales ni el contenido de los materiales.
 */
export class GeminiAiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);

  constructor(private readonly options: GeminiAiProviderOptions) {}

  async generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa> {
    const config = this.options.config;
    const modelo = config.modelo;

    if (solicitud.materiales.length === 0) {
      throw new ErrorGeneracionIa(
        'materiales_no_disponibles',
        'Selecciona al menos un material autorizado con texto extraído.',
      );
    }

    if (!modelo) {
      throw new ErrorConfiguracionIa([
        'GEMINI_MODEL es obligatorio para usar el proveedor "gemini".',
      ]);
    }

    const respuesta = await this.solicitarGeneracion(solicitud, modelo);

    if (respuesta.motivoFinalizacion === 'MAX_TOKENS') {
      throw new ErrorGeneracionIa(
        'respuesta_invalida',
        'La respuesta del proveedor superó el límite de tokens de salida (GEMINI_MAX_OUTPUT_TOKENS).',
      );
    }

    if (!respuesta.texto) {
      throw new ErrorGeneracionIa(
        'respuesta_invalida',
        respuesta.bloqueo
          ? `El proveedor bloqueó la respuesta por filtros de contenido (${respuesta.bloqueo}).`
          : 'El proveedor no devolvió contenido para la solicitud.',
      );
    }

    const { preguntas, descartadas } = validarRespuestaGemini({
      texto: respuesta.texto,
      tipoRespuesta: solicitud.tipo_respuesta,
      cantidad: solicitud.cantidad,
      dificultad: solicitud.dificultad,
    });

    if (descartadas > 0) {
      this.logger.warn(
        `Se descartaron ${descartadas} propuesta(s) de Gemini por no cumplir las reglas del banco.`,
      );
    }

    if (preguntas.length === 0) {
      throw new ErrorGeneracionIa(
        descartadas > 0 ? 'respuesta_invalida' : 'material_insuficiente',
        descartadas > 0
          ? 'El proveedor no devolvió propuestas válidas para el tipo de pregunta solicitado.'
          : 'Los materiales no contienen información suficiente para generar preguntas.',
      );
    }

    if (preguntas.length < solicitud.cantidad) {
      throw new ErrorGeneracionIa(
        'respuesta_invalida',
        'El proveedor devolvió menos propuestas válidas que las solicitadas.',
      );
    }

    this.logger.debug(
      `Gemini devolvió ${preguntas.length} propuesta(s) válida(s) con ${respuesta.tokens.total ?? '?'} tokens.`,
    );

    return {
      preguntas,
      proveedor: PROVEEDOR,
      modelo,
      tokens: respuesta.tokens,
    };
  }

  private async solicitarGeneracion(
    solicitud: SolicitudGeneracionIa,
    modelo: string,
  ): Promise<RespuestaGemini> {
    const config = this.options.config;
    const peticion: PeticionGemini = {
      modelo,
      contenido: construirPrompt(solicitud, {
        maxMateriales: config.maxMateriales,
        maxCaracteresTotales: config.maxCaracteresTotales,
      }),
      instruccionSistema: INSTRUCCION_SISTEMA,
      esquemaJson: construirEsquemaRespuesta(),
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
      senalAborto: AbortSignal.timeout(config.timeoutMs),
    };

    try {
      return await this.options.cliente.generarContenido(peticion);
    } catch (error) {
      throw this.mapearError(error);
    }
  }

  private mapearError(error: unknown): ErrorGeneracionIa {
    if (error instanceof ErrorGeneracionIa) {
      return error;
    }

    if (esTimeout(error)) {
      return new ErrorGeneracionIa(
        'timeout',
        'La generación superó el tiempo máximo configurado (GEMINI_TIMEOUT_MS).',
        { reintentable: true },
      );
    }

    const estado = leerEstadoHttp(error);

    if (estado === 429) {
      return new ErrorGeneracionIa(
        'cuota',
        'Se alcanzó el límite de solicitudes o la cuota de Gemini. Intenta de nuevo más tarde.',
        { estadoHttp: estado, reintentable: true },
      );
    }

    if (estado === 401 || estado === 403) {
      return new ErrorGeneracionIa(
        'autenticacion',
        'La credencial de Gemini no es válida o no tiene permisos para el modelo configurado.',
        { estadoHttp: estado },
      );
    }

    if (estado === 404) {
      return new ErrorGeneracionIa(
        'modelo_no_disponible',
        'El modelo Gemini configurado no está disponible. Verifica GEMINI_MODEL.',
        { estadoHttp: estado },
      );
    }

    if (estado !== null) {
      return new ErrorGeneracionIa(
        'proveedor',
        `Gemini devolvió un error (HTTP ${estado}): ${describirError(error)}`,
        { estadoHttp: estado, reintentable: estado >= 500 },
      );
    }

    return new ErrorGeneracionIa(
      'proveedor',
      `No fue posible comunicarse con Gemini: ${describirError(error)}`,
    );
  }
}

function esTimeout(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { name, code, message } = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
  };

  if (name === 'AbortError' || name === 'TimeoutError') {
    return true;
  }

  if (
    typeof code === 'string' &&
    ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(
      code,
    )
  ) {
    return true;
  }

  return typeof message === 'string' && /timed?\s?out|abort/i.test(message);
}

function leerEstadoHttp(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const { status } = error as { status?: unknown };

  return typeof status === 'number' && Number.isInteger(status)
    ? status
    : null;
}

/** Recorta el mensaje y elimina cualquier rastro de credencial. */
function describirError(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : '';

  return (
    mensaje
      .replace(PATRON_CLAVE, '[clave-oculta]')
      .slice(0, MAX_LONGITUD_MENSAJE)
      .trim() || 'error desconocido'
  );
}
