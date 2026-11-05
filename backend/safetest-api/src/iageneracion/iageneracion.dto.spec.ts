import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { ActualizarPropuestaIaDto } from './dto/actualizar-propuesta-ia.dto';
import { CrearGeneracionIaDto } from './dto/crear-generacion-ia.dto';
import { FiltrarGeneracionesIaDto } from './dto/filtrar-generaciones-ia.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

function validarBody(valor: unknown): Promise<CrearGeneracionIaDto> {
  return pipe.transform(valor, {
    type: 'body',
    metatype: CrearGeneracionIaDto,
  }) as Promise<CrearGeneracionIaDto>;
}

function validarQuery(valor: unknown): Promise<FiltrarGeneracionesIaDto> {
  return pipe.transform(valor, {
    type: 'query',
    metatype: FiltrarGeneracionesIaDto,
  }) as Promise<FiltrarGeneracionesIaDto>;
}

function validarPropuesta(
  valor: unknown,
): Promise<ActualizarPropuestaIaDto> {
  return pipe.transform(valor, {
    type: 'body',
    metatype: ActualizarPropuestaIaDto,
  }) as Promise<ActualizarPropuestaIaDto>;
}

const ENTRADA_VALIDA = {
  materia_id: 1,
  tema_id: 2,
  tipo_respuesta: 'opcion_unica',
  cantidad: 4,
  dificultad: 'media',
  material_ids: [5, 6],
};

describe('CrearGeneracionIaDto', () => {
  it('acepta una entrada válida y convierte ids de materiales', async () => {
    const dto = await validarBody({
      ...ENTRADA_VALIDA,
      materia_id: '1',
      tema_id: '2',
      cantidad: '4',
      material_ids: ['5', '6'],
    });

    expect(dto).toBeInstanceOf(CrearGeneracionIaDto);
    expect(dto.materia_id).toBe(1);
    expect(dto.tema_id).toBe(2);
    expect(dto.cantidad).toBe(4);
    expect(dto.material_ids).toEqual([5, 6]);
  });

  it('descarta docente_id y estado enviados por el cliente', async () => {
    const dto = await validarBody({
      ...ENTRADA_VALIDA,
      docente_id: 999,
      estado: 'completada',
    });

    expect(
      (dto as unknown as Record<string, unknown>).docente_id,
    ).toBeUndefined();
    expect((dto as unknown as Record<string, unknown>).estado).toBeUndefined();
  });

  it.each([
    ['materia inválida', { ...ENTRADA_VALIDA, materia_id: 0 }],
    ['tema inválido', { ...ENTRADA_VALIDA, tema_id: 0 }],
    ['tipo desconocido', { ...ENTRADA_VALIDA, tipo_respuesta: 'mixto' }],
    ['cantidad cero', { ...ENTRADA_VALIDA, cantidad: 0 }],
    ['cantidad excesiva', { ...ENTRADA_VALIDA, cantidad: 51 }],
    ['dificultad inválida', { ...ENTRADA_VALIDA, dificultad: 'extrema' }],
    ['sin materiales', { ...ENTRADA_VALIDA, material_ids: [] }],
    ['más de tres materiales', { ...ENTRADA_VALIDA, material_ids: [1, 2, 3, 4] }],
    ['material inválido', { ...ENTRADA_VALIDA, material_ids: [0] }],
    ['materiales repetidos', { ...ENTRADA_VALIDA, material_ids: [5, 5] }],
  ])('rechaza %s', async (_caso, entrada) => {
    await expect(validarBody(entrada)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('ActualizarPropuestaIaDto', () => {
  const PROPUESTA_VALIDA = {
    enunciado: '¿Cuál es la derivada de x²?',
    dificultad: 'media',
    puntaje_max: 2,
    opciones: [
      { texto_opcion: '2x', es_correcta: true },
      { texto_opcion: 'x', es_correcta: false },
    ],
    explicacion: 'Regla de la potencia.',
  };

  it('acepta una propuesta válida y convierte números', async () => {
    const dto = await validarPropuesta({
      ...PROPUESTA_VALIDA,
      puntaje_max: '2.5',
    });

    expect(dto).toBeInstanceOf(ActualizarPropuestaIaDto);
    expect(dto.puntaje_max).toBe(2.5);
    expect(dto.opciones).toEqual(PROPUESTA_VALIDA.opciones);
  });

  it('descarta tipo, docente, estado y pregunta enviados por el cliente', async () => {
    const dto = await validarPropuesta({
      ...PROPUESTA_VALIDA,
      tipo_respuesta: 'desarrollo',
      docente_id: 999,
      estado: 'aceptada',
      pregunta_id: 42,
    });

    const plano = dto as unknown as Record<string, unknown>;

    expect(plano.tipo_respuesta).toBeUndefined();
    expect(plano.docente_id).toBeUndefined();
    expect(plano.estado).toBeUndefined();
    expect(plano.pregunta_id).toBeUndefined();
  });

  it.each([
    ['enunciado vacío', { ...PROPUESTA_VALIDA, enunciado: '   ' }],
    [
      'enunciado demasiado largo',
      { ...PROPUESTA_VALIDA, enunciado: 'a'.repeat(4_001) },
    ],
    ['dificultad inválida', { ...PROPUESTA_VALIDA, dificultad: 'extrema' }],
    ['puntaje cero', { ...PROPUESTA_VALIDA, puntaje_max: 0 }],
    ['puntaje con más de 2 decimales', { ...PROPUESTA_VALIDA, puntaje_max: 1.234 }],
    ['menos de 2 opciones', { ...PROPUESTA_VALIDA, opciones: [] }],
    [
      'opción sin texto',
      {
        ...PROPUESTA_VALIDA,
        opciones: [
          { texto_opcion: '', es_correcta: true },
          { texto_opcion: 'x', es_correcta: false },
        ],
      },
    ],
    ['tolerancia negativa', { ...PROPUESTA_VALIDA, tolerancia: -1 }],
    [
      'explicación demasiado larga',
      { ...PROPUESTA_VALIDA, explicacion: 'a'.repeat(2_001) },
    ],
  ])('rechaza %s', async (_caso, entrada) => {
    await expect(validarPropuesta(entrada)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('permite el contenido de una propuesta numérica sin opciones', async () => {
    const dto = await validarPropuesta({
      enunciado: '¿Cuánto es 2 + 2?',
      dificultad: 'facil',
      puntaje_max: 1,
      valor_correcto: 4,
      tolerancia: 0,
    });

    expect(dto.valor_correcto).toBe(4);
    expect(dto.opciones).toBeUndefined();
  });
});

describe('FiltrarGeneracionesIaDto', () => {
  it('acepta filtros válidos y convierte la materia', async () => {
    const dto = await validarQuery({
      estado: 'completada',
      materia_id: '1',
    });

    expect(dto).toEqual({ estado: 'completada', materia_id: 1 });
  });

  it('rechaza un estado desconocido', async () => {
    await expect(validarQuery({ estado: 'cancelada' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
