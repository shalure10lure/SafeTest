import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePreguntaDto } from './create-pregunta.dto';
import { UpdatePreguntaDto } from './update-pregunta.dto';

const PREGUNTA_BASE = {
  enunciado: '¿Cuánto es 2 + 2?',
  materia_id: 1,
  tema_id: 1,
  tipo_respuesta: 'opcion_unica',
};

async function erroresDe(
  clase: new () => object,
  datos: Record<string, unknown>,
): Promise<string[]> {
  const instancia = plainToInstance(clase, datos);
  const errores = await validate(instancia);

  return errores.flatMap((error) =>
    Object.keys(error.constraints ?? {}).map((clave) => clave),
  );
}

describe('CreatePreguntaDto — contrato de puntaje', () => {
  it('acepta puntaje_max y lo convierte a número', async () => {
    const instancia = plainToInstance(CreatePreguntaDto, {
      ...PREGUNTA_BASE,
      puntaje_max: '2.5',
    });

    expect(instancia.puntaje_max).toBe(2.5);
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('rechaza un puntaje cero o negativo', async () => {
    expect(
      await erroresDe(CreatePreguntaDto, {
        ...PREGUNTA_BASE,
        puntaje_max: 0,
      }),
    ).toContain('isPositive');

    expect(
      await erroresDe(CreatePreguntaDto, {
        ...PREGUNTA_BASE,
        puntaje_max: -1,
      }),
    ).toContain('isPositive');
  });

  it('rechaza un puntaje no numérico o no finito', async () => {
    expect(
      await erroresDe(CreatePreguntaDto, {
        ...PREGUNTA_BASE,
        puntaje_max: 'abc',
      }),
    ).toContain('isNumber');

    expect(
      await erroresDe(CreatePreguntaDto, {
        ...PREGUNTA_BASE,
        puntaje_max: Infinity,
      }),
    ).toContain('isNumber');

    expect(
      await erroresDe(CreatePreguntaDto, {
        ...PREGUNTA_BASE,
        puntaje_max: NaN,
      }),
    ).toContain('isNumber');
  });
});

describe('UpdatePreguntaDto — contrato de puntaje', () => {
  it('acepta puntaje_max opcional y lo convierte a número', async () => {
    const instancia = plainToInstance(UpdatePreguntaDto, {
      puntaje_max: '3.25',
    });

    expect(instancia.puntaje_max).toBe(3.25);
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('rechaza un puntaje cero o negativo', async () => {
    expect(
      await erroresDe(UpdatePreguntaDto, { puntaje_max: 0 }),
    ).toContain('isPositive');

    expect(
      await erroresDe(UpdatePreguntaDto, { puntaje_max: -0.01 }),
    ).toContain('isPositive');
  });
});
