# HU-45 · Auditoría previa a las migraciones (solo lectura)

**Modo:** exclusivamente lectura.
**Migraciones ejecutadas:** ninguna.
**Escrituras en PostgreSQL:** ninguna.
**Archivos de producción modificados:** ninguno.

Entorno: PostgreSQL 16.15, base `safetest`, host `localhost:5433`
(contenedor `safetest-postgres`, puerto interno 5432).

---

## 1. Nombres exactos y dependencias

| Tarea | Timestamp | Clase (`name`) | Archivo |
|---|---|---|---|
| T2-01 | `1794400000000` | `ModelosFormulaRendicion1794400000000` | `src/migrations/1794400000000-ModelosFormulaRendicion.ts` |
| T2-02 | `1794500000000` | `RevisionCalificaciones1794500000000` | `src/migrations/1794500000000-RevisionCalificaciones.ts` |
| T2-03 | `1794600000000` | `SepararPublicacionRespuestas1794600000000` | `src/migrations/1794600000000-SepararPublicacionRespuestas.ts` |

### Dependencias

| Migración | Depende de | Por qué |
|---|---|---|
| T2-01 | `pregunta`, `formula`, `respuesta_inciso` (Sprint 1) | FKs de las cuatro tablas nuevas |
| T2-02 | `examen` | `ALTER TABLE examen` |
| T2-03 | `examen` | `ALTER TABLE examen` + `UPDATE` |
| T2-03 (funcional) | T2-02 | `publicarRespuestas` exige `calificaciones_revisadas_en` no nulo antes de publicar soluciones |
| T2-04 (futura) | T2-02 y T2-03 | El gate de aceptación/edición lee ambas columnas; T2-01 es necesario para que la pantalla de revisión funcione |

Ninguna de las tres depende de otra a nivel de DDL. La dependencia T2-03 → T2-02
es de comportamiento en tiempo de ejecución, no de esquema.

---

## 2. Revisión del contenido completo

### 2.1 `1794400000000-ModelosFormulaRendicion`

**`up()`**

1. `CREATE TABLE modelo`: PK serial `modelo_id`; `nombre varchar(150) NOT NULL`;
   `descripcion text`; `variables jsonb NOT NULL DEFAULT '{}'`;
   `activo boolean NOT NULL DEFAULT true`; `CHECK jsonb_typeof(variables)='object'`.
2. `CREATE TABLE pregunta_modelo`: PK `(pregunta_id, modelo_id)`;
   FK `pregunta_id → pregunta` `RESTRICT`; FK `modelo_id → modelo` `CASCADE`.
3. `CREATE TABLE modelo_formula`: PK `(modelo_id, formula_id)`;
   FK `modelo_id → modelo` `CASCADE`; FK `formula_id → formula` `RESTRICT`.
4. `CREATE TABLE respuesta_modelo`: PK `(estudiante_id, examen_id, pregunta_id, letra)`;
   FK compuesta a `respuesta_inciso` `RESTRICT`; FK a `pregunta_modelo` `RESTRICT`;
   `valores jsonb NOT NULL DEFAULT '{}'` con `CHECK`;
   `resultado_final text`; `actualizado_en timestamptz NOT NULL DEFAULT now()`.
5. Cuatro índices: `IDX_modelo_activo_nombre`, `IDX_pregunta_modelo_modelo`,
   `IDX_modelo_formula_formula`, `IDX_respuesta_modelo_modelo`.

Sin `ALTER` sobre tablas existentes y sin manipulación de datos.

**`down()`**: elimina las cuatro tablas en orden inverso con
`DROP TABLE IF EXISTS`.

**Observación:** no es idempotente hacia adelante (`CREATE TABLE` sin
`IF NOT EXISTS`). Debe ejecutarse una sola vez y dentro de una transacción.

### 2.2 `1794500000000-RevisionCalificaciones`

**`up()`**

```sql
ALTER TABLE "examen"
  ADD COLUMN IF NOT EXISTS "calificaciones_revisadas_en" timestamptz NULL;
```

Sin datos, sin default, sin backfill. Idempotente.

**`down()`**: `DROP COLUMN IF EXISTS`.

### 2.3 `1794600000000-SepararPublicacionRespuestas`

**`up()`**

```sql
ALTER TABLE "examen"
  ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz;

UPDATE "examen"
   SET "respuestas_publicadas_en" = "resultados_publicados_en"
 WHERE "resultados_publicados_en" IS NOT NULL
   AND "respuestas_publicadas_en" IS NULL;
```

**`down()`**: `DROP COLUMN IF EXISTS respuestas_publicadas_en`.

Es la única de las tres con cambio de datos.

---

## 3. Análisis específico del examen 19

### 3.1 Estado actual

| Campo | Valor |
|---|---|
| `examen_id` | 19 |
| `titulo` | Derivadas 3 |
| `estado` | `publicado` |
| `docente_id` | 2 |
| `materia_id` | 1 |
| `modo_asignacion` | `estudiantes` |
| `resultados_publicados_en` | `2026-11-10 10:45:54.071397+00` (UTC) |
| `respuestas_publicadas_en` | **no existe** |
| Ventana | `2026-11-08 16:39` → `2026-11-08 18:09` (vencida) |
| Asignados directos | **1**, activo |
| Rendiciones | 1, estado `enviada`, `nota_final = NULL` |
| Preguntas / incisos / opciones | 3 / 3 / 2 |
| Soluciones numéricas o rúbricas | **0** |
| `solucion_opcion` | **1** fila: pregunta 34, letra `a`, opción 1 |
| Preguntas con `explicacion` | **1**: pregunta 34 |

### 3.2 Qué se modificará

Exactamente **un registro**: `examen.examen_id = 19`.

| Columna | Antes | Después |
|---|---|---|
| `resultados_publicados_en` | `2026-11-10 10:45:54.071397+00` | **sin cambios** |
| `respuestas_publicadas_en` | *no existe* | `2026-11-10 10:45:54.071397+00` |
| Resto de columnas del examen | — | **sin cambios** |

Los otros 17 exámenes tienen `resultados_publicados_en = NULL`, por lo que el
`UPDATE` no los toca y su nueva columna queda en `NULL`.

### 3.3 ¿Las soluciones quedarán publicadas?

**Sí, para el examen 19.** El código interpreta
`respuestas_publicadas_en IS NOT NULL` como autorización de soluciones
(`PublicacionResultadosService` y `ExamenAccesoService`).

Consecuencia concreta:

- `GET examenes/19/estudiante` (rol estudiante) devolverá
  `respuestas_disponibles: true`.
- La proyección `aPreguntasEstudiantePublicadas` incluirá:
  - `explicacion` de la pregunta 34;
  - `es_correcta: true` en la opción 1 del inciso 34-a;
  - `valor_correcto`, `tolerancia` y `solucion_referencia` en `null` para el
    resto, porque no hay filas de solución.
- El único estudiante asignado está **activo**, así que la consulta es
  alcanzable.

### 3.4 ¿Quedan expuestos los resultados oficiales?

**No.** `obtenerResultadoEstudiante` exige simultáneamente:

- `examen.calificaciones_revisadas_en !== null` → tras T2-02 será `NULL`;
- `examen.resultados_publicados_en !== null` → cumple;
- `rendicion.estado === 'corregida'` → hoy es `enviada`;
- `rendicion.nota_final !== null` → hoy es `NULL`.

Por tanto la nota sigue oculta. La exposición se limita a la explicación y a
una opción correcta a través de la vista del examen.

### 3.5 Riesgo de pérdida o exposición

| Riesgo | Evaluación |
|---|---|
| Pérdida de datos | **Ninguna.** No se elimina ni se sobrescribe ninguna columna existente |
| Alteración de notas | **Ninguna.** `rendicion` no se toca |
| Exposición de soluciones | **Sí, acotada:** 1 explicación + 1 opción correcta a 1 estudiante activo |
| Inconsistencia de datos subyacente | **Sí:** el examen tiene resultados publicados con una rendición `enviada` y sin nota. Es data heredada o de prueba |

La migración **preserva la semántica anterior**: antes de la separación,
`resultados_publicados_en` habilitaba las soluciones. El backfill replica ese
estado. El punto a decidir es si ese comportamiento heredado sigue siendo
deseable para el examen 19.

**Opciones (ninguna ejecutada):**

1. Aplicar tal cual. Expone 1 explicación y 1 opción correcta. Coherente con el
   comportamiento previo.
2. Aplicar y luego, con autorización separada, devolver
   `respuestas_publicadas_en` a `NULL` para el examen 19. Es una escritura de
   datos y no forma parte de la migración.
3. Excluir el examen 19 del backfill modificando la migración. **No se
   recomienda**: altera un archivo ya revisado y introduce una regla
   específica de datos.

---

## 4. Condiciones previas verificadas

### 4.1 T2-01

| Condición | Consulta | Resultado |
|---|---|---|
| Las 4 tablas no existen | `pg_class` por nombre | 0 filas |
| Nombres libres en **todos** los esquemas | `pg_class` sin filtrar esquema | 0 colisiones |
| Secuencia `modelo_modelo_id_seq` libre | `pg_class` | No existe |
| Índices `IDX_*` libres | `pg_class` | No existen |
| `PK_modelo`, `PK_pregunta_modelo`, `PK_modelo_formula`, `PK_respuesta_modelo` libres | `pg_class` | No existen |
| `pregunta.pregunta_id` | `information_schema` | `integer NOT NULL` |
| `formula.formula_id` | `information_schema` | `integer NOT NULL` |
| `respuesta_inciso` PK compuesta | `pg_indexes` | `(estudiante_id, examen_id, pregunta_id, letra)` |
| Tipos compatibles para FKs | `information_schema` | `int, int, int, varchar` |
| Filas en tablas referenciadas | `count(*)` | `pregunta` 26, `formula` 0, `respuesta_inciso` 2 |
| Bloqueos activos | `pg_stat_activity` | Ninguno |

### 4.2 T2-02

| Condición | Resultado |
|---|---|
| `examen` existe | Sí, 18 filas |
| `calificaciones_revisadas_en` no existe | Confirmado (0 filas en `information_schema.columns`) |
| Triggers sobre `examen` | Ninguno |
| Reglas de reescritura | Ninguna |
| Vistas que dependan de `examen` | Ninguna |
| Índices afectados | Ninguno: añadir columna no reconstruye índices |

### 4.3 T2-03

| Condición | Resultado |
|---|---|
| `respuestas_publicadas_en` no existe | Confirmado |
| Filas con `resultados_publicados_en` no nulo | **1** (`examen_id = 19`) |
| Filas con `resultados_publicados_en` nulo | 17 |
| Triggers / reglas / vistas sobre `examen` | Ninguno / ninguna / ninguna |
| Huella del contenido actual de `examen` | `fa58b030f2f380f19167550e8e52c9bf` |

La huella se calcula sobre una lista explícita de columnas que **no** incluye
las columnas nuevas. Debe permanecer idéntica después de T2-02 y T2-03; si
cambia, alguna fila fue alterada sin autorización.

```sql
SELECT md5(string_agg(row_to_json(t)::text, '|' ORDER BY examen_id))
  FROM (
    SELECT examen_id, nro_prueba, fecha, modo_seleccion, modo_entrega_nota,
           semestre_id, docente_id, materia_id, titulo, instrucciones,
           duracion_min, disponible_desde, disponible_hasta, estado,
           orden_preguntas, al_terminar_tiempo, resultados_publicados_en,
           enviar_resultados_correo, modo_asignacion, puntaje_total
      FROM examen
  ) t;
```

---

## 5. Verificaciones posteriores a cada migración

Todas de solo lectura, inmediatamente después de cada ejecución. Si alguna
falla, se detiene el plan y no se continúa con la siguiente.

### Después de T2-01

```sql
-- 1. Registro de la migración
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 1;

-- 2. Las cuatro tablas existen
SELECT relname FROM pg_class
 WHERE relnamespace = 'public'::regnamespace
   AND relname IN ('modelo','pregunta_modelo','modelo_formula','respuesta_modelo')
   AND relkind = 'r'
 ORDER BY relname;

-- 3. Índices
SELECT tablename, indexname FROM pg_indexes
 WHERE schemaname='public'
   AND tablename IN ('modelo','pregunta_modelo','modelo_formula','respuesta_modelo')
 ORDER BY tablename, indexname;

-- 4. Acciones de borrado de las FKs
SELECT conname, confdeltype
  FROM pg_constraint
 WHERE conrelid IN ('public.pregunta_modelo'::regclass,
                    'public.modelo_formula'::regclass,
                    'public.respuesta_modelo'::regclass)
   AND contype = 'f'
 ORDER BY conname;

-- 5. Tablas vacías
SELECT (SELECT count(*) FROM modelo) AS modelo,
       (SELECT count(*) FROM pregunta_modelo) AS pregunta_modelo,
       (SELECT count(*) FROM modelo_formula) AS modelo_formula,
       (SELECT count(*) FROM respuesta_modelo) AS respuesta_modelo;
```

**Criterios:** 4 tablas; 4 índices nuevos + los PK; `confdeltype` coincide con
`c` (CASCADE) y `r` (RESTRICT) según el diseño; conteos en 0.

### Después de T2-02

```sql
-- 1. Registro
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 1;

-- 2. Columna
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen'
   AND column_name='calificaciones_revisadas_en';

-- 3. Nadie quedó marcado como revisado
SELECT count(*) FROM examen WHERE calificaciones_revisadas_en IS NOT NULL;

-- 4. Sin cambios colaterales
SELECT count(*) FROM examen;  -- debe seguir en 18
```

Y la huella de §4.3 debe seguir siendo `fa58b030f2f380f19167550e8e52c9bf`.

**Criterios:** columna `timestamptz` nullable; 0 filas no nulas; 18 exámenes;
huella idéntica.

### Después de T2-03

```sql
-- 1. Registro
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 1;

-- 2. Columna
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen'
   AND column_name='respuestas_publicadas_en';

-- 3. Backfill exacto
SELECT examen_id,
       resultados_publicados_en,
       respuestas_publicadas_en,
       (resultados_publicados_en IS NOT DISTINCT FROM respuestas_publicadas_en) AS coincide
  FROM examen
 WHERE resultados_publicados_en IS NOT NULL;

-- 4. Ninguna fila no publicada quedó con soluciones publicadas
SELECT count(*) FROM examen
 WHERE respuestas_publicadas_en IS NOT NULL
   AND resultados_publicados_en IS NULL;

-- 5. Sin cambios colaterales
SELECT count(*) FROM examen;  -- 18
```

Y la huella de §4.3 debe seguir siendo `fa58b030f2f380f19167550e8e52c9bf`.

**Criterios:** columna `timestamptz` nullable; exactamente 1 fila con valor
(`19`); `coincide = true`; 0 filas inconsistentes; 18 exámenes; huella
idéntica.

**Verificación funcional diferida (no se ejecuta en la auditoría):** levantar
la API y comprobar que `GET examenes/19/estudiante` responde 200 con
`respuestas_disponibles: true`, y que `GET` de resultados oficiales sigue
respondiendo 403. Requiere arrancar el backend, lo que queda fuera de esta
auditoría.

---

## 6. Conclusión

- Las tres migraciones tienen nombres y contenidos verificados.
- Sus precondiciones se cumplen; no hay colisiones de objetos ni bloqueos
  activos.
- Solo T2-03 modifica datos: exactamente una fila del examen 19.
- El efecto de T2-03 es publicar, para el examen 19, una explicación y una
  opción correcta a un estudiante activo. Las notas oficiales siguen ocultas.
- No hay riesgo de pérdida de información.
- Queda una decisión explícita pendiente: aceptar el backfill del examen 19
  como herencia del comportamiento anterior, o corregirlo después con una
  autorización separada.
