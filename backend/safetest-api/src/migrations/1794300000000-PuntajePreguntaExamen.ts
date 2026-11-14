import { MigrationInterface, QueryRunner } from 'typeorm';

// Puntaje propio de cada pregunta dentro de una evaluación. Al agregar una
// pregunta el valor inicial es la suma de los `puntaje_max` de sus incisos
// (puntaje del banco); después el docente puede ajustarlo sin modificar el
// banco. La columna es opcional para no romper evaluaciones ya existentes y la
// restricción impide valores no positivos.
export class PuntajePreguntaExamen1794300000000 implements MigrationInterface {
  name = 'PuntajePreguntaExamen1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "examen_pregunta" ADD COLUMN IF NOT EXISTS "puntaje" numeric(12,2)`,
    );

    // Inicializa las filas existentes con el puntaje actual del banco. Solo
    // completa valores nulos y sumas positivas: las preguntas inválidas se
    // dejan en NULL para que la validación de publicación las informe.
    await queryRunner.query(`
      UPDATE "examen_pregunta" AS ep
         SET "puntaje" = sub."puntaje"
        FROM (
          SELECT "pregunta_id", SUM("puntaje_max") AS "puntaje"
            FROM "inciso"
           GROUP BY "pregunta_id"
          HAVING SUM("puntaje_max") > 0
        ) AS sub
       WHERE ep."pregunta_id" = sub."pregunta_id"
         AND ep."puntaje" IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "examen_pregunta" ADD CONSTRAINT "CHK_examen_pregunta_puntaje_positivo" CHECK ("puntaje" IS NULL OR "puntaje" > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "examen_pregunta" DROP CONSTRAINT IF EXISTS "CHK_examen_pregunta_puntaje_positivo"`,
    );

    await queryRunner.query(
      `ALTER TABLE "examen_pregunta" DROP COLUMN IF EXISTS "puntaje"`,
    );
  }
}