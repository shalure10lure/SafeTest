import { DataSource } from 'typeorm';
import dataSource from './src/data-source';

import { RevisionCalificaciones1794500000000 } from
  './src/migrations/1794500000000-RevisionCalificaciones';

async function ejecutar() {
  const conexion = new DataSource({
    ...dataSource.options,
    migrations: [RevisionCalificaciones1794500000000],
  });

  try {
    await conexion.initialize();

    console.log('Base de datos:', process.env.DB_NAME);
    console.log('Puerto:', process.env.DB_PORT);
    console.log('Ejecutando únicamente la migración HU-31...');

    const ejecutadas = await conexion.runMigrations();

    if (ejecutadas.length === 0) {
      console.log('La migración ya estaba registrada.');
    } else {
      console.log('MIGRACIÓN HU-31 APLICADA CORRECTAMENTE.');
    }

    const pendientes = await conexion.showMigrations();

    if (pendientes) {
      throw new Error('La migración HU-31 sigue pendiente.');
    }

    console.log('MIGRACIÓN VERIFICADA CORRECTAMENTE.');
  } catch (error) {
    console.error('ERROR AL EJECUTAR LA MIGRACIÓN:', error);
    process.exitCode = 1;
  } finally {
    if (conexion.isInitialized) {
      await conexion.destroy();
    }
  }
}

ejecutar();