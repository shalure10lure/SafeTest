/**
 * Reglas de la gestión académica escritas como funciones PURAS
 * (no usan base de datos): reciben datos y devuelven un resultado.
 * Por eso son fáciles de leer y de probar (ver gestion-academica.utils.spec.ts).
 *
 * Las usan: crear varias materias a la vez, eliminar materia/periodo y el
 * asistente "Configurar periodo".
 */

/* ------------------------------------------------------------------ */
/* Materias en lote                                                    */
/* ------------------------------------------------------------------ */

export interface FilaMateria {
  nombre: string;
  codigo: string;
  descripcion?: string;
}

export interface MateriaNormalizada {
  nombre: string;
  /** Siempre en mayúsculas, igual que al crear una materia individual. */
  codigo: string;
  descripcion: string | null;
}

/** Un problema en una fila concreta (para marcarla en pantalla). */
export interface ErrorFila {
  /** Posición de la fila, empezando en 0. */
  indice: number;
  campo: 'nombre' | 'codigo';
  mensaje: string;
}

const MAX_NOMBRE = 150;
const MAX_CODIGO = 20;
const MAX_DESCRIPCION = 255;

/**
 * Limpia y valida varias materias a la vez.
 *
 * Revisa que:
 *  - nombre y código no estén vacíos ni sean demasiado largos
 *  - el código no se repita dentro de la misma lista
 *  - el código no exista ya entre las materias del docente
 *
 * Devuelve las materias limpias y, si hay problemas, la lista de errores
 * por fila. Quien la llama decide: si hay errores, no guarda nada.
 */
export function normalizarMaterias(
  filas: FilaMateria[],
  codigosExistentes: Iterable<string>,
): { materias: MateriaNormalizada[]; errores: ErrorFila[] } {
  const existentes = new Set(
    [...codigosExistentes].map((codigo) => codigo.trim().toUpperCase()),
  );
  // Código -> número de fila donde apareció por primera vez
  const vistos = new Map<string, number>();

  const materias: MateriaNormalizada[] = [];
  const errores: ErrorFila[] = [];

  filas.forEach((fila, indice) => {
    const nombre = (fila.nombre ?? '').trim();
    const codigo = (fila.codigo ?? '').trim().toUpperCase();
    const descripcion = (fila.descripcion ?? '').trim();

    if (!nombre) {
      errores.push({ indice, campo: 'nombre', mensaje: 'El nombre es obligatorio' });
    } else if (nombre.length > MAX_NOMBRE) {
      errores.push({
        indice,
        campo: 'nombre',
        mensaje: `El nombre no puede superar ${MAX_NOMBRE} caracteres`,
      });
    }

    if (!codigo) {
      errores.push({ indice, campo: 'codigo', mensaje: 'El código es obligatorio' });
    } else if (codigo.length > MAX_CODIGO) {
      errores.push({
        indice,
        campo: 'codigo',
        mensaje: `El código no puede superar ${MAX_CODIGO} caracteres`,
      });
    } else if (existentes.has(codigo)) {
      errores.push({
        indice,
        campo: 'codigo',
        mensaje: `Ya tienes una materia con el código ${codigo}`,
      });
    } else if (vistos.has(codigo)) {
      errores.push({
        indice,
        campo: 'codigo',
        mensaje: `El código ${codigo} está repetido (también en la fila ${(vistos.get(codigo) as number) + 1})`,
      });
    } else {
      vistos.set(codigo, indice);
    }

    materias.push({
      nombre,
      codigo,
      descripcion: descripcion ? descripcion.slice(0, MAX_DESCRIPCION) : null,
    });
  });

  return { materias, errores };
}

/* ------------------------------------------------------------------ */
/* Paralelos en lote                                                   */
/* ------------------------------------------------------------------ */

const MAX_NOMBRE_PARALELO = 100;

/**
 * Limpia los nombres de paralelos de UNA materia ("Paralelo A", "B"...).
 * Quita espacios, ignora vacíos y avisa si hay nombres repetidos
 * (sin distinguir mayúsculas).
 */
export function normalizarNombresParalelos(nombres: string[]): {
  nombres: string[];
  errores: string[];
} {
  const limpios: string[] = [];
  const errores: string[] = [];
  const vistos = new Set<string>();

  for (const original of nombres) {
    const nombre = (original ?? '').trim();
    if (!nombre) continue;

    if (nombre.length > MAX_NOMBRE_PARALELO) {
      errores.push(
        `El nombre de paralelo "${nombre.slice(0, 20)}…" supera ${MAX_NOMBRE_PARALELO} caracteres`,
      );
      continue;
    }

    const clave = nombre.toLowerCase();
    if (vistos.has(clave)) {
      errores.push(`El paralelo "${nombre}" está repetido`);
      continue;
    }

    vistos.add(clave);
    limpios.push(nombre);
  }

  return { nombres: limpios, errores };
}

/* ------------------------------------------------------------------ */
/* Eliminar materia o periodo                                          */
/* ------------------------------------------------------------------ */

export type ConteoDependencias = Partial<
  Record<'paralelos' | 'evaluaciones' | 'temas' | 'materiales', number>
>;

const NOMBRES_DEPENDENCIA: Record<
  keyof ConteoDependencias,
  { singular: string; plural: string }
> = {
  paralelos: { singular: 'paralelo', plural: 'paralelos' },
  evaluaciones: { singular: 'evaluación', plural: 'evaluaciones' },
  temas: { singular: 'tema', plural: 'temas' },
  materiales: { singular: 'material académico', plural: 'materiales académicos' },
};

/** "2 paralelos", "1 evaluación"... */
function contar(cantidad: number, tipo: keyof ConteoDependencias): string {
  const nombre = NOMBRES_DEPENDENCIA[tipo];
  return `${cantidad} ${cantidad === 1 ? nombre.singular : nombre.plural}`;
}

/** ["a", "b", "c"] -> "a, b y c" */
function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * Si la materia/periodo tiene datos que dependen de él, devuelve el mensaje
 * que explica por qué NO se puede eliminar (y qué hacer en su lugar).
 * Devuelve null si se puede eliminar sin problema.
 */
export function mensajeBloqueoEliminacion(
  tipo: 'materia' | 'periodo',
  conteos: ConteoDependencias,
): string | null {
  const partes = (Object.keys(NOMBRES_DEPENDENCIA) as (keyof ConteoDependencias)[])
    .filter((clave) => (conteos[clave] ?? 0) > 0)
    .map((clave) => contar(conteos[clave] as number, clave));

  if (partes.length === 0) return null;

  const articulo = tipo === 'materia' ? 'la materia' : 'el periodo';
  const pronombre = tipo === 'materia' ? 'la' : 'lo';
  const desactivada = tipo === 'materia' ? 'desactivada' : 'desactivado';

  return (
    `No se puede eliminar ${articulo} porque tiene ${unirConY(partes)}. ` +
    `Elimina o reasigna esos datos primero, o ${pronombre} dejas ${desactivada} ` +
    `para que no se use más sin perder el historial.`
  );
}
