import { MigrationInterface, QueryRunner } from 'typeorm';

// HU-29 T1: persistencia de reglas de corrección configurables.
// Esta migración únicamente crea la tabla "regla_correccion" y su índice.
// No altera tablas, columnas ni datos existentes.
export class ReglaCorreccion1794000000000 implements MigrationInterface {
  name = 'ReglaCorreccion1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "regla_correccion" (
        "regla_id" SERIAL NOT NULL,
        "docente_id" integer NOT NULL,
        "tipo_respuesta" character varying(30) NOT NULL,
        "parametros" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_regla_correccion" PRIMARY KEY ("regla_id"),
        CONSTRAINT "UQ_regla_correccion_docente_tipo" UNIQUE ("docente_id", "tipo_respuesta"),
        CONSTRAINT "CHK_regla_correccion_tipo" CHECK (
          "tipo_respuesta" IN (
            'opcion_unica',
            'opcion_multiple',
            'verdadero_falso',
            'desarrollo',
            'numerica'
          )
        ),
        CONSTRAINT "CHK_regla_correccion_parametros" CHECK (
          jsonb_typeof("parametros") = 'object'
        ),
        CONSTRAINT "FK_regla_correccion_docente" FOREIGN KEY ("docente_id")
          REFERENCES "docente"("docente_id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_regla_correccion_docente_activo"
        ON "regla_correccion" ("docente_id", "activo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_regla_correccion_docente_activo"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "regla_correccion"`);
  }
}
