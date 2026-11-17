import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SepararPublicacionRespuestas1794600000000 implements MigrationInterface {
  name = 'SepararPublicacionRespuestas1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz',
    );
    // Mantiene visibles las soluciones que YA habían sido autorizadas por
    // el endpoint antiguo. Las nuevas publicaciones de notas no las liberan.
    await queryRunner.query(`
      UPDATE "examen"
      SET "respuestas_publicadas_en" = "resultados_publicados_en"
      WHERE "resultados_publicados_en" IS NOT NULL
        AND "respuestas_publicadas_en" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "examen" DROP COLUMN IF EXISTS "respuestas_publicadas_en"');
  }
}
