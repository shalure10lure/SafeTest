import { BadRequestException } from '@nestjs/common';

import {
  CreatePreguntaDto,
  type OpcionPreguntaDto,
  type TipoRespuesta,
} from '../entity/dtos/create-pregunta.dto';

/** Configuración de respuesta ya validada, lista para guardarse. */
export interface ConfiguracionRespuesta {
  opciones: OpcionPreguntaDto[];
  valorCorrecto: number | null;
  tolerancia: number | null;
  solucionReferencia: string | null;
}

/**
 * Campos mínimos para validar la configuración. Se comparte entre la
 * creación manual y la aceptación de propuestas generadas por IA.
 */
export type ConfiguracionRespuestaEntrada = Pick<
  CreatePreguntaDto,
  | 'tipo_respuesta'
  | 'opciones'
  | 'valor_correcto'
  | 'tolerancia'
  | 'solucion_referencia'
>;

/** Normaliza el texto para detectar opciones repetidas. */
export function normalizarTextoOpcion(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

/**
 * Valida la configuración de respuesta según el tipo y devuelve los datos
 * normalizados que se guardarán en las tablas de solución.
 */
export function validarConfiguracionRespuesta(
  dto: ConfiguracionRespuestaEntrada,
): ConfiguracionRespuesta {
  const tipo: TipoRespuesta = dto.tipo_respuesta;
  const opciones = (dto.opciones ?? []).map((opcion) => ({
    ...opcion,
    texto_opcion: opcion.texto_opcion?.trim() ?? '',
  }));

  if (tipo === 'opcion_unica' || tipo === 'opcion_multiple') {
    if (opciones.length < 2) {
      throw new BadRequestException(
        'Agrega al menos 2 opciones con texto',
      );
    }

    if (opciones.some((opcion) => !opcion.texto_opcion)) {
      throw new BadRequestException(
        'Completa el texto de todas las opciones o elimina las que no uses',
      );
    }

    const textos = opciones.map((opcion) =>
      normalizarTextoOpcion(opcion.texto_opcion),
    );

    if (new Set(textos).size !== textos.length) {
      throw new BadRequestException(
        'Las opciones no pueden repetirse',
      );
    }

    const correctas = opciones.filter(
      (opcion) => opcion.es_correcta,
    ).length;

    if (tipo === 'opcion_unica' && correctas !== 1) {
      throw new BadRequestException(
        'Marca exactamente una respuesta correcta',
      );
    }

    if (tipo === 'opcion_multiple' && correctas < 1) {
      throw new BadRequestException(
        'Marca al menos una respuesta correcta',
      );
    }

    return {
      opciones,
      valorCorrecto: null,
      tolerancia: null,
      solucionReferencia: null,
    };
  }

  if (tipo === 'verdadero_falso') {
    if (opciones.length !== 2) {
      throw new BadRequestException(
        'Verdadero/Falso debe tener dos opciones',
      );
    }

    const textos = opciones.map((opcion) =>
      normalizarTextoOpcion(opcion.texto_opcion),
    );

    if (
      new Set(textos).size !== 2 ||
      !textos.includes('verdadero') ||
      !textos.includes('falso')
    ) {
      throw new BadRequestException(
        'Las opciones de Verdadero/Falso deben ser Verdadero y Falso',
      );
    }

    const correctas = opciones.filter(
      (opcion) => opcion.es_correcta,
    ).length;

    if (correctas !== 1) {
      throw new BadRequestException(
        'Selecciona una única respuesta correcta',
      );
    }

    return {
      opciones,
      valorCorrecto: null,
      tolerancia: null,
      solucionReferencia: null,
    };
  }

  if (tipo === 'numerica') {
    if (
      dto.valor_correcto === undefined ||
      dto.valor_correcto === null ||
      !Number.isFinite(dto.valor_correcto)
    ) {
      throw new BadRequestException(
        'Ingresa un valor numérico válido',
      );
    }

    const tolerancia = dto.tolerancia ?? 0;

    if (!Number.isFinite(tolerancia) || tolerancia < 0) {
      throw new BadRequestException(
        'La tolerancia debe ser un número mayor o igual que 0',
      );
    }

    return {
      opciones: [],
      valorCorrecto: dto.valor_correcto,
      tolerancia,
      solucionReferencia: null,
    };
  }

  if (tipo === 'desarrollo') {
    return {
      opciones: [],
      valorCorrecto: null,
      tolerancia: null,
      solucionReferencia: dto.solucion_referencia?.trim() || null,
    };
  }

  throw new BadRequestException('El tipo de pregunta no es válido');
}
