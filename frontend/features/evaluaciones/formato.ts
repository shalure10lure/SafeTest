/** 2 -> "2", 2.5 -> "2.5", 0.1 + 0.2 -> "0.3" */
export function formatearPuntos(valor: number): string {
    return String(Number(valor.toFixed(2)));
}