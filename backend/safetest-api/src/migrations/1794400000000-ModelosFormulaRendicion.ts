import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModelosFormulaRendicion1794400000000 implements MigrationInterface {
  name = 'ModelosFormulaRendicion1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "modelo" (
        "modelo_id" SERIAL NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "descripcion" text,
        "variables" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_modelo" PRIMARY KEY ("modelo_id"),
        CONSTRAINT "CHK_modelo_variables_objeto"
          CHECK (jsonb_typeof("variables") = 'object')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pregunta_modelo" (
        "pregunta_id" integer NOT NULL,
        "modelo_id" integer NOT NULL,
        CONSTRAINT "PK_pregunta_modelo"
          PRIMARY KEY ("pregunta_id", "modelo_id"),
        CONSTRAINT "FK_pregunta_modelo_pregunta" FOREIGN KEY ("pregunta_id")
          REFERENCES "pregunta"("pregunta_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_pregunta_modelo_modelo" FOREIGN KEY ("modelo_id")
          REFERENCES "modelo"("modelo_id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "modelo_formula" (
        "modelo_id" integer NOT NULL,
        "formula_id" integer NOT NULL,
        CONSTRAINT "PK_modelo_formula"
          PRIMARY KEY ("modelo_id", "formula_id"),
        CONSTRAINT "FK_modelo_formula_modelo" FOREIGN KEY ("modelo_id")
          REFERENCES "modelo"("modelo_id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_modelo_formula_formula" FOREIGN KEY ("formula_id")
          REFERENCES "formula"("formula_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "respuesta_modelo" (
        "estudiante_id" integer NOT NULL,
        "examen_id" integer NOT NULL,
        "pregunta_id" integer NOT NULL,
        "letra" character varying NOT NULL,
        "modelo_id" integer NOT NULL,
        "valores" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "resultado_final" text,
        "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_respuesta_modelo"
          PRIMARY KEY ("estudiante_id", "examen_id", "pregunta_id", "letra"),
        CONSTRAINT "CHK_respuesta_modelo_valores_objeto"
          CHECK (jsonb_typeof("valores") = 'object'),
        CONSTRAINT "FK_respuesta_modelo_respuesta_inciso"
          FOREIGN KEY ("estudiante_id", "examen_id", "pregunta_id", "letra")
          REFERENCES "respuesta_inciso"
            ("estudiante_id", "examen_id", "pregunta_id", "letra")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_respuesta_modelo_pregunta_modelo"
          FOREIGN KEY ("pregunta_id", "modelo_id")
          REFERENCES "pregunta_modelo" ("pregunta_id", "modelo_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_modelo_activo_nombre"
        ON "modelo" ("activo", "nombre")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pregunta_modelo_modelo"
        ON "pregunta_modelo" ("modelo_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_modelo_formula_formula"
        ON "modelo_formula" ("formula_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_respuesta_modelo_modelo"
        ON "respuesta_modelo" ("modelo_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "respuesta_modelo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modelo_formula"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pregunta_modelo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modelo"`);
  }
}
