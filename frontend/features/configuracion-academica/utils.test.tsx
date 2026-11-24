import { describe, expect, it } from 'vitest';

import {
    claveExistente,
    claveNueva,
    construirPayload,
    generarNombresParalelos,
    parsearListaMaterias,
    sugerirCodigo,
    validarMaterias,
    validarPeriodo,
} from './utils';
import type { EstadoAsistente } from './types';

describe('sugerirCodigo', () => {
    it('usa las iniciales del nombre', () => {
        expect(sugerirCodigo('Investigación Operativa')).toBe('IO');
    });

    it('conserva los números romanos completos', () => {
        expect(sugerirCodigo('Cálculo I')).toBe('CI');
        expect(sugerirCodigo('Cálculo II')).toBe('CII');
    });

    it('ignora palabras vacías como "de" y "la"', () => {
        expect(sugerirCodigo('Teoría de la Computación')).toBe('TC');
    });

    it('agrega un número si el código ya está en uso', () => {
        expect(sugerirCodigo('Álgebra Lineal', ['AL', 'AL2'])).toBe('AL3');
    });
});

describe('parsearListaMaterias', () => {
    it('lee "Nombre; CÓDIGO" y también tabulaciones de Excel', () => {
        const filas = parsearListaMaterias('Cálculo I; mat101\nFísica II\tFIS200');

        expect(filas).toEqual([
            { nombre: 'Cálculo I', codigo: 'MAT101' },
            { nombre: 'Física II', codigo: 'FIS200' },
        ]);
    });

    it('sugiere el código cuando no viene y ignora líneas vacías', () => {
        const filas = parsearListaMaterias('\nInvestigación Operativa\n\n');

        expect(filas).toEqual([{ nombre: 'Investigación Operativa', codigo: 'IO' }]);
    });

    it('evita repetir códigos sugeridos entre filas', () => {
        const filas = parsearListaMaterias('Álgebra Lineal\nAnálisis Lógico');

        expect(filas.map((f) => f.codigo)).toEqual(['AL', 'AL2']);
    });
});

describe('generarNombresParalelos', () => {
    it('genera los primeros nombres libres', () => {
        expect(generarNombresParalelos(2, [])).toEqual(['Paralelo A', 'Paralelo B']);
    });

    it('salta los que ya existen', () => {
        expect(generarNombresParalelos(2, ['paralelo a'])).toEqual([
            'Paralelo B',
            'Paralelo C',
        ]);
    });
});

describe('validarPeriodo', () => {
    it('acepta un periodo correcto', () => {
        expect(
            validarPeriodo({
                gestion: '2027-I',
                nroPruebas: '3',
                fechaInicio: '2027-02-01',
                fechaFin: '2027-06-30',
            }),
        ).toEqual({});
    });

    it('rechaza fechas invertidas y campos vacíos', () => {
        const errores = validarPeriodo({
            gestion: ' ',
            nroPruebas: '0',
            fechaInicio: '2027-06-30',
            fechaFin: '2027-02-01',
        });

        expect(Object.keys(errores).sort()).toEqual(['fechaFin', 'gestion', 'nroPruebas']);
    });
});

describe('validarMaterias', () => {
    it('exige al menos una materia', () => {
        expect(validarMaterias([], [], []).general).toContain('al menos una');
    });

    it('marca códigos repetidos y existentes en su fila', () => {
        const { filas, general } = validarMaterias(
            [],
            [
                { clave: 'a', nombre: 'Uno', codigo: 'x1' },
                { clave: 'b', nombre: 'Dos', codigo: 'X1' },
                { clave: 'c', nombre: 'Tres', codigo: 'fis100' },
            ],
            ['FIS100'],
        );

        expect(filas.b?.codigo).toContain('repetido');
        expect(filas.c?.codigo).toContain('Ya tienes');
        expect(general).toContain('rojo');
    });

    it('ignora las filas completamente vacías', () => {
        const { general } = validarMaterias(
            [5],
            [{ clave: 'a', nombre: '', codigo: '' }],
            [],
        );

        expect(general).toBeNull();
    });
});

describe('construirPayload', () => {
    const estado: EstadoAsistente = {
        periodo: {
            gestion: ' 2027-I ',
            nroPruebas: '3',
            fechaInicio: '2027-02-01',
            fechaFin: '2027-06-30',
        },
        materiaIds: [7],
        materiasNuevas: [
            { clave: 'vacia', nombre: '', codigo: '' },
            { clave: 'k1', nombre: ' Física ', codigo: 'fis1' },
        ],
        paralelos: {
            [claveExistente(7)]: ['Paralelo A'],
            [claveNueva('k1')]: ['Paralelo A', 'Paralelo B'],
        },
    };

    it('limpia los datos y descarta filas vacías', () => {
        const { payload } = construirPayload(estado);

        expect(payload.periodo.gestion).toBe('2027-I');
        expect(payload.materias_nuevas).toEqual([{ nombre: 'Física', codigo: 'FIS1' }]);
    });

    it('ubica los paralelos de la materia nueva por su posición', () => {
        const { payload, clavesEnviadas } = construirPayload(estado);

        expect(payload.paralelos).toEqual([
            { materia_id: 7, nombres: ['Paralelo A'] },
            { materia_nueva_indice: 0, nombres: ['Paralelo A', 'Paralelo B'] },
        ]);
        expect(clavesEnviadas).toEqual(['k1']);
    });
});
