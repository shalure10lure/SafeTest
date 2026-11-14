const base = require("./src/data-source").default;
const { DataSource } = require("typeorm");
const ds = new DataSource({ ...base.options, migrations: [] });

(async () => {
  await ds.initialize();

  try {
    console.log("\n=== 1. CONEXIÓN ===");
    console.table(await ds.query(`
      SELECT current_database() AS database,
             inet_server_port() AS port
    `));

    console.log("\n=== 2. TABLAS DE LA MIGRACIÓN ===");
    console.table(await ds.query(`
      SELECT t.table_name,
             CASE WHEN c.table_name IS NULL
                  THEN 'NO EXISTE'
                  ELSE 'EXISTE'
             END AS estado
      FROM (VALUES
        ('examen_pool_snapshot'),
        ('examen_pool_snapshot_tema'),
        ('examen_pool_snapshot_pregunta'),
        ('examen_pool_snapshot_inciso')
      ) AS t(table_name)
      LEFT JOIN information_schema.tables c
        ON c.table_schema = 'public'
       AND c.table_name = t.table_name
    `));

    console.log("\n=== 3. COLUMNAS REFERENCIADAS ===");
    console.table(await ds.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('examen', 'examen_tema', 'pregunta', 'inciso')
      ORDER BY table_name, ordinal_position
    `));

    console.log("\n=== 4. CLAVES Y RESTRICCIONES EXISTENTES ===");
    console.table(await ds.query(`
      SELECT
        tbl.relname AS tabla,
        con.conname AS restriccion,
        con.contype AS tipo,
        pg_get_constraintdef(con.oid) AS definicion
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = 'public'
        AND tbl.relname IN ('examen', 'examen_tema', 'pregunta', 'inciso')
      ORDER BY tbl.relname, con.conname
    `));

    console.log("\n=== 5. ÍNDICE QUE SE INTENTA CREAR ===");
    console.table(await ds.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'UQ_pregunta_pregunta_tema'
    `));

    console.log("\n=== 6. POSIBLES PREGUNTAS DUPLICADAS ===");
    console.table(await ds.query(`
      SELECT pregunta_id, tema_id, COUNT(*) AS cantidad
      FROM pregunta
      GROUP BY pregunta_id, tema_id
      HAVING COUNT(*) > 1
      ORDER BY pregunta_id, tema_id
      LIMIT 20
    `));

    console.log("\n=== 7. POSIBLES INCISOS DUPLICADOS ===");
    console.table(await ds.query(`
      SELECT pregunta_id, letra, COUNT(*) AS cantidad
      FROM inciso
      GROUP BY pregunta_id, letra
      HAVING COUNT(*) > 1
      ORDER BY pregunta_id, letra
      LIMIT 20
    `));

    console.log("\n=== 8. REGISTRO DE LA MIGRACIÓN ===");
    const existeTablaMigraciones = await ds.query(`
      SELECT to_regclass('public.migrations') AS tabla
    `);

    if (existeTablaMigraciones[0].tabla) {
      console.table(await ds.query(`
        SELECT *
        FROM migrations
        WHERE name = 'ExamenPoolSnapshot1794100000000'
      `));
    } else {
      console.log("No se encontró la tabla public.migrations.");
    }

    console.log("\nDIAGNÓSTICO FINALIZADO. SOLO SE EJECUTARON CONSULTAS SELECT.");
  } finally {
    await ds.destroy();
  }
})().catch(error => {
  console.error("ERROR EN EL DIAGNÓSTICO:", error);
  process.exitCode = 1;
});

