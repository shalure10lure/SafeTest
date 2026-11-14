
require("dotenv/config");

const fs = require("fs");
const path = require("path");
const { DataSource } = require("typeorm");
const base = require("./src/data-source").default;

interface MigracionEjecutada {
    name: string;
}

interface MigracionPendiente {
    name: string;
    timestamp: number;
}

const directorio = path.resolve("./src/migrations");

const archivos: string[] = fs.readdirSync(directorio).filter(
    (nombre: string) =>
        /\.(ts|js)$/.test(nombre) &&
        !nombre.endsWith(".spec.ts") &&
        !nombre.endsWith(".test.ts") &&
        !nombre.endsWith(".spec.js") &&
        !nombre.endsWith(".test.js")
);

const migraciones: Function[] = [];

for (const archivo of archivos) {
    const modulo = require(path.join(directorio, archivo));

    for (const elemento of Object.values(modulo)) {
        if (typeof elemento === "function") {
            migraciones.push(elemento as Function);
        }
    }
}

const ds = new DataSource({
    ...base.options,
    migrations: migraciones
});

(async () => {
    await ds.initialize();

    try {
        console.log("\n=== BASE DE DATOS ===");
        console.table(await ds.query(
            "SELECT current_database() AS database, inet_server_port() AS port"
        ));

        console.log("\n=== MIGRACIONES EJECUTADAS ===");
        console.table(await ds.query(
            "SELECT id, timestamp, name FROM migrations ORDER BY timestamp"
        ));

        console.log("\n=== MIGRACIONES PENDIENTES ===");

        const ejecutadas: MigracionEjecutada[] = await ds.query(
            "SELECT name FROM migrations"
        );

        const nombresEjecutados = new Set(
            ejecutadas.map((m: MigracionEjecutada) => m.name)
        );

        const pendientes: MigracionPendiente[] = ds.migrations.filter(
            (m: MigracionPendiente) => !nombresEjecutados.has(m.name)
        );

        console.log("\n=== RESULTADO DE MIGRACIONES PENDIENTES ===");

        console.table(
            pendientes.map((m: MigracionPendiente) => ({
                nombre: m.name,
                timestamp: m.timestamp
            }))
        );
    } finally {
        await ds.destroy();
    }
})().catch((error: unknown) => {
    console.error("ERROR:", error);
    process.exit(1);
});
