import { MigrationInterface, QueryRunner } from "typeorm";

export class CorreoVerificadoEstudiante1793500000000 implements MigrationInterface {
    name = 'CorreoVerificadoEstudiante1793500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // La entidad Estudiante y el flujo de invitaciones ya usan esta columna,
        // pero ninguna migración la creaba.
        await queryRunner.query(`ALTER TABLE "estudiante" ADD "correo_verificado" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "estudiante" DROP COLUMN "correo_verificado"`);
    }
}
