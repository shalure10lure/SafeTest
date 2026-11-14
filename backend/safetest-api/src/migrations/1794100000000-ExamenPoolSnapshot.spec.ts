import 'reflect-metadata';

import { jest } from '@jest/globals';
import { QueryRunner } from 'typeorm';

import { ExamenPoolSnapshot1794100000000 } from './1794100000000-ExamenPoolSnapshot';

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

describe('Migración ExamenPoolSnapshot1794100000000', () => {
  it('crea el índice de integridad y las cuatro tablas en orden', async () => {
    const { consultas, queryRunner } = prepararEjecucion();
    const migracion = new ExamenPoolSnapshot1794100000000();

    await migracion.up(queryRunner);

    expect(migracion.name).toBe('ExamenPoolSnapshot1794100000000');
    expect(consultas).toHaveLength(5);
    expect(consultas[0]).toContain(
      'CREATE UNIQUE INDEX "UQ_pregunta_pregunta_tema"',
    );
    expect(
      consultas
        .slice(1)
        .map((sql) => sql.match(/CREATE TABLE "([^"]+)"/)?.[1]),
    ).toEqual([
      'examen_pool_snapshot',
      'examen_pool_snapshot_tema',
      'examen_pool_snapshot_pregunta',
      'examen_pool_snapshot_inciso',
    ]);
    expect(consultas.join('\n')).not.toMatch(
      /(^|\n)\s*(ALTER TABLE|UPDATE|INSERT INTO|DELETE FROM|TRUNCATE|DROP)\b/im,
    );
  });

  it('crea las FKs y checks requeridos, sin sustituir el detalle decimal', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ExamenPoolSnapshot1794100000000().up(queryRunner);

    const sql = consultas.join('\n').replace(/\s+/g, ' ');

    expect(sql.match(/\bnumeric NOT NULL\b/g)).toHaveLength(4);
    expect(sql).toContain(
      'REFERENCES "examen_tema"("examen_id", "tema_id")',
    );
    expect(sql).toContain(
      'REFERENCES "examen_pool_snapshot"("examen_id")',
    );
    expect(sql).toContain(
      'REFERENCES "examen_pool_snapshot_tema"("examen_id", "tema_id")',
    );
    expect(sql).toContain(
      'REFERENCES "examen_pool_snapshot_pregunta" ("examen_id", "tema_id", "pregunta_id")',
    );
    expect(sql).toContain(
      'REFERENCES "pregunta"("pregunta_id", "tema_id")',
    );
    expect(sql).toContain(
      'REFERENCES "inciso"("pregunta_id", "letra")',
    );
    expect(sql).toContain(
      'UNIQUE ("examen_id", "pregunta_id")',
    );
    expect(sql).toContain(
      'CHECK ("cantidad_seleccionada" <= "cantidad_candidatas")',
    );
    expect(sql.match(/ON DELETE RESTRICT/g)).toHaveLength(7);
  });

  it('revierte primero las tablas dependientes y al final el índice añadido', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ExamenPoolSnapshot1794100000000().down(queryRunner);

    expect(consultas).toEqual([
      'DROP TABLE IF EXISTS "examen_pool_snapshot_inciso"',
      'DROP TABLE IF EXISTS "examen_pool_snapshot_pregunta"',
      'DROP TABLE IF EXISTS "examen_pool_snapshot_tema"',
      'DROP TABLE IF EXISTS "examen_pool_snapshot"',
      'DROP INDEX IF EXISTS "UQ_pregunta_pregunta_tema"',
    ]);
  });
});
