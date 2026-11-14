import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { GuardarPuntajesDto } from './guardar-puntajes.dto';

const GUARDADO_VALIDO = {
  puntajes: [
    { pregunta_id: 1, puntaje: 4 },
    { pregunta_id: 2, puntaje: 7.25 },
  ],
};

function mensajesDe(error: ValidationError): string[] {
  const propios = Object.values(error.constraints ?? {});
  const hijas = (error.children ?? []).flatMap(mensajesDe);

  return [...propios, ...hijas];
}

async function erroresDe(datos: Record<string, unknown>): Promise<string[]> {
  const instancia = plainToInstance(GuardarPuntajesDto, datos);
  const errores = await validate(instancia);

  return errores.flatMap(mensajesDe);
}

describe('GuardarPuntajesDto — contrato de puntajes por pregunta', () => {
  it('acepta puntajes enteros o con hasta 2 decimales', async () => {
    await expect(
      validate(plainToInstance(GuardarPuntajesDto, GUARDADO_VALIDO)),
    ).resolves.toHaveLength(0);
  });

  it('convierte puntajes e identificadores recibidos como texto', async () => {
    const instancia = plainToInstance(GuardarPuntajesDto, {
      puntajes: [{ pregunta_id: '3', puntaje: '4.5' }],
    });

    expect(instancia.puntajes[0].pregunta_id).toBe(3);
    expect(instancia.puntajes[0].puntaje).toBe(4.5);
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('exige al menos un puntaje', async () => {
    expect(await erroresDe({ puntajes: [] })).toContain(
      'Debe indicar al menos un puntaje',
    );
  });

  it('rechaza la misma pregunta repetida con un mensaje en español', async () => {
    expect(
      await erroresDe({
        puntajes: [
          { pregunta_id: 1, puntaje: 2 },
          { pregunta_id: 1, puntaje: 3 },
        ],
      }),
    ).toContain('No se puede repetir una pregunta en los puntajes');
  });

  it('rechaza un puntaje cero o negativo con un mensaje en español', async () => {
    expect(
      await erroresDe({ puntajes: [{ pregunta_id: 1, puntaje: 0 }] }),
    ).toContain('El puntaje de la pregunta debe ser mayor que cero');

    expect(
      await erroresDe({ puntajes: [{ pregunta_id: 1, puntaje: -3 }] }),
    ).toContain('El puntaje de la pregunta debe ser mayor que cero');
  });

  it('rechaza más de 2 decimales con un mensaje en español', async () => {
    expect(
      await erroresDe({ puntajes: [{ pregunta_id: 1, puntaje: 2.125 }] }),
    ).toContain(
      'El puntaje de la pregunta debe ser un número con un máximo de 2 decimales',
    );
  });

  it('rechaza un identificador de pregunta inválido con un mensaje en español', async () => {
    expect(
      await erroresDe({ puntajes: [{ pregunta_id: 0, puntaje: 2 }] }),
    ).toContain('El identificador de la pregunta debe ser mayor que cero');

    expect(
      await erroresDe({ puntajes: [{ pregunta_id: 'abc', puntaje: 2 }] }),
    ).toContain('El identificador de la pregunta debe ser un número entero');
  });
});