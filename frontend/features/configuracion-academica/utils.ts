import type {
    ConfigurarPeriodoPayload,
    DatosPeriodo,
    EstadoAsistente,
    FilaMateriaNueva,
} from './types';

/**
 * Funciones PURAS del asistente (no usan React ni el servidor).
 * Son fáciles de leer y están probadas en utils.test.tsx.
 */

/* ------------------------------------------------------------------ */
/* Códigos y listas de materias                                        */
/* ------------------------------------------------------------------ */

/** Palabras que no aportan a una sigla: "Teoría de la Computación" -> TC */
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a']);

/** Quita tildes: "Álgebra" -> "Algebra" */
function sinTildes(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Propone un código a partir del nombre usando las iniciales.
 *   "Investigación Operativa" -> "IO"
 *   "Cálculo I"               -> "CI"
 * Si el código ya está en uso se le agrega un número: "IO2", "IO3"...
 */
export function sugerirCodigo(nombre: string, usados: Iterable<string> = []): string {
    const ocupados = new Set([...usados].map((codigo) => codigo.trim().toUpperCase()));

    const iniciales = sinTildes(nombre)
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .filter((palabra) => !PALABRAS_VACIAS.has(palabra.toLowerCase()))
        .map((palabra) =>
            // Números romanos y números se conservan completos: "II", "2"
            /^([ivx]+|\d+)$/i.test(palabra)
                ? palabra.toUpperCase()
                : palabra[0].toUpperCase(),
        )
        .join('')
        .slice(0, 6);

    const base = iniciales.length >= 2 ? iniciales : (iniciales + 'MAT').slice(0, 3);

    if (!ocupados.has(base)) return base;

    let numero = 2;
    while (ocupados.has(`${base}${numero}`)) numero += 1;
    return `${base}${numero}`;
}

/**
 * Convierte texto pegado (por ejemplo desde Excel) en filas de materias.
 * Una materia por línea con el formato "Nombre; CÓDIGO".
 * El separador puede ser punto y coma, tabulación o coma, y el código es
 * opcional (se sugiere a partir del nombre).
 */
export function parsearListaMaterias(
    texto: string,
    codigosUsados: Iterable<string> = [],
): { nombre: string; codigo: string }[] {
    const usados = new Set([...codigosUsados].map((c) => c.trim().toUpperCase()));
    const filas: { nombre: string; codigo: string }[] = [];

    for (const linea of texto.split(/\r?\n/)) {
        const limpia = linea.trim();
        if (!limpia) continue;

        // Usa el primer separador que aparezca, en este orden de preferencia
        const separador = ['\t', ';', ','].find((s) => limpia.includes(s));
        const partes = separador ? limpia.split(separador) : [limpia];

        const nombre = partes[0].trim();
        if (!nombre) continue;

        let codigo = (partes[1] ?? '').trim().toUpperCase();
        if (!codigo) codigo = sugerirCodigo(nombre, usados);

        usados.add(codigo);
        filas.push({ nombre, codigo });
    }

    return filas;
}

/* ------------------------------------------------------------------ */
/* Paralelos                                                           */
/* ------------------------------------------------------------------ */

const LETRAS = 'ABCDEFGHIJKLMNOPQRST';

/**
 * Genera los siguientes nombres de paralelo que todavía no existen:
 * generarNombresParalelos(2, ['Paralelo A']) -> ['Paralelo B', 'Paralelo C']
 */
export function generarNombresParalelos(cantidad: number, existentes: string[]): string[] {
    const ocupados = new Set(existentes.map((nombre) => nombre.trim().toLowerCase()));
    const nuevos: string[] = [];

    for (const letra of LETRAS) {
        if (nuevos.length >= cantidad) break;

        const nombre = `Paralelo ${letra}`;
        if (!ocupados.has(nombre.toLowerCase())) nuevos.push(nombre);
    }

    return nuevos;
}

/** pluralizar(2, 'paralelo', 'paralelos') -> "2 paralelos" */
export function pluralizar(cantidad: number, singular: string, plural: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** "e-5" para una materia existente, "n-abc" para una nueva. */
export const claveExistente = (id: number) => `e-${id}`;
export const claveNueva = (clave: string) => `n-${clave}`;

/* ------------------------------------------------------------------ */
/* Validaciones por paso                                               */
/* ------------------------------------------------------------------ */

/** Paso 1: mismas reglas que el formulario de periodo de siempre. */
export function validarPeriodo(datos: DatosPeriodo): Record<string, string> {
    const errores: Record<string, string> = {};

    if (!datos.gestion.trim()) errores.gestion = 'La gestión es obligatoria';

    const pruebas = Number(datos.nroPruebas);
    if (!Number.isInteger(pruebas) || pruebas < 1) {
        errores.nroPruebas = 'Debe ser un entero mayor o igual a 1';
    }

    if (!datos.fechaInicio) errores.fechaInicio = 'La fecha de inicio es obligatoria';
    if (!datos.fechaFin) errores.fechaFin = 'La fecha de fin es obligatoria';
    if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio) {
        errores.fechaFin = 'La fecha de fin no puede ser anterior al inicio';
    }

    return errores;
}

/** ¿La fila está completamente vacía? (se ignora al enviar) */
export const filaVacia = (fila: FilaMateriaNueva) =>
    !fila.nombre.trim() && !fila.codigo.trim();

/**
 * Paso 2: revisa las materias.
 * Devuelve un mensaje general (o null) y los errores por fila.
 */
export function validarMaterias(
    materiaIds: number[],
    nuevas: FilaMateriaNueva[],
    codigosExistentes: string[],
): {
    general: string | null;
    filas: Record<string, { nombre?: string; codigo?: string }>;
} {
    const filas: Record<string, { nombre?: string; codigo?: string }> = {};
    const usadas = new Map<string, string>(); // código -> clave de la fila
    const existentes = new Set(codigosExistentes.map((c) => c.trim().toUpperCase()));

    const llenas = nuevas.filter((fila) => !filaVacia(fila));

    for (const fila of llenas) {
        const errorFila: { nombre?: string; codigo?: string } = {};
        const codigo = fila.codigo.trim().toUpperCase();

        if (!fila.nombre.trim()) errorFila.nombre = 'Falta el nombre';
        if (!codigo) {
            errorFila.codigo = 'Falta el código';
        } else if (existentes.has(codigo)) {
            errorFila.codigo = 'Ya tienes una materia con este código';
        } else if (usadas.has(codigo)) {
            errorFila.codigo = 'Código repetido en esta lista';
        } else {
            usadas.set(codigo, fila.clave);
        }

        if (errorFila.nombre || errorFila.codigo) filas[fila.clave] = errorFila;
    }

    const total = materiaIds.length + llenas.length;
    const general =
        total === 0
            ? 'Selecciona al menos una materia o agrega una nueva para continuar.'
            : Object.keys(filas).length > 0
              ? 'Corrige las materias marcadas en rojo.'
              : null;

    return { general, filas };
}

/* ------------------------------------------------------------------ */
/* Armar el envío al servidor                                          */
/* ------------------------------------------------------------------ */

/**
 * Convierte el estado del asistente en lo que espera el servidor.
 * Devuelve también `clavesEnviadas`: el orden de las materias nuevas, para
 * poder marcar en pantalla la fila correcta si el servidor responde con
 * errores por posición.
 */
export function construirPayload(estado: EstadoAsistente): {
    payload: ConfigurarPeriodoPayload;
    clavesEnviadas: string[];
} {
    const nuevasLlenas = estado.materiasNuevas.filter((fila) => !filaVacia(fila));

    const paralelos: ConfigurarPeriodoPayload['paralelos'] = [];

    for (const id of estado.materiaIds) {
        const nombres = estado.paralelos[claveExistente(id)] ?? [];
        if (nombres.length > 0) paralelos.push({ materia_id: id, nombres });
    }

    nuevasLlenas.forEach((fila, indice) => {
        const nombres = estado.paralelos[claveNueva(fila.clave)] ?? [];
        if (nombres.length > 0) paralelos.push({ materia_nueva_indice: indice, nombres });
    });

    return {
        payload: {
            periodo: {
                gestion: estado.periodo.gestion.trim(),
                nro_pruebas: Number(estado.periodo.nroPruebas),
                fecha_inicio: estado.periodo.fechaInicio,
                fecha_fin: estado.periodo.fechaFin,
            },
            materia_ids: estado.materiaIds,
            materias_nuevas: nuevasLlenas.map((fila) => ({
                nombre: fila.nombre.trim(),
                codigo: fila.codigo.trim().toUpperCase(),
            })),
            paralelos,
        },
        clavesEnviadas: nuevasLlenas.map((fila) => fila.clave),
    };
}
