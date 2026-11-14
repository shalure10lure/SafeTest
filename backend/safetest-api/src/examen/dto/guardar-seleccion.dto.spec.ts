import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';

import {
  GuardarSeleccionDto,
  PuntajePreguntaDto,
} from './guardar-seleccion.dto';

const SELECCION_MANUAL = {
  modo_seleccion: 'manual',
  pregunta_ids: [1, 2],
};

function clavesDe(error: ValidationError): string[] {
  const propias = Object.keys(error.constraints ?? {});
  const hijas = (error.children ?? []).flatMap(clavesDe);

  return [...propias, ...hijas];
}

async function erroresDe(datos: Record<string, unknown>): Promise<string[]> {
  const instancia = plainToInstance(GuardarSeleccionDto, datos);
  const errores = await validate(instancia);

  return errores.flatMap(clavesDe);
}

describe('GuardarSeleccionDto — puntajes propios de las preguntas', () => {
  it('acepta una selección manual sin puntajes (se usa el del banco)', async () => {
    await expect(
      validate(
        plainToInstance(GuardarSeleccionDto, SELECCION_MANUAL),
      ),
    ).resolves.toHaveLength(0);
  });

  it('acepta puntajes enteros o con hasta 2 decimales', async () => {
    await expect(
      validate(
        plainToInstance(GuardarSeleccionDto, {
          ...SELECCION_MANUAL,
          puntajes: [
            { pregunta_id: 1, puntaje: 10 },
            { pregunta_id: 2, puntaje: 7.25 },
          ],
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it('convierte un puntaje recibido como texto', async () => {
    const instancia = plainToInstance(GuardarSeleccionDto, {
      ...SELECCION_MANUAL,
      puntajes: [{ pregunta_id: 1, puntaje: '4.5' }],
    });

    expect(instancia.puntajes?.[0].puntaje).toBe(4.5);
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('rechaza un puntaje cero o negativo', async () => {
    expect(
      await erroresDe({
        ...SELECCION_MANUAL,
        puntajes: [{ pregunta_id: 1, puntaje: 0 }],
      }),
    ).toContain('isPositive');

    expect(
      await erroresDe({
        ...SELECCION_MANUAL,
        puntajes: [{ pregunta_id: 1, puntaje: -3 }],
      }),
    ).toContain('isPositive');
  });

  it('rechaza más de 2 decimales', async () => {
    expect(
      await erroresDe({
        ...SELECCION_MANUAL,
        puntajes: [{ pregunta_id: 1, puntaje: 2.125 }],
      }),
    ).toContain('isNumber');
  });

  it('rechaza la misma pregunta repetida en los puntajes', async () => {
    expect(
      await erroresDe({
        ...SELECCION_MANUAL,
        puntajes: [
          { pregunta_id: 1, puntaje: 2 },
          { pregunta_id: 1, puntaje: 3 },
        ],
      }),
    ).toContain('arrayUnique');
  });

  it('rechaza un identificador de pregunta inválido', async () => {
    expect(
      await erroresDe({
        ...SELECCION_MANUAL,
        puntajes: [{ pregunta_id: 0, puntaje: 2 }],
      }),
    ).toContain('min');
  });
});

describe('PuntajePreguntaDto', () => {
  it('exige un puntaje numérico y positivo', async () => {
    const instancia = plainToInstance(PuntajePreguntaDto, {
      pregunta_id: 1,
      puntaje: 'no-es-numero',
    });

    await expect(validate(instancia)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: expect.objectContaining({ isNumber: expect.any(String) }),
        }),
      ]),
    );
  });
});