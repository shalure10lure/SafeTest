export const DURACIONES_RAPIDAS = [45, 60, 90, 120] as const;

/** 90 -> "1 h 30 min", 60 -> "1 h", 45 -> "45 min" */
export function formatearDuracion(minutos: number): string {
    if (!Number.isFinite(minutos) || minutos <= 0) return '0 min';

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas === 0) return `${resto} min`;
    if (resto === 0) return `${horas} h`;

    return `${horas} h ${resto} min`;
}

/** ISO (UTC) -> valor de <input type="datetime-local"> en hora local. */
export function aInputLocal(iso: string | null): string {
    if (!iso) return '';

    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) return '';

    const dos = (n: number) => String(n).padStart(2, '0');

    return (
        `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
        `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
    );
}

/** Valor de <input type="datetime-local"> (hora local) -> ISO UTC. "" si no es válido. */
export function aIso(valorLocal: string): string {
    if (!valorLocal) return '';

    const fecha = new Date(valorLocal);

    return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString();
}

/** Minutos entre dos valores de datetime-local; `null` si falta alguno. */
export function minutosEntre(desdeLocal: string, hastaLocal: string): number | null {
    if (!desdeLocal || !hastaLocal) return null;

    const minutos =
        (new Date(hastaLocal).getTime() - new Date(desdeLocal).getTime()) / 60000;

    return Number.isFinite(minutos) ? Math.round(minutos) : null;
}

/** ISO (UTC) -> "20 oct 2026, 8:00 a. m." en la hora local del navegador. */
export function formatearFechaHora(iso: string | null): string {
    if (!iso) return '—';

    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) return '—';

    return new Intl.DateTimeFormat('es-BO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(fecha);
}