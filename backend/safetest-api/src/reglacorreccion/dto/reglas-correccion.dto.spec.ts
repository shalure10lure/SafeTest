import 'reflect-metadata';

import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { ActualizarReglaCorreccionDto } from './actualizar-regla-correccion.dto';
import { CrearReglaCorreccionDto } from './crear-regla-correccion.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

function validarCrear(valor: unknown): Promise<CrearReglaCorreccionDto> {
  return pipe.transform(valor, {
    type: 'body',
    metatype: CrearReglaCorreccionDto,
  }) as Promise<CrearReglaCorreccionDto>;
}

function validarActualizar(
  valor: unknown,
): Promise<ActualizarReglaCorreccionDto> {
  return pipe.transform(valor, {
    type: 'body',
    metatype: ActualizarReglaCorreccionDto,
  }) as Promise<ActualizarReglaCorreccionDto>;
}

describe('CrearReglaCorreccionDto', () => {
  it('acepta una regla válida', async () => {
    const dto = await validarCrear({
      tipo_respuesta: 'opcion_multiple',
      parametros: { estrategia: 'automatica' },
    });

    expect(dto).toBeInstanceOf(CrearReglaCorreccionDto);
    expect(dto.tipo_respuesta).toBe('opcion_multiple');
    expect(dto.parametros).toEqual({ estrategia: 'automatica' });
    expect(dto.activo).toBeUndefined();
  });

  it('rechaza un tipo de pregunta fuera de TIPOS_RESPUESTA', async () => {
    await expect(
      validarCrear({ tipo_respuesta: 'mixto', parametros: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza parámetros que no sean un objeto', async () => {
    for (const parametros of [[], 'texto', 3, null]) {
      await expect(
        validarCrear({ tipo_respuesta: 'opcion_unica', parametros }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('conserva el estado activo booleano', async () => {
    const dto = await validarCrear({
      tipo_respuesta: 'opcion_unica',
      parametros: {},
      activo: false,
    });

    expect(dto.activo).toBe(false);
  });

  it('rechaza docente_id y otras propiedades no declaradas', async () => {
    await expect(
      validarCrear({
        tipo_respuesta: 'opcion_unica',
        parametros: {},
        docente_id: 99,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ActualizarReglaCorreccionDto', () => {
  it('acepta una actualización parcial', async () => {
    const dto = await validarActualizar({ activo: false });

    expect(dto).toBeInstanceOf(ActualizarReglaCorreccionDto);
    expect(dto.activo).toBe(false);
  });

  it('rechaza valores null en lugar de ignorarlos', async () => {
    await expect(
      validarActualizar({ parametros: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(validarActualizar({ activo: null })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      validarActualizar({ tipo_respuesta: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un tipo de pregunta no válido', async () => {
    await expect(
      validarActualizar({ tipo_respuesta: 'texto_corto' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza propiedades no declaradas', async () => {
    await expect(
      validarActualizar({ activo: true, docente_id: 99 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
