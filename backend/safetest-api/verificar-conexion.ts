const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;

const ds = new DataSource({
    ...base.options,
    migrations: [],
});

(async () => {
    await ds.initialize();

    try {
        const resultado = await ds.query(`
            SELECT
                current_database() AS database,
                inet_server_port() AS port,
                version() AS postgres_version
        `);

        console.log("CONEXIÓN CORRECTA:");
        console.table(resultado);
    } finally {
        await ds.destroy();
    }
})().catch(error => {
    console.error("ERROR:", error.message);
    process.exit(1);
});
