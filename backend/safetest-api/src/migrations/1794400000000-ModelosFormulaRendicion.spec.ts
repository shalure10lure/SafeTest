import 'reflect-metadata';

import { jest } from '@jest/globals';
import { QueryRunner } from 'typeorm';

import { ModelosFormulaRendicion1794400000000 } from './1794400000000-ModelosFormulaRendicion';

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

describe('Migración ModelosFormulaRendicion1794400000000', () => {
  it('crea las cuatro tablas nuevas y sus índices sin tocar datos existentes', async () => {
    const { consultas, queryRunner } = prepararEjecucion();
    const migracion = new ModelosFormulaRendicion1794400000000();

    await migracion.up(queryRunner);

    expect(migracion.name).toBe('ModelosFormulaRendicion1794400000000');
    expect(consultas).toHaveLength(8);
    expect(
      consultas
        .slice(0, 4)
        .map((sql) => sql.match(/CREATE TABLE "([^"]+)"/)?.[1]),
    ).toEqual([
      'modelo',
      'pregunta_modelo',
      'modelo_formula',
      'respuesta_modelo',
    ]);
    expect(
      consultas.slice(4).map((sql) => sql.match(/CREATE INDEX "([^"]+)"/)?.[1]),
    ).toEqual([
      'IDX_modelo_activo_nombre',
      'IDX_pregunta_modelo_modelo',
      'IDX_modelo_formula_formula',
      'IDX_respuesta_modelo_modelo',
    ]);
    expect(consultas.join('\n')).not.toMatch(
      /(^|\n)\s*(ALTER TABLE|UPDATE|INSERT INTO|DELETE FROM|TRUNCATE|DROP)\b/im,
    );
  });

  it('define las claves, restricciones y relaciones requeridas', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ModelosFormulaRendicion1794400000000().up(queryRunner);

    const sql = consultas.join('\n').replace(/\s+/g, ' ');

    expect(sql).toContain('PRIMARY KEY ("pregunta_id", "modelo_id")');
    expect(sql).toContain('PRIMARY KEY ("modelo_id", "formula_id")');
    expect(sql).toContain(
      'PRIMARY KEY ("estudiante_id", "examen_id", "pregunta_id", "letra")',
    );
    expect(sql).toContain(
      'REFERENCES "respuesta_inciso" ("estudiante_id", "examen_id", "pregunta_id", "letra")',
    );
    expect(sql).toContain(
      'REFERENCES "pregunta_modelo" ("pregunta_id", "modelo_id")',
    );
    expect(sql).toContain('REFERENCES "formula"("formula_id")');
    expect(sql).toContain(`CHECK (jsonb_typeof("variables") = 'object')`);
    expect(sql).toContain(`CHECK (jsonb_typeof("valores") = 'object')`);
    expect(sql).not.toContain('solucion_formula');
  });

  it('revierte las tablas en orden inverso de dependencias', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ModelosFormulaRendicion1794400000000().down(queryRunner);

    expect(consultas).toEqual([
      'DROP TABLE IF EXISTS "respuesta_modelo"',
      'DROP TABLE IF EXISTS "modelo_formula"',
      'DROP TABLE IF EXISTS "pregunta_modelo"',
      'DROP TABLE IF EXISTS "modelo"',
    ]);
  });
});
