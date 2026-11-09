import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecursosPregunta1793900000000 implements MigrationInterface {
  name = 'RecursosPregunta1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Los recursos que ya existieran se consideran imágenes: es el único tipo
    // que la tabla podía representar antes (una ruta o nombre de archivo).
    await queryRunner.query(`
      ALTER TABLE "pregunta_recurso"
        ADD COLUMN IF NOT EXISTS "tipo" character varying(10) NOT NULL DEFAULT 'imagen',
        ADD COLUMN IF NOT EXISTS "contenido" text,
        ADD COLUMN IF NOT EXISTS "mime_type" character varying(100),
        ADD COLUMN IF NOT EXISTS "nombre_original" character varying(255),
        ADD COLUMN IF NOT EXISTS "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "pregunta_recurso"
        ADD CONSTRAINT "CHK_pregunta_recurso_tipo"
        CHECK ("tipo" IN ('imagen', 'tabla', 'formula'))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pregunta_recurso_pregunta"
        ON "pregunta_recurso" ("pregunta_id", "creado_en")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pregunta_recurso_pregunta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pregunta_recurso" DROP CONSTRAINT IF EXISTS "CHK_pregunta_recurso_tipo"`,
    );
    await queryRunner.query(`
      ALTER TABLE "pregunta_recurso"
        DROP COLUMN IF EXISTS "creado_en",
        DROP COLUMN IF EXISTS "nombre_original",
        DROP COLUMN IF EXISTS "mime_type",
        DROP COLUMN IF EXISTS "contenido",
        DROP COLUMN IF EXISTS "tipo"
    `);
  }
}