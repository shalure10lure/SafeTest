'use client';

import { useEffect, useState } from 'react';

/** Devuelve `valor` después de que deje de cambiar durante `retraso` ms. */
export function useDebouncedValor<T>(valor: T, retraso = 350): T {
    const [valorDiferido, setValorDiferido] = useState(valor);

    useEffect(() => {
        const temporizador = setTimeout(() => {
            setValorDiferido(valor);
        }, retraso);

        return () => clearTimeout(temporizador);
    }, [valor, retraso]);

    return valorDiferido;
}
