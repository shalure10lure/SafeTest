import {
  escalarPuntajeProporcional,
  formatearPuntaje,
  puntajeNumerico,
  puntajeSeleccionMultiple,
  puntajeSeleccionUnica,
  redondear,
} from './correccion-puntaje';

describe('correccion-puntaje', () => {
  describe('puntajeSeleccionUnica', () => {
    it('otorga el puntaje completo cuando la opción coincide con la solución', () => {
      expect(
        puntajeSeleccionUnica({
          puntajeMax: 5,
          correctas: [2],
          seleccionadas: [2],
        }),
      ).toBe(5);
    });

    it('no otorga puntaje cuando la opción es incorrecta', () => {
      expect(
        puntajeSeleccionUnica({
          puntajeMax: 5,
          correctas: [2],
          seleccionadas: [1],
        }),
      ).toBe(0);
    });

    it('nunca considera correcta una respuesta vacía', () => {
      expect(
        puntajeSeleccionUnica({
          puntajeMax: 5,
          correctas: [2],
          seleccionadas: [],
        }),
      ).toBe(0);

      expect(
        puntajeSeleccionUnica({
          puntajeMax: 5,
          correctas: [],
          seleccionadas: [2],
        }),
      ).toBe(0);
    });

    it('no otorga puntaje si la selección contiene opciones de más', () => {
      expect(
        puntajeSeleccionUnica({
          puntajeMax: 5,
          correctas: [1],
          seleccionadas: [1, 2],
        }),
      ).toBe(0);
    });
  });

  describe('puntajeSeleccionMultiple', () => {
    it('aplica puntaje parcial proporcional a los aciertos', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [1, 2],
          puntajeParcial: true,
          penalizarIncorrectas: false,
        }),
      ).toBe(4);
    });

    it('aplica la penalización de las opciones incorrectas', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [1, 2, 4],
          puntajeParcial: true,
          penalizarIncorrectas: true,
        }),
      ).toBe(2);
    });

    it('no permite que la penalización produzca un puntaje negativo', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [4, 5],
          puntajeParcial: true,
          penalizarIncorrectas: true,
        }),
      ).toBe(0);
    });

    it('exige todas las correctas cuando no hay puntaje parcial', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [1, 2],
          puntajeParcial: false,
          penalizarIncorrectas: false,
        }),
      ).toBe(0);

      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [1, 2, 3],
          puntajeParcial: false,
          penalizarIncorrectas: false,
        }),
      ).toBe(6);
    });

    it('penaliza las opciones incorrectas aunque se hayan marcado todas las correctas', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [1, 2, 3, 4],
          puntajeParcial: false,
          penalizarIncorrectas: true,
        }),
      ).toBe(4);
    });

    it('no otorga puntaje a una respuesta vacía', () => {
      expect(
        puntajeSeleccionMultiple({
          puntajeMax: 6,
          correctas: [1, 2, 3],
          seleccionadas: [],
          puntajeParcial: true,
          penalizarIncorrectas: true,
        }),
      ).toBe(0);
    });
  });

  describe('puntajeNumerico', () => {
    it('aplica el redondeo configurado antes de comparar', () => {
      const base = {
        puntajeMax: 5,
        valorCorrecto: 10,
        tolerancia: 0,
      };

      expect(
        puntajeNumerico({
          ...base,
          respuesta: 10.04,
          redondeoDecimales: 1,
        }),
      ).toBe(5);

      expect(
        puntajeNumerico({
          ...base,
          respuesta: 10.06,
          redondeoDecimales: 1,
        }),
      ).toBe(0);
    });

    it('admite la tolerancia almacenada en la solución', () => {
      expect(
        puntajeNumerico({
          puntajeMax: 5,
          respuesta: 10.9,
          valorCorrecto: 10.5,
          tolerancia: 0.5,
          redondeoDecimales: 1,
        }),
      ).toBe(5);
    });

    it('no otorga puntaje a valores no finitos', () => {
      expect(
        puntajeNumerico({
          puntajeMax: 5,
          respuesta: Number.NaN,
          valorCorrecto: 10,
          tolerancia: 0,
          redondeoDecimales: 2,
        }),
      ).toBe(0);
    });

    it('limita el puntaje máximo a cero cuando el inciso no vale puntos', () => {
      expect(
        puntajeNumerico({
          puntajeMax: 0,
          respuesta: 10,
          valorCorrecto: 10,
          tolerancia: 0,
          redondeoDecimales: 2,
        }),
      ).toBe(0);
    });
  });

  describe('redondeo y formato', () => {
    it('redondea y formatea a la precisión de la columna numeric', () => {
      expect(redondear(2.346, 2)).toBe(2.35);
      expect(redondear(2.344, 2)).toBe(2.34);
      expect(formatearPuntaje(2.5)).toBe('2.50');
      expect(formatearPuntaje(0)).toBe('0.00');
    });

    it('escala el puntaje obtenido al máximo propio de la evaluación', () => {
      expect(escalarPuntajeProporcional(4, 20, 10)).toBe(8);
      expect(escalarPuntajeProporcional(1, 1, 3)).toBe(0.33);
    });

    it('rechaza máximos inválidos para el escalado', () => {
      expect(() => escalarPuntajeProporcional(1, 5, 0)).toThrow(RangeError);
    });
  });
});
