'use client';

import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    abierto: boolean;
    titulo: string;
    children: ReactNode;
    textoConfirmar?: string;
    textoCancelar?: string;
    onConfirmar: () => void;
    onCancelar: () => void;
    /** Deshabilita las acciones y evita el cierre mientras se guarda. */
    procesando?: boolean;
}

const BOTON_BASE =
    'inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Diálogo de confirmación accesible y sin dependencias externas.
 * Se cierra con Escape y con el botón de cancelar, nunca mientras procesa.
 */
export default function ConfirmDialog({
    abierto,
    titulo,
    children,
    textoConfirmar = 'Confirmar cambios',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
    procesando = false,
}: ConfirmDialogProps) {
    const tituloId = useId();
    const descripcionId = useId();
    const cancelarRef = useRef<HTMLButtonElement>(null);
    const dialogoRef = useRef<HTMLDivElement>(null);

    // Al abrir, el foco va al botón secundario y se restaura al cerrar.
    useEffect(() => {
        if (!abierto) return;

        const elementoPrevio =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

        cancelarRef.current?.focus();

        return () => {
            elementoPrevio?.focus();
        };
    }, [abierto]);

    // Escape cierra el diálogo, salvo mientras se está guardando.
    useEffect(() => {
        if (!abierto) return;

        function alTeclear(evento: KeyboardEvent) {
            if (evento.key === 'Escape') {
                if (!procesando) {
                    evento.preventDefault();
                    onCancelar();
                }
                return;
            }

            if (evento.key === 'Tab') {
                const dialogo = dialogoRef.current;
                const elementosEnfocables =
                    dialogo?.querySelectorAll<HTMLElement>(
                        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                    );

                if (!dialogo || !elementosEnfocables?.length) {
                    evento.preventDefault();
                    dialogo?.focus();
                    return;
                }

                const primero = elementosEnfocables[0];
                const ultimo = elementosEnfocables[elementosEnfocables.length - 1];

                if (
                    evento.shiftKey &&
                    (document.activeElement === primero ||
                        !dialogo.contains(document.activeElement))
                ) {
                    evento.preventDefault();
                    ultimo.focus();
                } else if (
                    !evento.shiftKey &&
                    (document.activeElement === ultimo ||
                        !dialogo.contains(document.activeElement))
                ) {
                    evento.preventDefault();
                    primero.focus();
                }
            }
        }

        document.addEventListener('keydown', alTeclear);

        return () => {
            document.removeEventListener('keydown', alTeclear);
        };
    }, [abierto, procesando, onCancelar]);

    useEffect(() => {
        if (abierto && procesando) {
            dialogoRef.current?.focus();
        }
    }, [abierto, procesando]);

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40"
                aria-hidden="true"
            />

            <div
                ref={dialogoRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={tituloId}
                aria-describedby={descripcionId}
                tabIndex={-1}
                className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            >
                <h2
                    id={tituloId}
                    className="text-base font-semibold text-slate-900"
                >
                    {titulo}
                </h2>

                <div
                    id={descripcionId}
                    className="mt-3 space-y-3 text-sm text-slate-600"
                >
                    {children}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        ref={cancelarRef}
                        type="button"
                        onClick={onCancelar}
                        disabled={procesando}
                        className={cn(
                            BOTON_BASE,
                            'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                        )}
                    >
                        {textoCancelar}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={procesando}
                        className={cn(
                            BOTON_BASE,
                            'bg-violet-600 text-white hover:bg-violet-700',
                        )}
                    >
                        {procesando ? 'Guardando...' : textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}
