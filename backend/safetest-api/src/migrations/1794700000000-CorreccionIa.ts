import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorreccionIa1794700000000 implements MigrationInterface {
  name = 'CorreccionIa1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "correccion_ia" (
        "propuesta_id" SERIAL NOT NULL,
        "estudiante_id" integer NOT NULL,
        "examen_id" integer NOT NULL,
        "pregunta_id" integer NOT NULL,
        "letra" character varying NOT NULL,
        "docente_id" integer NOT NULL,
        "estado" character varying(15) NOT NULL DEFAULT 'pendiente',
        "puntaje_sugerido" numeric(6,2),
        "puntaje_max_inciso" numeric(6,2),
        "valoracion" text,
        "explicacion" text,
        "errores" jsonb,
        "confianza" numeric(3,2),
        "criterio_fuente" character varying(30),
        "criterio_hash" character varying(64),
        "modelo" character varying(100),
        "proveedor" character varying(30),
        "intento" smallint NOT NULL DEFAULT 1,
        "reintentos_worker" integer NOT NULL DEFAULT 0,
        "version" integer NOT NULL DEFAULT 1,
        "creada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "iniciada_en" TIMESTAMP WITH TIME ZONE,
        "finalizada_en" TIMESTAMP WITH TIME ZONE,
        "actualizada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "revisada_en" TIMESTAMP WITH TIME ZONE,
        "revisada_por_docente_id" integer,
        "reemplazada_por_id" integer,
        "error_codigo" character varying(40),
        "error_mensaje" character varying(500),
        "motivo" character varying(300),
        CONSTRAINT "PK_correccion_ia" PRIMARY KEY ("propuesta_id"),
        CONSTRAINT "FK_correccion_ia_respuesta"
          FOREIGN KEY ("estudiante_id", "examen_id", "pregunta_id", "letra")
          REFERENCES "respuesta_inciso" ("estudiante_id", "examen_id", "pregunta_id", "letra")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_correccion_ia_docente"
          FOREIGN KEY ("docente_id")
          REFERENCES "docente" ("docente_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_correccion_ia_revisor"
          FOREIGN KEY ("revisada_por_docente_id")
          REFERENCES "docente" ("docente_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_correccion_ia_reemplazo"
          FOREIGN KEY ("reemplazada_por_id")
          REFERENCES "correccion_ia" ("propuesta_id")
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CHK_correccion_ia_estado"
          CHECK ("estado" IN (
            'pendiente', 'procesando', 'generada', 'modificada',
            'aceptada', 'descartada', 'error', 'reemplazada'
          )),
        CONSTRAINT "CHK_correccion_ia_confianza"
          CHECK ("confianza" IS NULL OR ("confianza" >= 0 AND "confianza" <= 1)),
        CONSTRAINT "CHK_correccion_ia_puntaje_no_negativo"
          CHECK ("puntaje_sugerido" IS NULL OR "puntaje_sugerido" >= 0),
        CONSTRAINT "CHK_correccion_ia_puntaje_dentro_max"
          CHECK (
            "puntaje_sugerido" IS NULL OR "puntaje_max_inciso" IS NULL
            OR "puntaje_sugerido" <= "puntaje_max_inciso"
          ),
        CONSTRAINT "CHK_correccion_ia_intento" CHECK ("intento" >= 1),
        CONSTRAINT "CHK_correccion_ia_version" CHECK ("version" >= 1),
        CONSTRAINT "CHK_correccion_ia_reintentos_worker"
          CHECK ("reintentos_worker" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UX_correccion_ia_activa"
      ON "correccion_ia" ("estudiante_id", "examen_id", "pregunta_id", "letra")
      WHERE "estado" IN ('pendiente', 'procesando', 'generada', 'modificada')
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UX_correccion_ia_intento"
      ON "correccion_ia" ("estudiante_id", "examen_id", "pregunta_id", "letra", "intento")
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_examen_estado"
      ON "correccion_ia" ("examen_id", "estado")
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_docente_estado"
      ON "correccion_ia" ("docente_id", "estado")
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_revisada_por_docente"
      ON "correccion_ia" ("revisada_por_docente_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_reemplazada_por"
      ON "correccion_ia" ("reemplazada_por_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_historial"
      ON "correccion_ia" (
        "estudiante_id", "examen_id", "pregunta_id", "letra", "creada_en" DESC
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IX_correccion_ia_lease"
      ON "correccion_ia" ("iniciada_en")
      WHERE "estado" = 'procesando'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "correccion_ia"');
  }
}
