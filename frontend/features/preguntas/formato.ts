/** 2 -> "2", 2.5 -> "2.5", 0.1 + 0.2 -> "0.3" */
export function formatearPuntos(valor: number): string {
    return String(Number(valor.toFixed(2)));
}

/** ISO 8601 -> "20 sept 2026". */
export function formatearFecha(valor: string | null | undefined): string {
    if (!valor) return '—';

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '—';

    return new Intl.DateTimeFormat('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(fecha);
}
