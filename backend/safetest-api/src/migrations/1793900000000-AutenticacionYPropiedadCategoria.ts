import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutenticacionYPropiedadCategoria1793900000000
  implements MigrationInterface
{
  name = 'AutenticacionYPropiedadCategoria1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "docente"
        ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "estudiante"
        ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "categorias"
        ADD COLUMN IF NOT EXISTS "docente_id" integer`,
    );
    await queryRunner.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conname = 'FK_categorias_docente'
         ) THEN
           ALTER TABLE "categorias"
             ADD CONSTRAINT "FK_categorias_docente"
             FOREIGN KEY ("docente_id")
             REFERENCES "docente"("docente_id")
             ON DELETE SET NULL
             ON UPDATE NO ACTION;
         END IF;
       END $$`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_categorias_docente_id"
        ON "categorias" ("docente_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_categorias_docente_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categorias"
        DROP CONSTRAINT IF EXISTS "FK_categorias_docente",
        DROP COLUMN IF EXISTS "docente_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estudiante" DROP COLUMN IF EXISTS "activo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP COLUMN IF EXISTS "activo"`,
    );
  }
}
