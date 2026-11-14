import { MigrationInterface, QueryRunner } from 'typeorm';

// Puntaje total de la evaluación, definido por el docente en el paso 3
// (Configuración). La columna es opcional para las evaluaciones creadas
// antes de esta versión; la restricción impide valores no positivos.
export class PuntajeTotalExamen1794200000000 implements MigrationInterface {
  name = 'PuntajeTotalExamen1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "puntaje_total" numeric(12,2)`,
    );

    await queryRunner.query(
      `ALTER TABLE "examen" ADD CONSTRAINT "CHK_examen_puntaje_total_positivo" CHECK ("puntaje_total" IS NULL OR "puntaje_total" > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "examen" DROP CONSTRAINT IF EXISTS "CHK_examen_puntaje_total_positivo"`,
    );

    await queryRunner.query(
      `ALTER TABLE "examen" DROP COLUMN IF EXISTS "puntaje_total"`,
    );
  }
}