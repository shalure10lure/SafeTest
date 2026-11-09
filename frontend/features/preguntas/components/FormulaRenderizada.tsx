'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// `trust: false` impide comandos que enlacen o incrusten recursos externos, y
// `maxExpand` evita que una macro mal escrita consuma memoria sin control.
const OPCIONES = {
    throwOnError: false,
    trust: false,
    strict: 'ignore',
    maxExpand: 200,
    output: 'htmlAndMathml',
} as const;

/** Mensaje de error de una expresión LaTeX, o '' si es válida. */
export function errorLatex(latex: string): string {
    try {
        katex.renderToString(latex, { ...OPCIONES, throwOnError: true });

        return '';
    } catch (error) {
        return error instanceof Error
            ? error.message.replace(/^KaTeX parse error:\s*/, '')
            : 'La fórmula no es válida.';
    }
}

interface FormulaRenderizadaProps {
    latex: string;
    /** Si es true se dibuja dentro de una línea de texto, sin centrarla. */
    enLinea?: boolean;
}

/** Dibuja una fórmula LaTeX con KaTeX. */
export default function FormulaRenderizada({
    latex,
    enLinea = false,
}: FormulaRenderizadaProps) {
    const html = useMemo(
        () =>
            katex.renderToString(latex, {
                ...OPCIONES,
                displayMode: !enLinea,
            }),
        [latex, enLinea],
    );

    return (
        <div
            className="max-w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
