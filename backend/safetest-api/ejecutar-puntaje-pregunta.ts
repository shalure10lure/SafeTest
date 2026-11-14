
const base = require("./src/data-source").default;
const { DataSource } = require("typeorm");

const modulo = require("./src/migrations/1794300000000-PuntajePreguntaExamen");
const nombreClase = "PuntajePreguntaExamen1794300000000";
const Migracion = modulo[nombreClase];

async function ejecutar() {
    if (!Migracion) {
        throw new Error(`No se encontró la migración ${nombreClase}`);
    }

    const instancia = new Migracion();

    if (instancia.name !== nombreClase) {
        throw new Error("El nombre de la migración no coincide.");
    }

    const ds = new DataSource({
        ...base.options,
        migrations: [Migracion],
        synchronize: false,
        migrationsRun: false,
    });

    try {
        await ds.initialize();

        const [conexion] = await ds.query(`
      SELECT current_database() AS database,
             inet_server_port() AS port
    `);

        console.log("BASE DE DATOS:");
        console.table([conexion]);

        if (conexion.database !== "safetest" || Number(conexion.port) !== 5432) {
            throw new Error("La conexión no corresponde a safetest:5432.");
        }

        const [columna] = await ds.query(`
      SELECT COUNT(*)::int AS cantidad
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'examen_pregunta'
        AND column_name = 'puntaje'
    `);

        const [historial] = await ds.query(`
      SELECT COUNT(*)::int AS cantidad
      FROM public.migrations
      WHERE name = $1
    `, [nombreClase]);

        const [restriccion] = await ds.query(`
      SELECT COUNT(*)::int AS cantidad
      FROM pg_constraint
      WHERE conname = 'CHK_examen_pregunta_puntaje_positivo'
    `);

        if (columna.cantidad > 0 ||
            historial.cantidad > 0 ||
            restriccion.cantidad > 0) {
            throw new Error(
                "La columna, restricción o registro de migración ya existe. Se cancela."
            );
        }

        console.log("Verificaciones previas correctas.");
        console.log("Ejecutando exclusivamente:", nombreClase);

        const ejecutadas = await ds.runMigrations({
            transaction: "each",
        });

        console.log("MIGRACIONES EJECUTADAS:");
        ejecutadas.map((m: { name: string }) => ({ name: m.name }))

        const [verificacion] = await ds.query(`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'examen_pregunta'
            AND column_name = 'puntaje'
        ) AS columna_creada,
        EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CHK_examen_pregunta_puntaje_positivo'
        ) AS restriccion_creada,
        EXISTS (
          SELECT 1
          FROM public.migrations
          WHERE name = $1
        ) AS migracion_registrada
    `, [nombreClase]);

        console.log("VERIFICACIÓN FINAL:");
        console.table([verificacion]);

        if (
            !verificacion.columna_creada ||
            !verificacion.restriccion_creada ||
            !verificacion.migracion_registrada
        ) {
            throw new Error("La verificación final no fue satisfactoria.");
        }

        console.log("MIGRACIÓN APLICADA Y VERIFICADA CORRECTAMENTE.");
    } finally {
        if (ds.isInitialized) {
            await ds.destroy();
        }
    }
}

ejecutar().catch(error => {
    console.error("ERROR:", error);
    process.exitCode = 1;
});
