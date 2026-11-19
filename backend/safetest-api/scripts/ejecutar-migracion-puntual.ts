/**
 * Ejecuta UNA sola migración de TypeORM, de forma explícita y transaccional.
 *
 * Uso:
 *   npx ts-node --transpile-only scripts/ejecutar-migracion-puntual.ts \
 *     --migracion=ModelosFormulaRendicion1794400000000 \
 *     --confirmar-base=safetest
 *
 * Garantías:
 * - Solo permite las migraciones de la lista blanca.
 * - Aborta si la base destino no es `safetest` o el puerto del servidor no es 5432.
 * - Aborta si hay migraciones pendientes fuera de la lista blanca.
 * - Ejecuta exactamente la migración indicada, dentro de una transacción.
 * - Nunca llama a executePendingMigrations ni a migration:run.
 */
import 'dotenv/config';

import { MigrationExecutor } from 'typeorm';

import dataSource from '../src/data-source';

/** Migraciones aprobadas para ejecución puntual. */
const MIGRACIONES_PERMITIDAS = new Set([
  'ModelosFormulaRendicion1794400000000',
  'RevisionCalificaciones1794500000000',
  'SepararPublicacionRespuestas1794600000000',
]);

const BASE_ESPERADA = 'safetest';
const PUERTO_SERVIDOR_ESPERADO = 5432;

function leerArgumento(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((arg) => arg.startsWith(prefijo));

  return encontrado?.slice(prefijo.length);
}

function abortar(mensaje: string): never {
  console.error(`\n[ABORTADO] ${mensaje}\n`);
  process.exit(1);
}

async function principal(): Promise<void> {
  const nombreMigracion = leerArgumento('migracion');
  const baseConfirmada = leerArgumento('confirmar-base');

  if (!nombreMigracion) {
    abortar('Falta --migracion=<NombreClase>.');
  }

  if (baseConfirmada !== BASE_ESPERADA) {
    abortar(`Falta --confirmar-base=${BASE_ESPERADA}.`);
  }

  if (!MIGRACIONES_PERMITIDAS.has(nombreMigracion)) {
    abortar(`La migración "${nombreMigracion}" no está en la lista blanca.`);
  }

  if (process.env.DB_NAME !== BASE_ESPERADA) {
    abortar(
      `DB_NAME es "${process.env.DB_NAME ?? '(sin definir)'}", se esperaba "${BASE_ESPERADA}".`,
    );
  }

  console.log('Conectando al destino configurado...');
  console.log(
    `  DB_NAME=${process.env.DB_NAME}  DB_PORT=${process.env.DB_PORT}  migración=${nombreMigracion}`,
  );

  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const [destino] = await dataSource.query(
      `SELECT current_database() AS base,
              inet_server_port()  AS puerto,
              inet_server_addr()::text AS host_servidor`,
    );

    console.log(
      `Destino real: base=${destino.base} puerto_servidor=${destino.puerto}`,
    );

    if (destino.base !== BASE_ESPERADA) {
      abortar(`La base conectada es "${destino.base}", se esperaba "${BASE_ESPERADA}".`);
    }

    if (Number(destino.puerto) !== PUERTO_SERVIDOR_ESPERADO) {
      abortar(
        `El puerto del servidor es ${destino.puerto}, se esperaba ${PUERTO_SERVIDOR_ESPERADO}.`,
      );
    }

    const ejecutor = new MigrationExecutor(dataSource, queryRunner);
    const pendientes = await ejecutor.getPendingMigrations();
    const nombresPendientes = pendientes.map((migracion) => migracion.name);

    console.log(`Pendientes detectadas (${nombresPendientes.length}):`);
    for (const nombre of nombresPendientes) {
      console.log(`  - ${nombre}`);
    }

    const fueraDeLista = nombresPendientes.filter(
      (nombre) => !MIGRACIONES_PERMITIDAS.has(nombre),
    );

    if (fueraDeLista.length > 0) {
      abortar(
        `Hay migraciones pendientes no autorizadas: ${fueraDeLista.join(', ')}.`,
      );
    }

    const objetivo = pendientes.find(
      (migracion) => migracion.name === nombreMigracion,
    );

    if (!objetivo) {
      abortar(
        `La migración "${nombreMigracion}" no está pendiente. No se ejecutó nada.`,
      );
    }

    console.log(`\nEjecutando únicamente: ${objetivo.name}`);
    console.log(`  timestamp=${objetivo.timestamp}`);

    await queryRunner.startTransaction();

    try {
      await ejecutor.executeMigration(objetivo);
      await queryRunner.commitTransaction();
      console.log('\n[OK] Migración confirmada (commit).');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('\n[ERROR] Se revirtió la transacción.');
      throw error;
    }

    const registradas = await dataSource.query(
      `SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 3`,
    );

    console.log('\nÚltimos registros en migrations:');
    for (const fila of registradas) {
      console.log(`  ${fila.id} | ${fila.timestamp} | ${fila.name}`);
    }
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

principal().catch((error) => {
  console.error('\n[FALLO]', error instanceof Error ? error.message : error);
  process.exit(1);
});
