import 'reflect-metadata';

import { jest } from '@jest/globals';
import { QueryRunner } from 'typeorm';

import { PuntajePreguntaExamen1794300000000 } from './1794300000000-PuntajePreguntaExamen';

function prepararEjecucion() {
  const consultas: string[] = [];
  const query = jest.fn(async (sql: string) => {
    consultas.push(sql);
    return [];
  });

  return {
    consultas,
    queryRunner: { query } as unknown as QueryRunner,
  };
}

describe('Migración PuntajePreguntaExamen1794300000000', () => {
  it('añade la columna decimal, inicializa el puntaje del banco y exige valores positivos', async () => {
    const { consultas, queryRunner } = prepararEjecucion();
    const migracion = new PuntajePreguntaExamen1794300000000();

    await migracion.up(queryRunner);

    expect(migracion.name).toBe('PuntajePreguntaExamen1794300000000');
    expect(consultas).toHaveLength(3);
    expect(consultas[0]).toContain(
      'ALTER TABLE "examen_pregunta" ADD COLUMN IF NOT EXISTS "puntaje" numeric(12,2)',
    );
    expect(consultas[1]).toContain('UPDATE "examen_pregunta"');
    expect(consultas[1]).toContain('SUM("puntaje_max")');
    expect(consultas[1]).toContain('ep."puntaje" IS NULL');
    expect(consultas[2]).toContain(
      'ADD CONSTRAINT "CHK_examen_pregunta_puntaje_positivo"',
    );
    expect(consultas[2]).toContain(
      '"puntaje" IS NULL OR "puntaje" > 0',
    );
    expect(consultas.join('\n')).not.toMatch(/(^|\n)\s*(DELETE|TRUNCATE)\b/im);
  });

  it('revierte la restricción antes que la columna', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new PuntajePreguntaExamen1794300000000().down(queryRunner);

    expect(consultas).toEqual([
      'ALTER TABLE "examen_pregunta" DROP CONSTRAINT IF EXISTS "CHK_examen_pregunta_puntaje_positivo"',
      'ALTER TABLE "examen_pregunta" DROP COLUMN IF EXISTS "puntaje"',
    ]);
  });
});