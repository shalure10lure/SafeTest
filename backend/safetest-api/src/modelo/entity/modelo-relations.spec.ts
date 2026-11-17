import 'reflect-metadata';

import { jest } from '@jest/globals';
import { getMetadataArgsStorage } from 'typeorm';

let Formula: typeof import('../../formula/entity/formula.entity').Formula;
let RespuestaInciso: typeof import('../../respuestainciso/entity/respuestainciso.entity').RespuestaInciso;
let Modelo: typeof import('./modelo.entity').Modelo;
let ModeloFormula: typeof import('../../modeloformula/entity/modeloformula.entity').ModeloFormula;
let PreguntaModelo: typeof import('../../preguntamodelo/entity/preguntamodelo.entity').PreguntaModelo;
let RespuestaModelo: typeof import('../../respuestamodelo/entity/respuestamodelo.entity').RespuestaModelo;

beforeAll(async () => {
  jest.unstable_mockModule('../../formula/entity/formula.entity', () => ({
    Formula: class Formula {},
  }));
  jest.unstable_mockModule('../../pregunta/entity/pregunta.entity', () => ({
    Pregunta: class Pregunta {},
  }));
  jest.unstable_mockModule(
    '../../respuestainciso/entity/respuestainciso.entity',
    () => ({
      RespuestaInciso: class RespuestaInciso {},
    }),
  );

  ({ Formula } = await import('../../formula/entity/formula.entity'));
  ({ RespuestaInciso } =
    await import('../../respuestainciso/entity/respuestainciso.entity'));
  ({ Modelo } = await import('./modelo.entity'));
  ({ ModeloFormula } =
    await import('../../modeloformula/entity/modeloformula.entity'));
  ({ PreguntaModelo } =
    await import('../../preguntamodelo/entity/preguntamodelo.entity'));
  ({ RespuestaModelo } =
    await import('../../respuestamodelo/entity/respuestamodelo.entity'));
});

describe('Entidades de modelos de HU-23', () => {
  it('define el catálogo de modelos y sus variables como JSONB', () => {
    const storage = getMetadataArgsStorage();
    const tabla = storage.tables.find((item) => item.target === Modelo);
    const columnas = storage.columns.filter((item) => item.target === Modelo);

    expect(tabla?.name).toBe('modelo');
    expect(
      columnas.find((item) => item.propertyName === 'variables')?.options,
    ).toMatchObject({ type: 'jsonb' });
    expect(
      columnas.find((item) => item.propertyName === 'activo')?.options,
    ).toMatchObject({ type: 'boolean', default: true });
  });

  it('define relaciones muchos-a-muchos con claves compuestas', () => {
    const storage = getMetadataArgsStorage();

    expect(
      storage.columns
        .filter(
          (item) => item.target === PreguntaModelo && item.options.primary,
        )
        .map((item) => item.propertyName),
    ).toEqual(['pregunta_id', 'modelo_id']);
    expect(
      storage.columns
        .filter((item) => item.target === ModeloFormula && item.options.primary)
        .map((item) => item.propertyName),
    ).toEqual(['modelo_id', 'formula_id']);
    expect(
      storage.relations
        .find(
          (item) =>
            item.target === ModeloFormula && item.propertyName === 'formula',
        )
        ?.type(),
    ).toBe(Formula);
  });

  it('relaciona una respuesta de modelo con una respuesta de inciso y el modelo permitido para su pregunta', () => {
    const storage = getMetadataArgsStorage();
    const clavesRespuesta = storage.columns
      .filter((item) => item.target === RespuestaModelo && item.options.primary)
      .map((item) => item.propertyName);
    const relacionRespuesta = storage.relations.find(
      (item) =>
        item.target === RespuestaModelo &&
        item.propertyName === 'respuestaInciso',
    );
    const relacionModeloPermitido = storage.relations.find(
      (item) =>
        item.target === RespuestaModelo &&
        item.propertyName === 'preguntaModelo',
    );
    const columnasRespuesta = storage.filterJoinColumns(
      RespuestaModelo,
      'respuestaInciso',
    );
    const columnasModeloPermitido = storage.filterJoinColumns(
      RespuestaModelo,
      'preguntaModelo',
    );

    expect(clavesRespuesta).toEqual([
      'estudiante_id',
      'examen_id',
      'pregunta_id',
      'letra',
    ]);
    expect(relacionRespuesta?.relationType).toBe('one-to-one');
    expect(relacionRespuesta?.type()).toBe(RespuestaInciso);
    expect(columnasRespuesta.map((item) => item.referencedColumnName)).toEqual([
      'estudiante_id',
      'examen_id',
      'pregunta_id',
      'letra',
    ]);
    expect(relacionModeloPermitido?.relationType).toBe('many-to-one');
    expect(relacionModeloPermitido?.type()).toBe(PreguntaModelo);
    expect(
      columnasModeloPermitido.map((item) => item.referencedColumnName),
    ).toEqual(['pregunta_id', 'modelo_id']);
    expect(
      storage.columns.find(
        (item) =>
          item.target === RespuestaModelo && item.propertyName === 'valores',
      )?.options,
    ).toMatchObject({ type: 'jsonb' });
  });
});
