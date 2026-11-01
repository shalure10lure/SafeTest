import { MigrationInterface, QueryRunner } from "typeorm";

export class FechaCreacionPregunta1793600000000 implements MigrationInterface {
    name = 'FechaCreacionPregunta1793600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Las preguntas existentes no tenían fecha; se les asigna la fecha
        // en que se aplica esta migración.
        await queryRunner.query(`ALTER TABLE "pregunta" ADD "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pregunta" DROP COLUMN "creado_en"`);
    }
}
