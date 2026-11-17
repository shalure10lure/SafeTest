import { DataSource } from 'typeorm';
import dataSource from './src/data-source';
import { SepararPublicacionRespuestas1794600000000 } from './src/migrations/1794600000000-SepararPublicacionRespuestas';

/** Ejecuta SOLO la migración HU-32, sin tocar las demás pendientes. */
async function ejecutar() {
  const conexion = new DataSource({
    ...dataSource.options,
    migrations: [SepararPublicacionRespuestas1794600000000],
  });
  try {
    await conexion.initialize();
    console.log('Base de datos:', process.env.DB_NAME);
    console.log('Puerto:', process.env.DB_PORT);
    console.log('Migración HU-32:', SepararPublicacionRespuestas1794600000000.name);
    const ejecutadas = await conexion.runMigrations();
    console.log(ejecutadas.length ? 'MIGRACIÓN HU-32 APLICADA.' : 'La migración HU-32 ya estaba registrada.');
    if (await conexion.showMigrations()) throw new Error('HU-32 sigue pendiente.');
    console.log('MIGRACIÓN HU-32 VERIFICADA CORRECTAMENTE.');
  } catch (error) {
    console.error('ERROR EN MIGRACIÓN HU-32:', error);
    process.exitCode = 1;
  } finally {
    if (conexion.isInitialized) await conexion.destroy();
  }
}
void ejecutar();
