import 'reflect-metadata';

import { QueryRunner } from 'typeorm';

import { TIPOS_RESPUESTA } from '../pregunta/entity/dtos/create-pregunta.dto';
import { ReglaCorreccion1794000000000 } from './1794000000000-ReglaCorreccion';

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

describe('Migración ReglaCorreccion1794000000000', () => {
  it('tiene el nombre esperado por TypeORM', () => {
    const migracion = new ReglaCorreccion1794000000000();

    expect(migracion.name).toBe('ReglaCorreccion1794000000000');
  });

  it('crea únicamente la tabla regla_correccion y su índice', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ReglaCorreccion1794000000000().up(queryRunner);

    expect(consultas).toHaveLength(2);
    for (const sql of consultas) {
      expect(sql.trim()).toMatch(/^CREATE /);
    }

    const [crearTabla, crearIndice] = consultas;

    expect(crearTabla.trim().startsWith('CREATE TABLE "regla_correccion"')).toBe(
      true,
    );
    expect(crearIndice).toContain(
      'CREATE INDEX "IDX_regla_correccion_docente_activo"',
    );
    expect(crearIndice).toContain(
      'ON "regla_correccion" ("docente_id", "activo")',
    );

    // Ninguna otra tabla se crea ni se modifica.
    expect(consultas.join('\n').match(/CREATE TABLE/g)).toHaveLength(1);
    expect(consultas.join('\n')).not.toMatch(/\b(ALTER|DROP|TRUNCATE|RENAME)\b/i);
  });

  it('define todas las columnas de la nueva tabla', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ReglaCorreccion1794000000000().up(queryRunner);

    const [crearTabla] = consultas;

    expect(crearTabla).toContain('"regla_id" SERIAL NOT NULL');
    expect(crearTabla).toContain('"docente_id" integer NOT NULL');
    expect(crearTabla).toContain(
      '"tipo_respuesta" character varying(30) NOT NULL',
    );
    expect(crearTabla).toContain(
      `"parametros" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
    expect(crearTabla).toContain('"activo" boolean NOT NULL DEFAULT true');
    expect(crearTabla).toContain(
      '"creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
    );
    expect(crearTabla).toContain(
      '"actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
    );
  });

  it('agrega la clave primaria, unicidad, checks y FK solo a la tabla nueva', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ReglaCorreccion1794000000000().up(queryRunner);

    const [crearTabla] = consultas;

    expect(crearTabla).toContain(
      'CONSTRAINT "PK_regla_correccion" PRIMARY KEY ("regla_id")',
    );
    expect(crearTabla).toContain(
      'CONSTRAINT "UQ_regla_correccion_docente_tipo" UNIQUE ("docente_id", "tipo_respuesta")',
    );
    expect(crearTabla).toContain(
      'CONSTRAINT "CHK_regla_correccion_parametros" CHECK',
    );
    expect(crearTabla.replace(/\s+/g, ' ')).toContain(
      `jsonb_typeof("parametros") = 'object'`,
    );
    expect(crearTabla).toContain(
      'CONSTRAINT "FK_regla_correccion_docente" FOREIGN KEY ("docente_id")',
    );
    expect(crearTabla).toContain('REFERENCES "docente"("docente_id")');
    expect(crearTabla).toContain('ON DELETE CASCADE');
  });

  it('restringe tipo_respuesta exactamente a TIPOS_RESPUESTA', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ReglaCorreccion1794000000000().up(queryRunner);

    const [crearTabla] = consultas;
    const bloque = crearTabla.match(
      /CHK_regla_correccion_tipo" CHECK \(\s*"tipo_respuesta" IN \(([\s\S]*?)\)\s*\)/,
    );

    expect(bloque).not.toBeNull();

    const tiposEnSql = [...(bloque?.[1].matchAll(/'([a-z_]+)'/g) ?? [])].map(
      (coincidencia) => coincidencia[1],
    );

    expect(tiposEnSql.sort()).toEqual([...TIPOS_RESPUESTA].sort());
  });

  it('revierte solo la tabla y el índice creados', async () => {
    const { consultas, queryRunner } = prepararEjecucion();

    await new ReglaCorreccion1794000000000().down(queryRunner);

    expect(consultas).toEqual([
      'DROP INDEX IF EXISTS "IDX_regla_correccion_docente_activo"',
      'DROP TABLE IF EXISTS "regla_correccion"',
    ]);
  });
});
