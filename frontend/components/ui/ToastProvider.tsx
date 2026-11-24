'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type TonoToast = 'exito' | 'error' | 'aviso' | 'info';

interface Toast {
    id: number;
    tono: TonoToast;
    titulo: string;
    descripcion?: string;
}

/** Funciones que usan las pantallas para mostrar avisos. */
export interface ApiToast {
    exito: (titulo: string, descripcion?: string) => void;
    error: (titulo: string, descripcion?: string) => void;
    aviso: (titulo: string, descripcion?: string) => void;
    info: (titulo: string, descripcion?: string) => void;
}

/** Cuánto tiempo (ms) permanece visible cada tipo de aviso. */
const DURACION: Record<TonoToast, number> = {
    exito: 5000,
    info: 5000,
    aviso: 7000,
    error: 9000, // los errores se leen más despacio
};

/** Máximo de avisos a la vez, para no llenar la pantalla. */
const MAXIMO_VISIBLES = 3;

const ESTILOS: Record<
    TonoToast,
    { borde: string; icono: string; Icono: typeof Info }
> = {
    exito: { borde: 'border-l-emerald-500', icono: 'text-emerald-600', Icono: CircleCheck },
    error: { borde: 'border-l-red-500', icono: 'text-red-600', Icono: CircleAlert },
    aviso: { borde: 'border-l-amber-500', icono: 'text-amber-600', Icono: TriangleAlert },
    info: { borde: 'border-l-blue-500', icono: 'text-blue-600', Icono: Info },
};

/**
 * Si una pantalla usa `useToast()` fuera del proveedor (por ejemplo en un
 * test), no se rompe: simplemente no muestra nada.
 */
const SIN_PROVEEDOR: ApiToast = {
    exito: () => undefined,
    error: () => undefined,
    aviso: () => undefined,
    info: () => undefined,
};

const ToastContext = createContext<ApiToast>(SIN_PROVEEDOR);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    // Copia de `toasts` para revisar duplicados SIN volver a crear `mostrar`
    // (así las pantallas que usan useToast() no se re-renderizan de más).
    const toastsActuales = useRef<Toast[]>([]);
    const contador = useRef(0);
    const temporizadores = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const cerrar = useCallback((id: number) => {
        const temporizador = temporizadores.current.get(id);
        if (temporizador) clearTimeout(temporizador);
        temporizadores.current.delete(id);

        setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
    }, []);

    const mostrar = useCallback(
        (tono: TonoToast, titulo: string, descripcion?: string) => {
            // Evita apilar el mismo aviso dos veces seguidas (ej. doble clic).
            const yaExiste = toastsActuales.current.some(
                (toast) =>
                    toast.tono === tono &&
                    toast.titulo === titulo &&
                    toast.descripcion === descripcion,
            );
            if (yaExiste) return;

            contador.current += 1;
            const id = contador.current;

            setToasts((actuales) =>
                [...actuales, { id, tono, titulo, descripcion }].slice(
                    -MAXIMO_VISIBLES,
                ),
            );

            temporizadores.current.set(
                id,
                setTimeout(() => cerrar(id), DURACION[tono]),
            );
        },
        [cerrar],
    );

    useEffect(() => {
        toastsActuales.current = toasts;
    }, [toasts]);

    // Al desmontar el proveedor, cancelamos los temporizadores pendientes.
    useEffect(() => {
        const mapa = temporizadores.current;
        return () => {
            mapa.forEach((temporizador) => clearTimeout(temporizador));
            mapa.clear();
        };
    }, []);

    const api = useMemo<ApiToast>(
        () => ({
            exito: (titulo, descripcion) => mostrar('exito', titulo, descripcion),
            error: (titulo, descripcion) => mostrar('error', titulo, descripcion),
            aviso: (titulo, descripcion) => mostrar('aviso', titulo, descripcion),
            info: (titulo, descripcion) => mostrar('info', titulo, descripcion),
        }),
        [mostrar],
    );

    return (
        <ToastContext.Provider value={api}>
            {children}

            {/* Móvil: ocupa el ancho abajo. Escritorio: esquina inferior derecha. */}
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-3 bottom-3 z-[110] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
            >
                {toasts.map((toast) => {
                    const estilo = ESTILOS[toast.tono];
                    const Icono = estilo.Icono;

                    return (
                        <div
                            key={toast.id}
                            role={toast.tono === 'error' ? 'alert' : 'status'}
                            className={cn(
                                'pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900',
                                estilo.borde,
                            )}
                        >
                            <Icono
                                className={cn('mt-0.5 size-5 shrink-0', estilo.icono)}
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {toast.titulo}
                                </p>
                                {toast.descripcion && (
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                        {toast.descripcion}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => cerrar(toast.id)}
                                aria-label="Cerrar aviso"
                                className="-m-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-violet-600"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

/** Uso: const toast = useToast(); toast.exito('Guardado', 'Los cambios se aplicaron.'); */
export function useToast(): ApiToast {
    return useContext(ToastContext);
}
