import 'dotenv/config';
import { DataSource } from 'typeorm';
import configuracion from './src/data-source';
import { Hu43BloqueoPrimerCambio1794700000000 } from './src/migrations/1794700000000-Hu43BloqueoPrimerCambio';

async function ejecutar() {
  // Solo HU-43; NO ejecuta las demás migraciones pendientes.
  const conexion = new DataSource({
    ...configuracion.options,
    migrations: [Hu43BloqueoPrimerCambio1794700000000],
  });

  try {
    await conexion.initialize();
    console.log('Base de datos:', conexion.options.type === 'postgres'
      ? conexion.options.database : 'verifique la conexión');
    const realizadas = await conexion.runMigrations();
    console.log(realizadas.length > 0
      ? 'Migración HU-43 aplicada correctamente.'
      : 'HU-43 ya estaba aplicada; no se repitió.');
    if (await conexion.showMigrations()) {
      throw new Error('HU-43 sigue pendiente según TypeORM.');
    }
    console.log('HU-43 verificada.');
  } finally {
    if (conexion.isInitialized) await conexion.destroy();
  }
}

void ejecutar().catch((error: unknown) => {
  console.error('No se pudo aplicar la migración HU-43:', error);
  process.exitCode = 1;
});
