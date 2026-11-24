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
    procesando?: boolean;
    varianteConfirmar?: 'normal' | 'destructiva';
    cerrarAlHacerClickFuera?: boolean;
}

const BOTON_BASE =
    'inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto';

export default function ConfirmDialog({
    abierto,
    titulo,
    children,
    textoConfirmar = 'Confirmar cambios',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
    procesando = false,
    varianteConfirmar = 'normal',
    cerrarAlHacerClickFuera = false,
}: ConfirmDialogProps) {
    const tituloId = useId();
    const descripcionId = useId();
    const cancelarRef = useRef<HTMLButtonElement>(null);
    const dialogoRef = useRef<HTMLDivElement>(null);

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
                const ultimo =
                    elementosEnfocables[elementosEnfocables.length - 1];

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

    const estiloConfirmar =
        varianteConfirmar === 'destructiva'
            ? 'bg-destructive text-white hover:bg-destructive/90 focus-visible:outline-destructive'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                aria-hidden="true"
                onClick={(evento) => {
                    if (
                        evento.target === evento.currentTarget &&
                        cerrarAlHacerClickFuera &&
                        !procesando
                    ) {
                        onCancelar();
                    }
                }}
            />

            <div
                ref={dialogoRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={tituloId}
                aria-describedby={descripcionId}
                tabIndex={-1}
                className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:p-6"
            >
                <h2
                    id={tituloId}
                    className="text-base font-semibold text-foreground sm:text-lg"
                >
                    {titulo}
                </h2>

                <div
                    id={descripcionId}
                    className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground"
                >
                    {children}
                </div>

                <div className="mt-6 flex flex-col-reverse border-t border-border pt-4 gap-2 sm:flex-row sm:justify-end">
                    <button
                        ref={cancelarRef}
                        type="button"
                        onClick={onCancelar}
                        disabled={procesando}
                        className={cn(
                            BOTON_BASE,
                            'border border-border bg-card text-foreground hover:bg-accent focus-visible:outline-ring',
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
                            estiloConfirmar,
                        )}
                    >
                        {procesando ? 'Procesando...' : textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}
