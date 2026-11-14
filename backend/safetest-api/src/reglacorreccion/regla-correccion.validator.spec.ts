import { BadRequestException } from '@nestjs/common';

import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';
import { validarParametrosRegla } from './regla-correccion.validator';

describe('validarParametrosRegla', () => {
  it('acepta una configuración vacía para los tipos de selección', () => {
    expect(validarParametrosRegla('opcion_unica', {})).toEqual({});
    expect(validarParametrosRegla('verdadero_falso', {})).toEqual({});
  });

  it('acepta y normaliza la estrategia automática', () => {
    expect(
      validarParametrosRegla('opcion_unica', {
        estrategia: 'automatica',
      }),
    ).toEqual({ estrategia: 'automatica' });
  });

  it('acepta los parámetros de puntaje parcial de opción múltiple', () => {
    expect(
      validarParametrosRegla('opcion_multiple', {
        estrategia: 'automatica',
        puntaje_parcial: true,
        penalizar_incorrectas: false,
      }),
    ).toEqual({
      estrategia: 'automatica',
      puntaje_parcial: true,
      penalizar_incorrectas: false,
    });
  });

  it('rechaza valores no booleanos en los parámetros de opción múltiple', () => {
    expect(() =>
      validarParametrosRegla('opcion_multiple', {
        puntaje_parcial: 'si',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validarParametrosRegla('opcion_multiple', {
        penalizar_incorrectas: 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('acepta el redondeo numérico dentro del rango permitido', () => {
    expect(
      validarParametrosRegla('numerica', { redondeo_decimales: 0 }),
    ).toEqual({ redondeo_decimales: 0 });
    expect(
      validarParametrosRegla('numerica', { redondeo_decimales: 6 }),
    ).toEqual({ redondeo_decimales: 6 });
  });

  it('rechaza un redondeo fuera del rango o no entero', () => {
    for (const valor of [-1, 7, 1.5, '2', null]) {
      expect(() =>
        validarParametrosRegla('numerica', { redondeo_decimales: valor }),
      ).toThrow(BadRequestException);
    }
  });

  it('exige evaluación manual mediante rúbrica para desarrollo', () => {
    expect(
      validarParametrosRegla('desarrollo', {
        estrategia: 'manual_rubrica',
      }),
    ).toEqual({ estrategia: 'manual_rubrica' });
  });

  it('rechaza la autocorrección de desarrollo', () => {
    expect(() =>
      validarParametrosRegla('desarrollo', { estrategia: 'automatica' }),
    ).toThrow(BadRequestException);

    expect(() => validarParametrosRegla('desarrollo', {})).toThrow(
      BadRequestException,
    );

    expect(() =>
      validarParametrosRegla('desarrollo', {
        estrategia: 'manual_rubrica',
        puntaje_parcial: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza parámetros que no sean un objeto JSON', () => {
    for (const valor of [null, undefined, [], 'texto', 3]) {
      expect(() => validarParametrosRegla('opcion_unica', valor)).toThrow(
        BadRequestException,
      );
    }
  });

  it('rechaza datos de la solución dentro de los parámetros', () => {
    for (const clave of [
      'valor_correcto',
      'tolerancia',
      'rubrica',
      'solucion_referencia',
      'respuesta_correcta',
      'opciones',
      'docente_id',
      'regla_id',
    ]) {
      expect(() => validarParametrosRegla('numerica', { [clave]: 1 })).toThrow(
        BadRequestException,
      );
    }
  });

  it('rechaza parámetros no admitidos por el tipo', () => {
    expect(() =>
      validarParametrosRegla('opcion_unica', { puntaje_parcial: true }),
    ).toThrow(BadRequestException);

    expect(() =>
      validarParametrosRegla('numerica', { puntaje_parcial: true }),
    ).toThrow(BadRequestException);
  });

  it('rechaza tipos de pregunta desconocidos', () => {
    expect(() => validarParametrosRegla('mixto' as TipoRespuesta, {})).toThrow(
      BadRequestException,
    );
  });
});
