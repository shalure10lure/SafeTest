import { Badge, type Tono } from '@/components/ui/Card';

import { etiquetaExtraccion } from '../formato';
import type { EstadoExtraccion } from '../types';

export function BadgeExtraccion({ estado }: { estado: EstadoExtraccion }) {
    return (
        <Badge tono={estado === 'completado' ? 'emerald' : 'amber'}>
            {etiquetaExtraccion(estado)}
        </Badge>
    );
}

export function BadgeAutorizacion({ autorizado }: { autorizado: boolean }) {
    return (
        <Badge tono={autorizado ? 'violet' : 'slate'}>
            {autorizado ? 'Autorizado para IA' : 'No autorizado para IA'}
        </Badge>
    );
}

export function BadgeEstado({ activo }: { activo: boolean }) {
    return (
        <Badge tono={activo ? 'blue' : 'slate'}>
            {activo ? 'Activo' : 'Inactivo'}
        </Badge>
    );
}

/** Tonos reutilizables para los mosaicos de formato. */
const TONOS_FORMATO: Record<string, Tono> = {
    PDF: 'amber',
    TXT: 'slate',
    DOCX: 'blue',
};

export function tonoFormato(formato: string | null): Tono {
    return formato ? (TONOS_FORMATO[formato] ?? 'slate') : 'slate';
}
