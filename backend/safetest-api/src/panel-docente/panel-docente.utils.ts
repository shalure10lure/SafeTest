/**
 * Reglas de negocio del panel del docente, escritas como funciones PURAS
 * (sin base de datos) para que sean fáciles de leer y de probar.
 */

export type EstadoEvaluacion =
  | 'disponible'
  | 'borrador'
  | 'pendiente'
  | 'finalizada';

export type PasoBorrador = 1 | 2 | 3 | 4 | 5;

export interface TiposPreguntaContados {
  seleccion_multiple: number;
  verdadero_falso: number;
  respuesta_abierta: number;
  respuesta_numerica: number;
  varios_incisos: number;
}

/**
 * Estado que ve el docente en "Mis evaluaciones":
 *  - borrador   : todavía no se publicó
 *  - pendiente  : publicada pero aún no abre (disponible_desde en el futuro)
 *  - disponible : publicada y abierta ahora mismo
 *  - finalizada : ya pasó disponible_hasta
 */
export function estadoEvaluacion(
  examen: {
    estado: string;
    disponible_desde: Date | string | null;
    disponible_hasta: Date | string | null;
  },
  ahora: Date = new Date(),
): EstadoEvaluacion {
  if (examen.estado !== 'publicado') return 'borrador';

  const desde = examen.disponible_desde
    ? new Date(examen.disponible_desde)
    : null;
  const hasta = examen.disponible_hasta
    ? new Date(examen.disponible_hasta)
    : null;

  if (hasta && hasta.getTime() <= ahora.getTime()) return 'finalizada';
  if (desde && desde.getTime() > ahora.getTime()) return 'pendiente';

  return 'disponible';
}

/**
 * Averigua en qué paso del asistente "Crear evaluación" se quedó un borrador:
 * el primer paso que todavía no está completo.
 *
 *  1 Información · 2 Preguntas · 3 Configuración · 4 Asignación · 5 Resumen
 */
export function calcularPasoBorrador(examen: {
  titulo: string | null;
  n_preguntas: number;
  n_criterios: number;
  duracion_min: number | null;
  disponible_desde: Date | string | null;
  disponible_hasta: Date | string | null;
  puntaje_total: string | null;
  n_paralelos: number;
  n_estudiantes_seleccionados: number;
}): { paso: PasoBorrador; descripcion: string } {
  const infoCompleta = !!examen.titulo && examen.titulo.trim() !== '';
  if (!infoCompleta) {
    return { paso: 1, descripcion: 'completar la información general' };
  }

  // Modo manual guarda preguntas; modo aleatorio guarda criterios por tema.
  const tienePreguntas = examen.n_preguntas > 0 || examen.n_criterios > 0;
  if (!tienePreguntas) {
    return { paso: 2, descripcion: 'agregar preguntas a la evaluación' };
  }

  const configurada =
    examen.duracion_min !== null &&
    examen.disponible_desde !== null &&
    examen.disponible_hasta !== null &&
    examen.puntaje_total !== null;
  if (!configurada) {
    return { paso: 3, descripcion: 'configurar tiempo, fechas y puntaje' };
  }

  const asignada =
    examen.n_paralelos > 0 || examen.n_estudiantes_seleccionados > 0;
  if (!asignada) {
    return { paso: 4, descripcion: 'asignar paralelos o estudiantes' };
  }

  return { paso: 5, descripcion: 'revisar el resumen y publicar' };
}

/**
 * Agrupa los tipos reales de `inciso.tipo_respuesta` en las 4 categorías
 * que muestra el inicio (más "varios incisos" para las preguntas mixtas).
 */
export function contarTiposPregunta(tipos: string[]): TiposPreguntaContados {
  const conteo: TiposPreguntaContados = {
    seleccion_multiple: 0,
    verdadero_falso: 0,
    respuesta_abierta: 0,
    respuesta_numerica: 0,
    varios_incisos: 0,
  };

  for (const tipo of tipos) {
    switch (tipo) {
      case 'opcion_unica':
      case 'opcion_multiple':
        conteo.seleccion_multiple += 1;
        break;
      case 'verdadero_falso':
        conteo.verdadero_falso += 1;
        break;
      case 'desarrollo':
      case 'texto_corto':
        conteo.respuesta_abierta += 1;
        break;
      case 'numerica':
        conteo.respuesta_numerica += 1;
        break;
      default:
        // 'mixto' y cualquier tipo heredado desconocido
        conteo.varios_incisos += 1;
    }
  }

  return conteo;
}

/** Fecha "YYYY-MM-DD" en hora de Bolivia (evita desfases por zona horaria). */
export function fechaBolivia(valor: Date | string | null): string | null {
  if (!valor) return null;

  // Una fecha sin hora ("2026-09-20") ya es el día correcto: no la movemos
  // de zona horaria (si lo hiciéramos podría quedar en el día anterior).
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;

  // 'en-CA' formatea como YYYY-MM-DD.
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}
