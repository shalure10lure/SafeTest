import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SepararPublicacionRespuestas1794600000000 implements MigrationInterface {
  name = 'SepararPublicacionRespuestas1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz',
    );
    // Sin backfill (alternativa A'): publicar resultados NO autoriza por sí
    // mismo la publicación de respuestas correctas. La fecha heredada del
    // examen 19 no se copia; su `resultados_publicados_en` se limpia en un
    // paso separado y controlado. El docente decide después, de forma
    // explícita, qué publicar y cuándo.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "examen" DROP COLUMN IF EXISTS "respuestas_publicadas_en"');
  }
}
