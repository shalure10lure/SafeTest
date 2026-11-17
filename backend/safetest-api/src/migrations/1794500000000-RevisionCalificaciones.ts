import { MigrationInterface, QueryRunner } from 'typeorm';

/** HU-31: confirmación docente independiente de la publicación (HU-32). */
export class RevisionCalificaciones1794500000000 implements MigrationInterface {
  name = 'RevisionCalificaciones1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "examen"
      ADD COLUMN IF NOT EXISTS "calificaciones_revisadas_en" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "examen"
      DROP COLUMN IF EXISTS "calificaciones_revisadas_en"
    `);
  }
}
