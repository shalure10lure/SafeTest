import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamenPoolSnapshot1794100000000 implements MigrationInterface {
  name = 'ExamenPoolSnapshot1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_pregunta_pregunta_tema"
        ON "pregunta" ("pregunta_id", "tema_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "examen_pool_snapshot" (
        "examen_id" integer NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "puntaje_maximo_garantizado" numeric NOT NULL,
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_examen_pool_snapshot" PRIMARY KEY ("examen_id"),
        CONSTRAINT "CHK_examen_pool_snapshot_version" CHECK ("version" > 0),
        CONSTRAINT "CHK_examen_pool_snapshot_puntaje"
          CHECK ("puntaje_maximo_garantizado" > 0),
        CONSTRAINT "FK_examen_pool_snapshot_examen" FOREIGN KEY ("examen_id")
          REFERENCES "examen"("examen_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "examen_pool_snapshot_tema" (
        "examen_id" integer NOT NULL,
        "tema_id" integer NOT NULL,
        "cantidad_seleccionada" integer NOT NULL,
        "cantidad_candidatas" integer NOT NULL,
        "puntaje_maximo_tema" numeric NOT NULL,
        CONSTRAINT "PK_examen_pool_snapshot_tema"
          PRIMARY KEY ("examen_id", "tema_id"),
        CONSTRAINT "CHK_epst_cantidad_seleccionada"
          CHECK ("cantidad_seleccionada" > 0),
        CONSTRAINT "CHK_epst_cantidad_candidatas"
          CHECK ("cantidad_candidatas" > 0),
        CONSTRAINT "CHK_epst_cantidad"
          CHECK ("cantidad_seleccionada" <= "cantidad_candidatas"),
        CONSTRAINT "CHK_epst_puntaje"
          CHECK ("puntaje_maximo_tema" > 0),
        CONSTRAINT "FK_epst_snapshot" FOREIGN KEY ("examen_id")
          REFERENCES "examen_pool_snapshot"("examen_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_epst_examen_tema"
          FOREIGN KEY ("examen_id", "tema_id")
          REFERENCES "examen_tema"("examen_id", "tema_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "examen_pool_snapshot_pregunta" (
        "examen_id" integer NOT NULL,
        "tema_id" integer NOT NULL,
        "pregunta_id" integer NOT NULL,
        "puntaje_maximo_pregunta" numeric NOT NULL,
        CONSTRAINT "PK_examen_pool_snapshot_pregunta"
          PRIMARY KEY ("examen_id", "tema_id", "pregunta_id"),
        CONSTRAINT "UQ_epsp_examen_pregunta"
          UNIQUE ("examen_id", "pregunta_id"),
        CONSTRAINT "CHK_epsp_puntaje"
          CHECK ("puntaje_maximo_pregunta" > 0),
        CONSTRAINT "FK_epsp_tema"
          FOREIGN KEY ("examen_id", "tema_id")
          REFERENCES "examen_pool_snapshot_tema"("examen_id", "tema_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_epsp_pregunta_tema"
          FOREIGN KEY ("pregunta_id", "tema_id")
          REFERENCES "pregunta"("pregunta_id", "tema_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "examen_pool_snapshot_inciso" (
        "examen_id" integer NOT NULL,
        "tema_id" integer NOT NULL,
        "pregunta_id" integer NOT NULL,
        "letra" character varying NOT NULL,
        "puntaje_max" numeric NOT NULL,
        CONSTRAINT "PK_examen_pool_snapshot_inciso"
          PRIMARY KEY ("examen_id", "tema_id", "pregunta_id", "letra"),
        CONSTRAINT "CHK_epsi_puntaje" CHECK ("puntaje_max" > 0),
        CONSTRAINT "FK_epsi_pregunta_snapshot"
          FOREIGN KEY ("examen_id", "tema_id", "pregunta_id")
          REFERENCES "examen_pool_snapshot_pregunta"
            ("examen_id", "tema_id", "pregunta_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_epsi_inciso"
          FOREIGN KEY ("pregunta_id", "letra")
          REFERENCES "inciso"("pregunta_id", "letra")
          ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "examen_pool_snapshot_inciso"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "examen_pool_snapshot_pregunta"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "examen_pool_snapshot_tema"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "examen_pool_snapshot"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_pregunta_pregunta_tema"`);
  }
}
