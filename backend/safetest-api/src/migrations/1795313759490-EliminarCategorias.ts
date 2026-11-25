import { MigrationInterface, QueryRunner } from "typeorm";

export class EliminarCategorias1795313759490 implements MigrationInterface {
    name = "EliminarCategorias1795313759490";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "categorias"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "categorias" (
                "id" SERIAL NOT NULL,
                "nombre" character varying(100) NOT NULL,
                "descripcion" character varying(255),
                "docente_id" integer,
                CONSTRAINT "PK_3886a26251605c571c6b4f861fe"
                    PRIMARY KEY ("id"),
                CONSTRAINT "FK_categorias_docente"
                    FOREIGN KEY ("docente_id")
                    REFERENCES "docente"("docente_id")
                    ON DELETE SET NULL
                    ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_categorias_docente_id"
            ON "categorias" ("docente_id")
        `);
    }
}