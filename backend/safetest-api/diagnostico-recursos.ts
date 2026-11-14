const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;

const ds = new DataSource({
    ...base.options,
    migrations: [],
});

(async () => {
    await ds.initialize();

    try {
        console.log("=== CANTIDAD DE RECURSOS ===");
        console.table(await ds.query(`
            SELECT COUNT(*) AS cantidad
            FROM pregunta_recurso
        `));

        console.log("=== RESTRICCIONES EXISTENTES ===");
        console.table(await ds.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) AS definicion
            FROM pg_constraint
            WHERE conrelid = 'pregunta_recurso'::regclass
        `));

        console.log("=== ÍNDICES EXISTENTES ===");
        console.table(await ds.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'pregunta_recurso'
        `));

        console.log("=== MIGRACIÓN RECURSOS PREGUNTA ===");
        console.table(await ds.query(`
            SELECT name
            FROM migrations
            WHERE name ILIKE '%RecursosPregunta%'
        `));

    } finally {
        await ds.destroy();
    }
})().catch(error => {
    console.error("ERROR:", error.message);
    process.exit(1);
});
