const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;

const modulo = require("./src/migrations/1794200000000-PuntajeTotalExamen");

console.log("Exportaciones encontradas:", Object.keys(modulo));

const Migracion = modulo.PuntajeTotalExamen1794200000000;

if (!Migracion) {
    throw new Error("No se encontró la migración PuntajeTotalExamen");
}

const ds = new DataSource({
    ...base.options,
    migrations: [Migracion]
});

(async () => {
    await ds.initialize();

    try {
        console.log("\n=== VERIFICACIÓN DE CONEXIÓN ===");

        const [conexion] = await ds.query(
            "SELECT current_database() AS database, inet_server_port() AS port"
        );

        console.table([conexion]);

        if (conexion.database !== "safetest" || Number(conexion.port) !== 5432) {
            throw new Error("La conexión no corresponde a la base autorizada");
        }

        const historial = await ds.query(
            "SELECT name FROM migrations WHERE name = $1",
            [Migracion.name]
        );

        if (historial.length > 0) {
            throw new Error("La migración ya figura como ejecutada");
        }

        const columnas = await ds.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'examen'
              AND column_name = 'puntaje_total'
        `);

        if (columnas.length > 0) {
            throw new Error(
                "La columna ya existe. Se detiene para evitar una ejecución innecesaria."
            );
        }

        console.log("\n=== EJECUTANDO ÚNICAMENTE ===");
        console.log(Migracion.name);

        const ejecutadas = await ds.runMigrations({
            transaction: "each"
        });

        console.log("\n=== MIGRACIONES EJECUTADAS ===");
        console.table(
            ejecutadas.map((m: { name: string }) => ({ name: m.name }))
        );

        console.log("\n=== VERIFICACIÓN DE COLUMNA ===");
        console.table(
            await ds.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'examen'
                  AND column_name = 'puntaje_total'
            `)
        );

    } finally {
        await ds.destroy();
    }
})().catch(error => {
    console.error("\nERROR:", error);
    process.exit(1);
});
