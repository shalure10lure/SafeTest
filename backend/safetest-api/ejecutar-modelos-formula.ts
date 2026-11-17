import { DataSource } from 'typeorm';
import dataSource from './src/data-source';

const migraciones = (dataSource.options.migrations ?? []).filter(
  (migracion): migracion is string =>
    typeof migracion === 'string' &&
    migracion.includes('ModelosFormulaRendicion') &&
    !/(\.spec|\.test)\.(ts|js)$/.test(migracion),
);

async function ejecutar() {
  if (migraciones.length !== 1) {
    throw new Error(
      `Se esperaba una migración ModelosFormulaRendicion, encontradas: ${migraciones.length}`,
    );
  }

  const conexion = new DataSource({
    ...dataSource.options,
    migrations: migraciones,
  });

  try {
    await conexion.initialize();

    console.log('Base de datos:', process.env.DB_NAME);
    console.log('Puerto:', process.env.DB_PORT);
    console.log('Ejecutando ModelosFormulaRendicion...');

    const ejecutadas = await conexion.runMigrations();

    console.log(
      ejecutadas.length > 0
        ? 'MIGRACIÓN APLICADA CORRECTAMENTE.'
        : 'La migración ya estaba registrada.',
    );

    if (await conexion.showMigrations()) {
      throw new Error('La migración sigue pendiente.');
    }

    console.log('MIGRACIÓN VERIFICADA CORRECTAMENTE.');
  } catch (error) {
    console.error('ERROR:', error);
    process.exitCode = 1;
  } finally {
    if (conexion.isInitialized) {
      await conexion.destroy();
    }
  }
}

void ejecutar();
