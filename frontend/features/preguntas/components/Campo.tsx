import type { ReactNode } from 'react';

interface CampoProps {
    id: string;
    etiqueta: string;
    opcional?: boolean;
    ayuda?: ReactNode;
    error?: string;
    children: ReactNode;
}

/**
 * Campo de formulario con etiqueta asociada, texto de ayuda y error
 * accesible (`role="alert"`).
 */
export default function Campo({
    id,
    etiqueta,
    opcional,
    ayuda,
    error,
    children,
}: CampoProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
                {etiqueta}
                {opcional && (
                    <span className="ml-1 font-normal text-slate-400">
                        (opcional)
                    </span>
                )}
            </label>

            {children}

            {error ? (
                <p
                    id={`${id}-descripcion`}
                    role="alert"
                    className="mt-1.5 text-xs text-red-600"
                >
                    {error}
                </p>
            ) : ayuda ? (
                <p
                    id={`${id}-descripcion`}
                    className="mt-1.5 text-xs text-slate-500"
                >
                    {ayuda}
                </p>
            ) : null}
        </div>
    );
}
