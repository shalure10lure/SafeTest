const base = require("./src/data-source").default;
const { DataSource } = require("typeorm");

const modulo = require("./src/migrations/1794100000000-ExamenPoolSnapshot");
const nombreClase = "ExamenPoolSnapshot1794100000000";
const Migracion = modulo[nombreClase];

if (!Migracion || typeof Migracion !== "function") {
  throw new Error("No se encontró la clase de migración: " + nombreClase);
}

const ds = new DataSource({
  ...base.options,
  migrations: [Migracion],
});

(async () => {
  await ds.initialize();

  try {
    console.log("=== VERIFICACIÓN DE CONEXIÓN ===");
    const conexion = await ds.query(`
      SELECT current_database() AS database,
             inet_server_port() AS port
    `);
    console.table(conexion);

    if (conexion[0].database !== "safetest" ||
        Number(conexion[0].port) !== 5432) {
      throw new Error("La conexión no corresponde a safetest:5432. Se cancela.");
    }

    console.log("=== VERIFICACIÓN DE MIGRACIÓN ===");
    const historial = await ds.query(`
      SELECT to_regclass('public.migrations') AS tabla
    `);

    if (historial[0].tabla) {
      const aplicada = await ds.query(`
        SELECT *
        FROM migrations
        WHERE name = $1
      `, [nombreClase]);

      if (aplicada.length > 0) {
        throw new Error("La migración ya está registrada. No se ejecutará otra vez.");
      }
    }

    console.log("=== VERIFICACIÓN DE TABLAS ===");
    const tablas = await ds.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'examen_pool_snapshot',
          'examen_pool_snapshot_tema',
          'examen_pool_snapshot_pregunta',
          'examen_pool_snapshot_inciso'
        )
    `);

    if (tablas.length > 0) {
      throw new Error("Ya existen tablas de la migración. Se cancela para evitar conflictos.");
    }

    console.log("Ejecutando exclusivamente:", nombreClase);

    const ejecutadas = await ds.runMigrations({
      transaction: "each",
    });

    console.log("=== MIGRACIONES EJECUTADAS ===");
    console.table(ejecutadas.map(m => ({
      nombre: m.name,
      timestamp: m.timestamp,
    })));

    console.log("=== VERIFICACIÓN FINAL ===");

    const tablasFinales = await ds.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'examen_pool_snapshot',
          'examen_pool_snapshot_tema',
          'examen_pool_snapshot_pregunta',
          'examen_pool_snapshot_inciso'
        )
      ORDER BY table_name
    `);

    console.table(tablasFinales);

    const indice = await ds.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'UQ_pregunta_pregunta_tema'
    `);

    console.log("=== ÍNDICE ===");
    console.table(indice);

    const registro = await ds.query(`
      SELECT *
      FROM migrations
      WHERE name = $1
    `, [nombreClase]);

    console.log("=== REGISTRO ===");
    console.table(registro);

    if (
      tablasFinales.length !== 4 ||
      indice.length !== 1 ||
      registro.length !== 1
    ) {
      throw new Error("La verificación final está incompleta. Revisar el estado antes de continuar.");
    }

    console.log("MIGRACIÓN APLICADA Y VERIFICADA CORRECTAMENTE.");
  } finally {
    await ds.destroy();
  }
})().catch(error => {
  console.error("ERROR:", error);
  process.exitCode = 1;
});


