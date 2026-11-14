const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;

const ds = new DataSource({
    ...base.options,
    migrations: [],
});

(async () => {
    await ds.initialize();

    try {
        console.log("=== CONEXIÓN ===");
        console.table(await ds.query(`
            SELECT current_database() AS database,
                   inet_server_port() AS port
        `));

        console.log("=== REGISTRO DE MIGRACIÓN ===");
        console.table(await ds.query(`
            SELECT name
            FROM migrations
            WHERE name = 'RecursosPregunta1793900000000'
        `));

        console.log("=== COLUMNAS DE pregunta_recurso ===");
        console.table(await ds.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pregunta_recurso'
            ORDER BY ordinal_position
        `));

        console.log("=== RESTRICCIÓN ===");
        console.table(await ds.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'public.pregunta_recurso'::regclass
              AND conname = 'CHK_pregunta_recurso_tipo'
        `));

    } finally {
        await ds.destroy();
    }
})().catch(error => {
    console.error("ERROR:", error.message);
    process.exit(1);
});
