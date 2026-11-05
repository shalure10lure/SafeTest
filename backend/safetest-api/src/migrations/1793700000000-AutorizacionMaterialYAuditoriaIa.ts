import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutorizacionMaterialYAuditoriaIa1793700000000
  implements MigrationInterface
{
  name = 'AutorizacionMaterialYAuditoriaIa1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Autorización explícita para IA: 'activo' indica disponibilidad del
    // material, no consentimiento para enviar su texto a un proveedor externo.
    await queryRunner.query(
      `ALTER TABLE "material_academico"
        ADD COLUMN IF NOT EXISTS "autorizado_ia" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "autorizado_en" TIMESTAMP WITH TIME ZONE`,
    );

    // Auditoría del procesamiento asíncrono de cada generación.
    await queryRunner.query(
      `ALTER TABLE "ia_generacion"
        ADD COLUMN IF NOT EXISTS "proveedor" character varying(30),
        ADD COLUMN IF NOT EXISTS "cantidad_generada" integer,
        ADD COLUMN IF NOT EXISTS "tokens_entrada" integer,
        ADD COLUMN IF NOT EXISTS "tokens_salida" integer,
        ADD COLUMN IF NOT EXISTS "tokens_total" integer,
        ADD COLUMN IF NOT EXISTS "error_mensaje" character varying(500),
        ADD COLUMN IF NOT EXISTS "iniciada_en" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "finalizada_en" TIMESTAMP WITH TIME ZONE`,
    );

    // Toda generación nueva nace pendiente y queda a la espera del worker.
    await queryRunner.query(
      `ALTER TABLE "ia_generacion" ALTER COLUMN "estado" SET DEFAULT 'pendiente'`,
    );

    // El índice único parcial no puede crearse si ya hay dos propuestas
    // apuntando a la misma pregunta; se aborta con un mensaje claro en vez
    // de modificar o borrar datos.
    const resultado: { duplicados: number }[] = await queryRunner.query(
      `SELECT count(*)::int AS "duplicados"
       FROM (
         SELECT "pregunta_id"
         FROM "ia_propuesta_pregunta"
         WHERE "pregunta_id" IS NOT NULL
         GROUP BY "pregunta_id"
         HAVING count(*) > 1
       ) AS "repetidas"`,
    );

    const duplicados = resultado[0]?.duplicados ?? 0;

    if (duplicados > 0) {
      throw new Error(
        `No se puede crear el índice único de ia_propuesta_pregunta: ${duplicados} pregunta(s) están referenciadas por más de una propuesta. Resuelve los duplicados antes de aplicar la migración.`,
      );
    }

    // Una pregunta del banco solo puede provenir de una propuesta aceptada.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ia_propuesta_pregunta_pregunta"
        ON "ia_propuesta_pregunta" ("pregunta_id")
        WHERE "pregunta_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ia_generacion_docente_fecha"
        ON "ia_generacion" ("docente_id", "fecha" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ia_propuesta_generacion"
        ON "ia_propuesta_pregunta" ("generacion_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_material_docente_materia"
        ON "material_academico" ("docente_id", "materia_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_material_docente_materia"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ia_propuesta_generacion"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ia_generacion_docente_fecha"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_ia_propuesta_pregunta_pregunta"`,
    );

    await queryRunner.query(
      `ALTER TABLE "ia_generacion" ALTER COLUMN "estado" SET DEFAULT 'completada'`,
    );

    await queryRunner.query(
      `ALTER TABLE "ia_generacion"
        DROP COLUMN IF EXISTS "finalizada_en",
        DROP COLUMN IF EXISTS "iniciada_en",
        DROP COLUMN IF EXISTS "error_mensaje",
        DROP COLUMN IF EXISTS "tokens_total",
        DROP COLUMN IF EXISTS "tokens_salida",
        DROP COLUMN IF EXISTS "tokens_entrada",
        DROP COLUMN IF EXISTS "cantidad_generada",
        DROP COLUMN IF EXISTS "proveedor"`,
    );

    await queryRunner.query(
      `ALTER TABLE "material_academico"
        DROP COLUMN IF EXISTS "autorizado_en",
        DROP COLUMN IF EXISTS "autorizado_ia"`,
    );
  }
}
