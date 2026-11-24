/** "74.8" -> "74,8"; "77" -> "77". Máximo 1 decimal; null -> "—". */
export function formatoNumero(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';

    return valor.toLocaleString('es-BO', { maximumFractionDigits: 1 });
}

/** "2026-II" -> "2026 – II" (como en el diseño de Figma). */
export function formatoPeriodo(gestion: string): string {
    return gestion.replace(/\s*[-–]\s*/, ' – ');
}
