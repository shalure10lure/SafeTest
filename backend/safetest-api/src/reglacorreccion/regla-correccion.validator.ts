import { BadRequestException } from '@nestjs/common';

import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';

export type ParametrosRegla = Record<string, unknown>;

/**
 * Claves que pertenecen a la solución de una pregunta concreta y que, por
 * tanto, nunca deben viajar dentro de la configuración de una regla.
 * Los valores correctos, tolerancias y rúbricas viven en solucion_texto /
 * solucion_inciso y se validan con `validarConfiguracionRespuesta`.
 */
const CLAVES_DE_SOLUCION = [
  'valor_correcto',
  'tolerancia',
  'rubrica',
  'rúbrica',
  'solucion_referencia',
  'respuesta_correcta',
  'opciones',
] as const;

/** Campos que administra el servidor y que nunca vienen en `parametros`. */
const CLAVES_DEL_SERVIDOR = ['docente_id', 'regla_id'] as const;

/** Claves de configuración admitidas para cada tipo de pregunta. */
const CLAVES_PERMITIDAS: Record<TipoRespuesta, readonly string[]> = {
  opcion_unica: ['estrategia'],
  opcion_multiple: ['estrategia', 'puntaje_parcial', 'penalizar_incorrectas'],
  verdadero_falso: ['estrategia'],
  numerica: ['estrategia', 'redondeo_decimales'],
  desarrollo: ['estrategia'],
};

const ESTRATEGIA_AUTOMATICA = 'automatica';
const ESTRATEGIA_MANUAL_RUBRICA = 'manual_rubrica';

function esObjetoPlano(valor: unknown): valor is ParametrosRegla {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor) as unknown;

  return prototipo === Object.prototype || prototipo === null;
}

/**
 * Valida y normaliza la configuración de una regla según el tipo de pregunta.
 *
 * No acepta datos de solución: la regla describe cómo corregir, no cuál es la
 * respuesta correcta. Para `desarrollo` solo se admite la evaluación manual
 * mediante rúbrica; cualquier intento de autocorrección se rechaza.
 */
export function validarParametrosRegla(
  tipo: TipoRespuesta,
  parametros: unknown,
): ParametrosRegla {
  if (!Object.prototype.hasOwnProperty.call(CLAVES_PERMITIDAS, tipo)) {
    throw new BadRequestException('El tipo de pregunta no es válido');
  }

  if (!esObjetoPlano(parametros)) {
    throw new BadRequestException(
      'Los parámetros de la regla deben ser un objeto JSON',
    );
  }

  const claves = Object.keys(parametros);

  const clavesDeSolucion = claves.filter((clave) =>
    (CLAVES_DE_SOLUCION as readonly string[]).includes(clave),
  );
  if (clavesDeSolucion.length > 0) {
    throw new BadRequestException(
      `Los parámetros no pueden incluir datos de la solución: ${clavesDeSolucion.join(', ')}`,
    );
  }

  const clavesDelServidor = claves.filter((clave) =>
    (CLAVES_DEL_SERVIDOR as readonly string[]).includes(clave),
  );
  if (clavesDelServidor.length > 0) {
    throw new BadRequestException(
      `Los parámetros no pueden incluir campos del servidor: ${clavesDelServidor.join(', ')}`,
    );
  }

  const permitidas = CLAVES_PERMITIDAS[tipo];
  const noPermitidas = claves.filter((clave) => !permitidas.includes(clave));
  if (noPermitidas.length > 0) {
    throw new BadRequestException(
      `El tipo ${tipo} no admite los parámetros: ${noPermitidas.join(', ')}`,
    );
  }

  return normalizarParametros(tipo, parametros);
}

function normalizarParametros(
  tipo: TipoRespuesta,
  parametros: ParametrosRegla,
): ParametrosRegla {
  const normalizado: ParametrosRegla = {};

  if (tipo === 'desarrollo') {
    if (parametros.estrategia !== ESTRATEGIA_MANUAL_RUBRICA) {
      throw new BadRequestException(
        'La regla de desarrollo solo admite evaluación manual mediante rúbrica',
      );
    }

    normalizado.estrategia = ESTRATEGIA_MANUAL_RUBRICA;
    return normalizado;
  }

  if (
    parametros.estrategia !== undefined &&
    parametros.estrategia !== ESTRATEGIA_AUTOMATICA
  ) {
    throw new BadRequestException(
      `El tipo ${tipo} solo admite la estrategia ${ESTRATEGIA_AUTOMATICA}`,
    );
  }

  if (parametros.estrategia !== undefined) {
    normalizado.estrategia = ESTRATEGIA_AUTOMATICA;
  }

  if (tipo === 'opcion_multiple') {
    for (const clave of ['puntaje_parcial', 'penalizar_incorrectas']) {
      if (parametros[clave] !== undefined) {
        normalizado[clave] = validarBooleano(clave, parametros[clave]);
      }
    }
  }

  if (tipo === 'numerica' && parametros.redondeo_decimales !== undefined) {
    normalizado.redondeo_decimales = validarRedondeo(
      parametros.redondeo_decimales,
    );
  }

  return normalizado;
}

function validarBooleano(clave: string, valor: unknown): boolean {
  if (typeof valor !== 'boolean') {
    throw new BadRequestException(`El parámetro ${clave} debe ser booleano`);
  }

  return valor;
}

function validarRedondeo(valor: unknown): number {
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor < 0 ||
    valor > 6
  ) {
    throw new BadRequestException(
      'El parámetro redondeo_decimales debe ser un entero entre 0 y 6',
    );
  }

  return valor;
}
