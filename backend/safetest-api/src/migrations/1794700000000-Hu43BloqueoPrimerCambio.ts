import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HU-43. Solo incorpora datos; el bloqueo efectivo se implementa
 * en el servicio de rendición y en el registro de eventos.
 */
export class Hu43BloqueoPrimerCambio1794700000000 implements MigrationInterface {
  name = 'Hu43BloqueoPrimerCambio1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "examen"
      ADD COLUMN "bloquear_primer_cambio_pestana" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "rendicion"
      ADD COLUMN "bloqueada_seguridad_en" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rendicion" DROP COLUMN "bloqueada_seguridad_en"
    `);
    await queryRunner.query(`
      ALTER TABLE "examen" DROP COLUMN "bloquear_primer_cambio_pestana"
    `);
  }
}
