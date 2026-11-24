import type {
  DificultadIa,
  ErrorCorreccionRespuesta,
  PreguntaIa,
  ResultadoCorreccionRespuesta,
  ResultadoGeneracionIa,
  SolicitudCorreccionRespuesta,
  SolicitudGeneracionIa,
} from '../ai.types';
import type { AiProvider } from './ai.provider';

interface FakeAiProviderOptions {
  modelo: string | null;
}

interface PerfilDificultadFake {
  /** Enunciado base determinista; el tipo de pregunta añade su instrucción. */
  enunciado: (solicitud: SolicitudGeneracionIa, numero: number) => string;
  respuestaCorrecta: (numero: number) => string;
  segundaCorrecta: (numero: number) => string;
  respuestaIncorrecta: (numero: number) => string;
  solucionReferencia: (numero: number) => string;
  explicacion: string;
}

const SUFIJO_POR_TIPO: Record<SolicitudGeneracionIa['tipo_respuesta'], string> = {
  opcion_unica: 'Elige la opción correcta.',
  opcion_multiple: 'Selecciona todas las opciones correctas.',
  verdadero_falso: 'Indica si la afirmación es verdadera o falsa.',
  numerica: 'Calcula el valor numérico solicitado.',
  desarrollo: 'Explica y justifica tu respuesta.',
};

/**
 * Perfiles deterministas por dificultad.
 *
 * El fake no evalúa calidad pedagógica real, pero tampoco debe limitarse a
 * cambiar la etiqueta: cada nivel usa un tipo de tarea distinta para que las
 * pruebas del flujo reflejen la diferencia entre reconocer, aplicar y analizar.
 */
const PERFILES_DIFICULTAD: Record<DificultadIa, PerfilDificultadFake> = {
  facil: {
    enunciado: (solicitud, numero) =>
      `[Simulada fácil ${numero}] En ${solicitud.materia}, ¿cuál de las siguientes opciones define un concepto básico de ${solicitud.tema}?`,
    respuestaCorrecta: (numero) => `Definición correcta del concepto ${numero}`,
    segundaCorrecta: (numero) =>
      `Segunda definición correcta del concepto ${numero}`,
    respuestaIncorrecta: (numero) => `Concepto ajeno al tema ${numero}`,
    solucionReferencia: (numero) =>
      `Menciona la definición básica del concepto ${numero} presente en el material.`,
    explicacion:
      'Pregunta simulada de nivel fácil (reconocimiento directo). El proveedor fake solo prueba el flujo, no la calidad pedagógica real.',
  },
  media: {
    enunciado: (solicitud, numero) =>
      `[Simulada media ${numero}] En ${solicitud.materia}, aplica lo aprendido sobre ${solicitud.tema} a la situación práctica ${numero}.`,
    respuestaCorrecta: (numero) =>
      `Aplicación correcta del concepto ${numero} al caso`,
    segundaCorrecta: (numero) =>
      `Segunda aplicación correcta del concepto ${numero} al caso`,
    respuestaIncorrecta: (numero) =>
      `Aplicación parcial que omite una condición del caso ${numero}`,
    solucionReferencia: (numero) =>
      `Explica cómo aplicar el concepto al caso ${numero} y por qué la alternativa elegida cumple las condiciones.`,
    explicacion:
      'Pregunta simulada de nivel medio (aplicación a un caso práctico). El proveedor fake solo prueba el flujo, no la calidad pedagógica real.',
  },
  dificil: {
    enunciado: (solicitud, numero) =>
      `[Simulada difícil ${numero}] Analiza el escenario ${numero} de ${solicitud.materia} sobre ${solicitud.tema}, compara las alternativas y determina qué conclusión se sostiene tras varios pasos de razonamiento.`,
    respuestaCorrecta: (numero) =>
      `Conclusión justificada tras analizar el caso ${numero}`,
    segundaCorrecta: (numero) =>
      `Conclusión alternativa válida que integra otra relación del caso ${numero}`,
    respuestaIncorrecta: (numero) =>
      `Conclusión plausible que ignora una relación clave del caso ${numero}`,
    solucionReferencia: (numero) =>
      `Describe los pasos de análisis del caso ${numero}, compara las alternativas y justifica la conclusión.`,
    explicacion:
      'Pregunta simulada de nivel difícil (análisis con varios pasos y distractores cercanos). El proveedor fake solo prueba el flujo, no la calidad pedagógica real.',
  },
};

/**
 * Proveedor simulado para desarrollo, pruebas y CI. No usa red ni consume
 * créditos, y devuelve propuestas deterministas que cumplen las reglas del
 * banco para cada tipo de pregunta.
 *
 * IMPORTANTE: sirve para probar el flujo (worker, validación, revisión e
 * inserción), no para evaluar la calidad real de Gemini. Sus preguntas son
 * plantillas que cambian según la dificultad, no una generación pedagógica.
 */
export class FakeAiProvider implements AiProvider {
  constructor(private readonly options: FakeAiProviderOptions) {}

  async generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa> {
    const cantidad = Math.max(0, Math.floor(solicitud.cantidad));

    const preguntas = Array.from({ length: cantidad }, (_, indice) =>
      this.crearPregunta(solicitud, indice + 1),
    );

    return {
      preguntas,
      proveedor: 'fake',
      modelo: this.options.modelo ?? 'fake',
      tokens: {
        entrada: 250 * cantidad,
        salida: 120 * cantidad,
        total: 370 * cantidad,
      },
    };
  }

  /**
   * Corrección determinista para probar el flujo completo sin red ni coste.
   *
   * Con un `valor_correcto` numérico compara el valor con la tolerancia. Si no
   * lo hay, usa la rúbrica o la solución de referencia y calcula una
   * coincidencia léxica estable. Nunca usa azar ni fechas, así que la misma
   * solicitud produce siempre el mismo resultado.
   */
  async corregirRespuesta(
    solicitud: SolicitudCorreccionRespuesta,
  ): Promise<ResultadoCorreccionRespuesta> {
    const maximo = puntajeMaximoValido(solicitud.puntaje_max);
    const respuesta = solicitud.respuesta_estudiante.trim();
    const referencia = textoDeReferencia(solicitud);

    if (respuesta.length === 0) {
      return this.construirResultado(
        solicitud,
        0,
        'Incorrecta',
        'La respuesta del estudiante está vacía.',
        [
          {
            tipo: 'respuesta_vacia',
            descripcion: 'No se recibió una respuesta para corregir.',
          },
        ],
        1,
      );
    }

    const valorCorrecto = solicitud.criterio.valor_correcto;
    if (typeof valorCorrecto === 'number' && Number.isFinite(valorCorrecto)) {
      const tolerancia = toleranciaValida(solicitud.criterio.tolerancia);
      const valorEstudiante = leerNumero(respuesta);

      if (valorEstudiante !== null) {
        if (Math.abs(valorEstudiante - valorCorrecto) <= tolerancia + 1e-9) {
          return this.construirResultado(
            solicitud,
            maximo,
            'Correcta',
            `El valor coincide con la solución esperada dentro de la tolerancia de ${tolerancia}.`,
            [],
            1,
          );
        }

        return this.construirResultado(
          solicitud,
          0,
          'Incorrecta',
          `El valor difiere de la solución esperada en más de la tolerancia de ${tolerancia}.`,
          [
            {
              tipo: 'calculo',
              descripcion:
                'El valor no coincide con la solución esperada dentro de la tolerancia.',
            },
          ],
          0.9,
        );
      }

      if (referencia.length === 0) {
        return this.construirResultado(
          solicitud,
          0,
          'Incorrecta',
          'Se esperaba una respuesta numérica y el criterio no incluye rúbrica.',
          [
            {
              tipo: 'formato',
              descripcion: 'La respuesta no es un valor numérico.',
            },
          ],
          0.95,
        );
      }
    }

    if (referencia.length === 0) {
      return this.construirResultado(
        solicitud,
        0,
        'Incorrecta',
        'El criterio no contiene texto suficiente para comparar la respuesta.',
        [
          {
            tipo: 'criterio',
            descripcion: 'No hay rúbrica ni solución de referencia utilizable.',
          },
        ],
        0.5,
      );
    }

    const coincidencia = calcularCoincidencia(respuesta, referencia);
    const puntaje = maximo * coincidencia;
    const valoracion =
      coincidencia >= 0.85
        ? 'Correcta'
        : coincidencia >= 0.4
          ? 'Parcialmente correcta'
          : 'Incorrecta';
    const errores: ErrorCorreccionRespuesta[] =
      coincidencia >= 0.85
        ? []
        : [
            {
              tipo: 'contenido',
              descripcion:
                'La respuesta no cubre todos los elementos esperados por el criterio.',
            },
          ];

    return this.construirResultado(
      solicitud,
      puntaje,
      valoracion,
      `La coincidencia con el criterio es del ${Math.round(coincidencia * 100)} %.`,
      errores,
      0.5 + coincidencia * 0.5,
    );
  }

  private construirResultado(
    solicitud: SolicitudCorreccionRespuesta,
    puntaje: number,
    valoracion: string,
    explicacion: string,
    errores: ErrorCorreccionRespuesta[],
    confianza: number,
  ): ResultadoCorreccionRespuesta {
    const maximo = puntajeMaximoValido(solicitud.puntaje_max);
    const puntajeRecortado = Math.min(Math.max(puntaje, 0), maximo);

    return {
      puntaje_sugerido: redondearDosDecimales(puntajeRecortado),
      valoracion,
      explicacion: `${explicacion} El proveedor fake solo prueba el flujo, no la calidad pedagógica real.`,
      errores,
      confianza: redondearDosDecimales(Math.min(Math.max(confianza, 0), 1)),
      proveedor: 'fake',
      modelo: this.options.modelo ?? 'fake',
    };
  }

  private crearPregunta(
    solicitud: SolicitudGeneracionIa,
    numero: number,
  ): PreguntaIa {
    const perfil = PERFILES_DIFICULTAD[solicitud.dificultad];
    const base: PreguntaIa = {
      enunciado: `${perfil.enunciado(solicitud, numero)} ${SUFIJO_POR_TIPO[solicitud.tipo_respuesta]}`,
      tipo_respuesta: solicitud.tipo_respuesta,
      dificultad: solicitud.dificultad,
      explicacion: perfil.explicacion,
    };

    switch (solicitud.tipo_respuesta) {
      case 'opcion_unica':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: perfil.respuestaCorrecta(numero),
              es_correcta: true,
            },
            {
              texto_opcion: perfil.respuestaIncorrecta(numero),
              es_correcta: false,
            },
          ],
        };

      case 'opcion_multiple':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: perfil.respuestaCorrecta(numero),
              es_correcta: true,
            },
            {
              texto_opcion: perfil.segundaCorrecta(numero),
              es_correcta: true,
            },
            {
              texto_opcion: perfil.respuestaIncorrecta(numero),
              es_correcta: false,
            },
          ],
        };

      case 'verdadero_falso':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: 'Verdadero',
              es_correcta: numero % 2 === 1,
            },
            {
              texto_opcion: 'Falso',
              es_correcta: numero % 2 === 0,
            },
          ],
        };

      case 'numerica':
        return {
          ...base,
          valor_correcto: numero * 10,
          tolerancia: 0.5,
        };

      case 'desarrollo':
        return {
          ...base,
          solucion_referencia: perfil.solucionReferencia(numero),
        };
    }

    throw new Error(
      `Tipo de pregunta no soportado por el proveedor fake: ${solicitud.tipo_respuesta}`,
    );
  }
}

function puntajeMaximoValido(puntajeMaximo: number): number {
  return Number.isFinite(puntajeMaximo) && puntajeMaximo > 0
    ? puntajeMaximo
    : 0;
}

function toleranciaValida(tolerancia: number | undefined): number {
  return typeof tolerancia === 'number' &&
    Number.isFinite(tolerancia) &&
    tolerancia >= 0
    ? tolerancia
    : 0;
}

function redondearDosDecimales(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function leerNumero(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (normalizado.length === 0) {
    return null;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function textoDeReferencia(solicitud: SolicitudCorreccionRespuesta): string {
  const partes = [
    solicitud.criterio.rubrica,
    solicitud.criterio.solucion_referencia,
  ]
    .filter((parte): parte is string => typeof parte === 'string')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  if (partes.length > 0) {
    return partes.join('\n');
  }

  const valorCorrecto = solicitud.criterio.valor_correcto;
  return typeof valorCorrecto === 'number' && Number.isFinite(valorCorrecto)
    ? String(valorCorrecto)
    : '';
}

function calcularCoincidencia(respuesta: string, referencia: string): number {
  const palabrasRespuesta = palabrasSignificativas(respuesta);
  const palabrasReferencia = palabrasSignificativas(referencia);

  if (palabrasReferencia.size === 0) {
    return 0;
  }

  const respuestaNormalizada = normalizarTexto(respuesta);
  const referenciaNormalizada = normalizarTexto(referencia);
  if (
    referenciaNormalizada.length > 0 &&
    (respuestaNormalizada.includes(referenciaNormalizada) ||
      referenciaNormalizada.includes(respuestaNormalizada))
  ) {
    return 1;
  }

  let coincidencias = 0;
  for (const palabra of palabrasReferencia) {
    if (palabrasRespuesta.has(palabra)) {
      coincidencias += 1;
    }
  }

  return Math.min(Math.max(coincidencias / palabrasReferencia.size, 0), 1);
}

function palabrasSignificativas(texto: string): Set<string> {
  return new Set(
    normalizarTexto(texto)
      .split(' ')
      .filter((palabra) => palabra.length >= 4),
  );
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
