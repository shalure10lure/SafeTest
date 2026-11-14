/** 2 -> "2", 2.5 -> "2.5", 0.1 + 0.2 -> "0.3" */
export function formatearPuntos(valor: number): string {
    return String(Number(valor.toFixed(2)));
}

/**
 * Suma puntajes con 2 decimales sin arrastrar el error de punto flotante
 * (0.1 + 0.2 -> 0.3).
 */
export function sumarPuntos(valores: number[]): number {
    const suma = valores.reduce((total, valor) => total + valor, 0);

    return Number(suma.toFixed(2));
}

/** Compara dos puntajes con 2 decimales sin falsos negativos por punto flotante. */
export function puntajesIguales(primero: number, segundo: number): boolean {
    return Number(primero.toFixed(2)) === Number(segundo.toFixed(2));
}

/**
 * Texto de un campo de puntaje -> número, o `null` si no cumple el contrato:
 * número positivo con un máximo de 2 decimales. Acepta coma o punto.
 */
export function parsearPuntaje(valor: string): number | null {
    const texto = valor.trim().replace(',', '.');

    if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;

    const numero = Number(texto);

    return Number.isFinite(numero) && numero > 0 ? numero : null;
}