export interface PuntajeDecimal {
    coeficiente: bigint;
    escala: number;
}

function normalizarPuntajeDecimal(
    puntaje: PuntajeDecimal,
): PuntajeDecimal {
    let { coeficiente, escala } = puntaje;

    while (escala > 0 && coeficiente % 10n === 0n) {
        coeficiente /= 10n;
        escala -= 1;
    }

    return { coeficiente, escala };
}

export function parsearPuntajeDecimal(
    valor: unknown,
): PuntajeDecimal | null {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        return null;
    }

    const texto = String(valor);
    const partes =
        /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(
            texto,
        );

    if (!partes) {
        return null;
    }

    const entero = partes[2] ?? '0';
    const fraccion = partes[3] ?? partes[4] ?? '';
    const exponente = Number(partes[5] ?? 0);

    if (!Number.isSafeInteger(exponente)) {
        return null;
    }

    let coeficiente = BigInt(`${entero}${fraccion}`);

    if (partes[1] === '-') {
        coeficiente *= -1n;
    }

    let escala = fraccion.length - exponente;

    if (escala < 0) {
        coeficiente *= 10n ** BigInt(-escala);
        escala = 0;
    }

    return normalizarPuntajeDecimal({ coeficiente, escala });
}

export function sumarPuntajesDecimales(
    puntajes: PuntajeDecimal[],
): PuntajeDecimal {
    const escala = puntajes.reduce(
        (mayor, puntaje) => Math.max(mayor, puntaje.escala),
        0,
    );
    const coeficiente = puntajes.reduce(
        (suma, puntaje) =>
            suma +
            puntaje.coeficiente *
                10n ** BigInt(escala - puntaje.escala),
        0n,
    );

    return normalizarPuntajeDecimal({ coeficiente, escala });
}

export function multiplicarPuntajeDecimal(
    puntaje: PuntajeDecimal,
    multiplicador: number,
): PuntajeDecimal {
    return normalizarPuntajeDecimal({
        coeficiente: puntaje.coeficiente * BigInt(multiplicador),
        escala: puntaje.escala,
    });
}

export function puntajesDecimalesIguales(
    primero: PuntajeDecimal,
    segundo: PuntajeDecimal,
): boolean {
    return (
        primero.coeficiente === segundo.coeficiente &&
        primero.escala === segundo.escala
    );
}

export function puntajeDecimalANumero(
    puntaje: PuntajeDecimal,
): number {
    return Number(puntajeDecimalATexto(puntaje));
}

export function puntajeDecimalATexto(
    puntaje: PuntajeDecimal,
): string {
    const normalizado = normalizarPuntajeDecimal(puntaje);
    const negativo = normalizado.coeficiente < 0n;
    const digitos = (negativo
        ? -normalizado.coeficiente
        : normalizado.coeficiente
    ).toString();

    if (normalizado.escala === 0) {
        return `${negativo ? '-' : ''}${digitos}`;
    }

    const digitosRellenados = digitos.padStart(normalizado.escala + 1, '0');
    const indiceDecimal = digitosRellenados.length - normalizado.escala;

    return `${negativo ? '-' : ''}${digitosRellenados.slice(0, indiceDecimal)}.${digitosRellenados.slice(indiceDecimal)}`;
}
