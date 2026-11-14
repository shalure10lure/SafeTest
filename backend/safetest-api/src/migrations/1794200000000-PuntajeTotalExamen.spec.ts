import 'reflect-metadata';

import { jest } from '@jest/globals';
import { QueryRunner } from 'typeorm';

import { PuntajeTotalExamen1794200000000 } from './1794200000000-PuntajeTotalExamen';

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

describe('Migración PuntajeTotalExamen1794200000000', () => {
  it('añade la columna decimal y la restricción de puntaje positivo', async () => {
    const { consultas, queryRunner } = prepararEjecucion();
    const migracion = new PuntajeTotalExamen1794200000000();

    await migracion.up(queryRunner);

    expect(migracion.name).toBe('PuntajeTotalExamen1794200000000');
    expect(consultas).toHaveLength(2);
    expect(consultas[0]).toContain(
      'ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "puntaje_total" numeric(12,2)',
    );
    expect(consultas[1]).toContain(
      'ADD CONSTRAINT "CHK_examen_puntaje_total_positivo"',
    );
    expect(consultas[1]).toContain(
      '"puntaje_total" IS NULL OR "puntaje_total" > 0',
    );
    expect(consultas.join('\n')).not.toMatch(
      /(^|\n)\s*(UPDATE|INSERT INTO|DELETE FROM|TRUNCATE|DROP)\b/im,
    );
  });

  it('revierte la restricción antes que la columna', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new PuntajeTotalExamen1794200000000().down(queryRunner);

    expect(consultas).toEqual([
      'ALTER TABLE "examen" DROP CONSTRAINT IF EXISTS "CHK_examen_puntaje_total_positivo"',
      'ALTER TABLE "examen" DROP COLUMN IF EXISTS "puntaje_total"',
    ]);
  });
});