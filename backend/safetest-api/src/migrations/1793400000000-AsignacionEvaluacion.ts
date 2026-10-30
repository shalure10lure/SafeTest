import { MigrationInterface, QueryRunner } from "typeorm";

export class AsignacionEvaluacion1793400000000 implements MigrationInterface {
    name = 'AsignacionEvaluacion1793400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examen" ADD "modo_asignacion" character varying(20) NOT NULL DEFAULT 'paralelos'`);
        await queryRunner.query(`CREATE TABLE "examen_estudiante" ("examen_id" integer NOT NULL, "estudiante_id" integer NOT NULL, CONSTRAINT "PK_3c0611e03a36f6be91b7335d57f" PRIMARY KEY ("examen_id", "estudiante_id"))`);
        await queryRunner.query(`ALTER TABLE "examen_estudiante" ADD CONSTRAINT "FK_149290b7c900a1e7ddbe0d5ca75" FOREIGN KEY ("examen_id") REFERENCES "examen"("examen_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "examen_estudiante" ADD CONSTRAINT "FK_550baef47273c7eb129ea3da8ae" FOREIGN KEY ("estudiante_id") REFERENCES "estudiante"("estudiante_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "examen_estudiante" DROP CONSTRAINT "FK_550baef47273c7eb129ea3da8ae"`);
        await queryRunner.query(`ALTER TABLE "examen_estudiante" DROP CONSTRAINT "FK_149290b7c900a1e7ddbe0d5ca75"`);
        await queryRunner.query(`DROP TABLE "examen_estudiante"`);
        await queryRunner.query(`ALTER TABLE "examen" DROP COLUMN "modo_asignacion"`);
    }
}