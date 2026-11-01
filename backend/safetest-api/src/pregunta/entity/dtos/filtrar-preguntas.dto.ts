import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { TIPOS_RESPUESTA } from './create-pregunta.dto';

/** Tipos que puede devolver el banco: los del formulario y los heredados. */
export const TIPOS_FILTRO_PREGUNTA = [
  ...TIPOS_RESPUESTA,
  'texto_corto',
  'mixto',
] as const;

export type TipoFiltroPregunta = (typeof TIPOS_FILTRO_PREGUNTA)[number];

function aEntero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  return Number(valor);
}

function aTextoOpcional(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;

  const texto = valor.trim();
  return texto === '' ? undefined : texto;
}

export class FiltrarPreguntasDto {
  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;

  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'El tema debe ser un número entero' })
  @Min(1, { message: 'El tema debe ser válido' })
  tema_id?: number;

  @IsOptional()
  @IsIn(TIPOS_FILTRO_PREGUNTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo?: TipoFiltroPregunta;

  @IsOptional()
  @Transform(({ value }) => aTextoOpcional(value))
  @IsString({ message: 'El texto de búsqueda debe ser texto' })
  @MaxLength(150, {
    message: 'El texto de búsqueda no puede superar los 150 caracteres',
  })
  buscar?: string;
}
