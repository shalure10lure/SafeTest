import { describe, expect, it } from 'vitest';

import { formatearPuntos, parsearPuntaje } from './formato';

describe('parsearPuntaje', () => {
    it('acepta enteros y hasta 2 decimales con punto o coma', () => {
        expect(parsearPuntaje('10')).toBe(10);
        expect(parsearPuntaje('7.25')).toBe(7.25);
        expect(parsearPuntaje('7,25')).toBe(7.25);
        expect(parsearPuntaje(' 3.5 ')).toBe(3.5);
    });

    it('rechaza cero, negativos, más de 2 decimales y texto', () => {
        expect(parsearPuntaje('0')).toBeNull();
        expect(parsearPuntaje('-2')).toBeNull();
        expect(parsearPuntaje('2.125')).toBeNull();
        expect(parsearPuntaje('abc')).toBeNull();
        expect(parsearPuntaje('')).toBeNull();
    });
});

describe('formatearPuntos', () => {
    it('elimina ceros decimales innecesarios', () => {
        expect(formatearPuntos(2)).toBe('2');
        expect(formatearPuntos(2.5)).toBe('2.5');
        expect(formatearPuntos(0.1 + 0.2)).toBe('0.3');
    });
});