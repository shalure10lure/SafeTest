import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AutorizarMaterialDto } from './dto/autorizar-material.dto';
import { CrearMaterialDto } from './dto/crear-material.dto';
import { FiltrarMaterialesDto } from './dto/filtrar-materiales.dto';

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

describe('CrearMaterialDto', () => {
  it('convierte los campos de texto del formulario multipart', async () => {
    const instancia = plainToInstance(CrearMaterialDto, {
      titulo: '  Apunte  ',
      materia_id: '3',
      tema_id: '',
    });

    expect(instancia.titulo).toBe('Apunte');
    expect(instancia.materia_id).toBe(3);
    expect(instancia.tema_id).toBeUndefined();
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });

  it('exige un título no vacío', async () => {
    expect(
      await erroresDe(CrearMaterialDto, { titulo: '   ', materia_id: '1' }),
    ).toContain('isNotEmpty');
  });

  it('rechaza una materia no numérica o menor que 1', async () => {
    expect(
      await erroresDe(CrearMaterialDto, {
        titulo: 'Apunte',
        materia_id: 'abc',
      }),
    ).toContain('isInt');

    expect(
      await erroresDe(CrearMaterialDto, {
        titulo: 'Apunte',
        materia_id: '0',
      }),
    ).toContain('min');
  });
});

describe('AutorizarMaterialDto', () => {
  it('acepta false como decisión explícita', async () => {
    await expect(
      erroresDe(AutorizarMaterialDto, { autorizado: false }),
    ).resolves.toHaveLength(0);
  });

  it('rechaza valores que no son booleanos', async () => {
    expect(
      await erroresDe(AutorizarMaterialDto, { autorizado: 'false' }),
    ).toContain('isBoolean');
  });
});

describe('FiltrarMaterialesDto', () => {
  it('interpreta los booleanos de la query sin convertir "false" en true', async () => {
    const falso = plainToInstance(FiltrarMaterialesDto, { activo: 'false' });
    const verdadero = plainToInstance(FiltrarMaterialesDto, {
      activo: 'true',
    });
    const materia = plainToInstance(FiltrarMaterialesDto, {
      materia_id: '3',
    });

    expect(falso.activo).toBe(false);
    expect(verdadero.activo).toBe(true);
    expect(materia.materia_id).toBe(3);
  });

  it('rechaza filtros inválidos', async () => {
    expect(
      await erroresDe(FiltrarMaterialesDto, { activo: 'quizas' }),
    ).toContain('isBoolean');

    expect(
      await erroresDe(FiltrarMaterialesDto, { materia_id: 'abc' }),
    ).toContain('isInt');
  });

  it('trata los valores vacíos como ausentes', async () => {
    const instancia = plainToInstance(FiltrarMaterialesDto, {
      materia_id: '',
      activo: '',
    });

    expect(instancia.materia_id).toBeUndefined();
    expect(instancia.activo).toBeUndefined();
    await expect(validate(instancia)).resolves.toHaveLength(0);
  });
});
