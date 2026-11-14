const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;
const modulo = require("./src/migrations/1793900000000-RecursosPregunta");
const Migracion = modulo.RecursosPregunta1793900000;

const ds = new DataSource({
    ...base.options,
    migrations: [Migracion],
});

(async () => {
    try {
        console.log("Clase recibida:", typeof Migracion);
        console.log("Configuración migrations:", ds.options.migrations);

        await ds.initialize();

        console.log("=== MIGRACIONES RECONOCIDAS ===");
        console.log(ds.migrations);

    } finally {
        if (ds.isInitialized) {
            await ds.destroy();
        }
    }
})().catch(error => {
    console.error("ERROR COMPLETO:");
    console.error(error.stack);
    process.exit(1);
});
