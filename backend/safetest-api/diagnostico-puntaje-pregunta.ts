const base = require("./src/data-source").default;
const { DataSource } = require("typeorm");

const ds = new DataSource({
  ...base.options,
  migrations: [],
});

(async () => {
  await ds.initialize();

  try {
    console.log("\n=== 1. CONEXIÓN ===");
    console.table(await ds.query(`
      SELECT current_database() AS database,
             inet_server_port() AS port
    `));

    console.log("\n=== 2. EXISTENCIA DE LA TABLA ===");
    const tabla = await ds.query(`
      SELECT to_regclass('public.examen_pregunta') AS tabla
    `);
    console.table(tabla);

    if (!tabla[0].tabla) {
      console.log("No existe examen_pregunta. Se omiten las consultas dependientes.");
      return;
    }

    console.log("\n=== 3. COLUMNAS DE examen_pregunta ===");
    console.table(await ds.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'examen_pregunta'
      ORDER BY ordinal_position
    `));

    console.log("\n=== 4. RESTRICCIONES EXISTENTES ===");
    console.table(await ds.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) AS definicion
      FROM pg_constraint
      WHERE conrelid = 'public.examen_pregunta'::regclass
      ORDER BY conname
    `));

    const tienePuntaje = await ds.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'examen_pregunta'
          AND column_name = 'puntaje'
      ) AS existe
    `);

    console.log("\n=== 5. ESTADO DE LOS REGISTROS ===");

    if (tienePuntaje[0].existe) {
      console.table(await ds.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE puntaje IS NULL) AS puntaje_null,
          COUNT(*) FILTER (WHERE puntaje IS NOT NULL) AS puntaje_informado,
          COUNT(*) FILTER (WHERE puntaje <= 0) AS puntajes_no_positivos
        FROM examen_pregunta
      `));
    } else {
      console.log("La columna puntaje todavía no existe; todos los registros necesitarían evaluación.");
      console.table(await ds.query(`
        SELECT COUNT(*) AS total_registros
        FROM examen_pregunta
      `));
    }

    console.log("\n=== 6. RESUMEN DEL BACKFILL ===");
    console.table(await ds.query(`
      WITH sumas AS (
        SELECT pregunta_id, SUM(puntaje_max) AS suma
        FROM inciso
        GROUP BY pregunta_id
      )
      SELECT
        COUNT(*) AS registros_examen_pregunta,
        COUNT(*) FILTER (
          WHERE s.suma > 0
            AND s.suma <= 9999999999.99
        ) AS preguntas_con_suma_positiva_y_dentro_de_rango,
        COUNT(*) FILTER (
          WHERE s.pregunta_id IS NULL OR s.suma <= 0
        ) AS registros_sin_suma_positiva,
        COUNT(*) FILTER (
          WHERE s.suma > 9999999999.99
        ) AS sumas_fuera_de_rango_numeric_12_2
      FROM examen_pregunta ep
      LEFT JOIN sumas s ON s.pregunta_id = ep.pregunta_id
    `));

    console.log("\n=== 7. REGISTROS QUE QUEDARÍAN SIN PUNTAJE ===");
    if (tienePuntaje[0].existe) {
      console.table(await ds.query(`
        WITH sumas AS (
          SELECT pregunta_id, SUM(puntaje_max) AS suma
          FROM inciso
          GROUP BY pregunta_id
        )
        SELECT ep.examen_id, ep.pregunta_id, ep.puntaje,
               COALESCE(s.suma, 0) AS suma_inciso
        FROM examen_pregunta ep
        LEFT JOIN sumas s ON s.pregunta_id = ep.pregunta_id
        WHERE ep.puntaje IS NULL
          AND (s.pregunta_id IS NULL OR s.suma <= 0)
        ORDER BY ep.examen_id, ep.pregunta_id
        LIMIT 20
      `));
    } else {
      console.table(await ds.query(`
        WITH sumas AS (
          SELECT pregunta_id, SUM(puntaje_max) AS suma
          FROM inciso
          GROUP BY pregunta_id
        )
        SELECT ep.examen_id, ep.pregunta_id,
               COALESCE(s.suma, 0) AS suma_inciso
        FROM examen_pregunta ep
        LEFT JOIN sumas s ON s.pregunta_id = ep.pregunta_id
        WHERE s.pregunta_id IS NULL OR s.suma <= 0
        ORDER BY ep.examen_id, ep.pregunta_id
        LIMIT 20
      `));
    }

    console.log("\n=== 8. HISTORIAL DE MIGRACIÓN ===");
    const historial = await ds.query(`
      SELECT to_regclass('public.migrations') AS tabla
    `);

    if (historial[0].tabla) {
      console.table(await ds.query(`
        SELECT *
        FROM migrations
        WHERE name = 'PuntajePreguntaExamen1794300000000'
      `));
    } else {
      console.log("No se encontró public.migrations.");
    }

    console.log("\nDIAGNÓSTICO FINALIZADO. SOLO SE EJECUTARON CONSULTAS SELECT.");
  } finally {
    await ds.destroy();
  }
})().catch(error => {
  console.error("ERROR EN EL DIAGNÓSTICO:", error);
  process.exitCode = 1;
});
