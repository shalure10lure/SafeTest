import type { Tono } from '@/components/ui/Card';

export interface InfoTipoPregunta {
    label: string;
    tono: Tono;
}

const TIPOS: Record<string, InfoTipoPregunta> = {
    opcion_unica: { label: 'Opción única', tono: 'blue' },
    opcion_multiple: { label: 'Opción múltiple', tono: 'indigo' },
    verdadero_falso: { label: 'Verdadero / Falso', tono: 'violet' },
    desarrollo: { label: 'Desarrollo', tono: 'emerald' },
    numerica: { label: 'Respuesta numérica', tono: 'amber' },
    texto_corto: { label: 'Texto corto', tono: 'slate' },
    mixto: { label: 'Varios incisos', tono: 'slate' },
};

/** "respuesta_larga" -> "Respuesta larga" */
function humanizar(valor: string): string {
    const texto = valor.replace(/_/g, ' ').trim();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function infoTipoPregunta(tipo: string | null): InfoTipoPregunta {
    if (!tipo) return { label: 'Sin tipo', tono: 'slate' };

    return TIPOS[tipo] ?? { label: humanizar(tipo), tono: 'slate' };
}