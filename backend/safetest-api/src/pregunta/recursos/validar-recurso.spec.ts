import { BadRequestException } from '@nestjs/common';

import {
  detectarImagen,
  LIMITES_TABLA,
  MAX_CARACTERES_FORMULA,
  validarFormula,
  validarImagen,
  validarTabla,
} from './validar-recursos';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('detectarImagen / validarImagen', () => {
  it('reconoce PNG, JPEG y WebP por sus bytes', () => {
    expect(detectarImagen(PNG)).toEqual({ mime: 'image/png', extension: 'png' });
    expect(detectarImagen(JPEG)).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
    expect(detectarImagen(WEBP)).toEqual({
      mime: 'image/webp',
      extension: 'webp',
    });
  });

  it('rechaza SVG y texto aunque el nombre diga .png', () => {
    expect(detectarImagen(SVG)).toBeNull();
    expect(() => validarImagen(SVG, 1024)).toThrow(BadRequestException);
    expect(() => validarImagen(Buffer.from('hola'), 1024)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza archivo ausente, vacío o demasiado grande', () => {
    expect(() => validarImagen(undefined, 1024)).toThrow(BadRequestException);
    expect(() => validarImagen(Buffer.alloc(0), 1024)).toThrow(
      BadRequestException,
    );
    expect(() => validarImagen(Buffer.concat([PNG, Buffer.alloc(2048)]), 1024)).toThrow(
      /tamaño máximo/,
    );
  });

  it('acepta una imagen válida dentro del límite', () => {
    expect(validarImagen(PNG, 1024).extension).toBe('png');
  });
});

describe('validarFormula', () => {
  it('acepta LaTeX y recorta espacios', () => {
    expect(validarFormula('  \\frac{a}{b} + x^2  ')).toBe('\\frac{a}{b} + x^2');
  });

  it('rechaza valores vacíos, no textuales, largos o con control', () => {
    expect(() => validarFormula('   ')).toThrow(BadRequestException);
    expect(() => validarFormula(42)).toThrow(BadRequestException);
    expect(() =>
      validarFormula('x'.repeat(MAX_CARACTERES_FORMULA + 1)),
    ).toThrow(BadRequestException);
    expect(() => validarFormula('x\u0000y')).toThrow(BadRequestException);
  });
});

describe('validarTabla', () => {
  it('normaliza una tabla válida', () => {
    expect(
      validarTabla({
        encabezado: true,
        filas: [
          [' x ', 'y'],
          ['1', '2'],
        ],
      }),
    ).toEqual({
      encabezado: true,
      filas: [
        ['x', 'y'],
        ['1', '2'],
      ],
    });
  });

  it('el encabezado es falso por defecto', () => {
    expect(validarTabla({ filas: [['a']] }).encabezado).toBe(false);
  });

  it('rechaza formas inválidas', () => {
    const invalidas: unknown[] = [
      null,
      [],
      'texto',
      { filas: [] },
      { filas: 'a' },
      { filas: [[]] },
      { filas: [['a', 'b'], ['c']] },
      { filas: [[1, 2]] },
      { encabezado: 'si', filas: [['a']] },
      { filas: [['', ' ']] },
    ];

    for (const tabla of invalidas) {
      expect(() => validarTabla(tabla)).toThrow(BadRequestException);
    }
  });

  it('respeta los límites de filas, columnas y tamaño de celda', () => {
    const filaLarga = Array.from({ length: LIMITES_TABLA.maxColumnas + 1 }, () => 'a');
    const muchasFilas = Array.from({ length: LIMITES_TABLA.maxFilas + 1 }, () => ['a']);

    expect(() => validarTabla({ filas: [filaLarga] })).toThrow(BadRequestException);
    expect(() => validarTabla({ filas: muchasFilas })).toThrow(BadRequestException);
    expect(() =>
      validarTabla({ filas: [['x'.repeat(LIMITES_TABLA.maxCaracteresCelda + 1)]] }),
    ).toThrow(BadRequestException);
  });
});