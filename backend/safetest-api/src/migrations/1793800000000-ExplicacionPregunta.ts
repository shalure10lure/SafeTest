import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExplicacionPregunta1793800000000 implements MigrationInterface {
  name = 'ExplicacionPregunta1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pregunta" ADD COLUMN IF NOT EXISTS "explicacion" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pregunta" DROP COLUMN IF EXISTS "explicacion"`,
    );
  }
}
