import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GuardarConfiguracionDto } from './guardar-configuracion.dto';

const CONFIGURACION_BASE = {
  orden_preguntas: 'definido',
  duracion_min: 60,
  disponible_desde: '2026-11-20T10:00:00.000Z',
  disponible_hasta: '2026-11-20T12:00:00.000Z',
  modo_entrega_nota: 'al_publicar',
};

async function erroresDe(datos: Record<string, unknown>): Promise<string[]> {
  const instancia = plainToInstance(GuardarConfiguracionDto, datos);
  const errores = await validate(instancia);

  return errores.flatMap((error) =>
    Object.keys(error.constraints ?? {}).map((clave) => clave),
  );
}

describe('GuardarConfiguracionDto — contrato del puntaje total', () => {
  it('acepta un puntaje entero o con hasta 2 decimales', async () => {
    await expect(
      validate(
        plainToInstance(GuardarConfiguracionDto, {
          ...CONFIGURACION_BASE,
          puntaje_total: 100,
        }),
      ),
    ).resolves.toHaveLength(0);

    await expect(
      validate(
        plainToInstance(GuardarConfiguracionDto, {
          ...CONFIGURACION_BASE,
          puntaje_total: 33.25,
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it('convierte un puntaje recibido como texto', async () => {
    const instancia = plainToInstance(GuardarConfiguracionDto, {
      ...CONFIGURACION_BASE,
      puntaje_total: '10.5',
    });

    expect(instancia.puntaje_total).toBe(10.5);
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('rechaza un puntaje cero o negativo', async () => {
    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: 0 }),
    ).toContain('isPositive');

    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: -5 }),
    ).toContain('isPositive');
  });

  it('rechaza más de 2 decimales', async () => {
    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: 10.125 }),
    ).toContain('isNumber');
  });

  it('rechaza un puntaje no numérico o no finito', async () => {
    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: 'abc' }),
    ).toContain('isNumber');

    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: Infinity }),
    ).toContain('isNumber');

    expect(
      await erroresDe({ ...CONFIGURACION_BASE, puntaje_total: NaN }),
    ).toContain('isNumber');
  });

  it('exige el puntaje total', async () => {
    expect(await erroresDe(CONFIGURACION_BASE)).toContain('isNumber');
  });
});