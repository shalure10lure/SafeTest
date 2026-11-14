const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;
const modulo = require("./src/migrations/1793900000000-RecursosPregunta");

const nombres = Object.keys(modulo);

if (nombres.length !== 1) {
    throw new Error("No se pudo identificar una única clase de migración.");
}

const Migracion = modulo[nombres[0]];
const instancia = new Migracion();

if (
    typeof instancia.up !== "function" ||
    typeof instancia.down !== "function"
) {
    throw new Error("La clase no implementa correctamente MigrationInterface.");
}

const ds = new DataSource({
    ...base.options,
    migrations: [Migracion],
});

(async () => {
    await ds.initialize();

    try {
        const [conexion] = await ds.query(`
            SELECT current_database() AS database,
                   inet_server_port() AS port
        `);

        console.table([conexion]);

        if (
            conexion.database !== "safetest" ||
            Number(conexion.port) !== 5432
        ) {
            throw new Error("Base de datos no autorizada.");
        }

        const historial = await ds.query(
            `SELECT name FROM migrations WHERE name = $1`,
            [instancia.name]
        );

        if (historial.length > 0) {
            throw new Error("La migración ya está registrada.");
        }

        const columnas = await ds.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pregunta_recurso'
              AND column_name IN (
                'tipo', 'contenido', 'mime_type',
                'nombre_original', 'creado_en'
              )
        `);

        if (columnas.length > 0) {
            throw new Error("Ya existen columnas de esta migración.");
        }

        console.log("Validaciones correctas.");
        console.log("Ejecutando:", instancia.name);

        const ejecutadas = await ds.runMigrations({
            transaction: "each"
        });

        console.table(ejecutadas.map(m => ({
            nombre: m.name,
            timestamp: m.timestamp
        })));

        const finales = await ds.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pregunta_recurso'
            ORDER BY ordinal_position
        `);

        console.log("=== COLUMNAS FINALES ===");
        console.table(finales);

        const registro = await ds.query(
            `SELECT name FROM migrations WHERE name = $1`,
            [instancia.name]
        );

        if (registro.length === 0) {
            throw new Error("No se encontró el registro de la migración.");
        }

        console.log("MIGRACIÓN VERIFICADA CORRECTAMENTE.");

    } finally {
        await ds.destroy();
    }
})().catch(error => {
    console.error("ERROR:", error.stack || error.message);
    process.exit(1);
});
