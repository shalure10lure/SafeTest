# HU-45 · T1 — Verificación del esquema real

**Modo:** solo lectura (`SELECT` sobre `information_schema` y catálogos `pg_*`).
**Escrituras realizadas:** ninguna. No se ejecutaron migraciones.
**Fecha:** 2026-11-19

---

## 1. Entorno consultado

| Dato | Valor |
|---|---|
| Motor | PostgreSQL 16.15 (Debian) |
| Host | `localhost` |
| Puerto | `5433` (mapeado a 5432 en el contenedor) |
| Base de datos | `safetest` |
| Contenedor | `safetest-postgres` (imagen `postgres:16`) |
| Usuario | cuenta administrativa local de desarrollo (credencial omitida) |

La fuente de verdad fue la base en ejecución, **no** `safetest.dump`.

---

## 2. Columnas `ia_*` de `respuesta_inciso`

Las siete columnas existen y sus tipos coinciden con la entidad
`RespuestaInciso`.

| # | Columna | Tipo real | Nulable | Default |
|---|---|---|---|---|
| 10 | `ia_estado` | `varchar(15)` | NO | `'sin_propuesta'` |
| 11 | `ia_puntaje_sugerido` | `numeric(6,2)` | SÍ | — |
| 12 | `ia_valoracion` | `text` | SÍ | — |
| 13 | `ia_explicacion` | `text` | SÍ | — |
| 14 | `ia_errores` | `jsonb` | SÍ | — |
| 15 | `ia_confianza` | `numeric(3,2)` | SÍ | — |
| 16 | `ia_generado_en` | `timestamptz` | SÍ | — |

Observaciones:

- `ia_confianza` admite hasta `9.99` por tipo, aunque la semántica esperada es
  `0.00–1.00`. Requiere validación en aplicación.
- No existe `CHECK` sobre `ia_estado`: admite cualquier cadena.
- `respuesta_inciso` **no tiene índice** sobre `ia_estado` ni sobre `examen_id`.

---

## 3. Índices y restricciones de `respuesta_inciso`

### Índices

| Índice | Definición |
|---|---|
| `PK_fb12d1762a4b3b856cc8ecd7ec7` | UNIQUE btree `(estudiante_id, examen_id, pregunta_id, letra)` |

Es el **único** índice de la tabla. No hay índices secundarios.

Consecuencia: cualquier consulta filtrada por `examen_id` sin `estudiante_id`
no usa el prefijo del PK y provoca un recorrido secuencial.

### Claves foráneas

| Constraint | Columnas | Referencia | ON DELETE |
|---|---|---|---|
| `FK_b6adcbb5beaed6b9f00e8710e29` | `(pregunta_id, letra)` | `inciso(pregunta_id, letra)` | NO ACTION |
| `FK_a22067f7c17934ab257d22726e0` | `(estudiante_id, examen_id, pregunta_id)` | `asignacion_pregunta(estudiante_id, examen_id, pregunta_id)` | NO ACTION |

Ambas FKs son válidas como destino de una FK compuesta desde
`correccion_ia`, porque el PK de `respuesta_inciso` cubre exactamente esas
cuatro columnas.

---

## 4. Estado de `ia_solucion_referencia` (HU-46)

| Columna | Tipo | Nulable | Default |
|---|---|---|---|
| `solucion_ref_id` | `integer` (serial) | NO | `nextval(...)` |
| `pregunta_id` | `integer` | NO | — |
| `docente_id` | `integer` | NO | — |
| `contenido` | `jsonb` | NO | — |
| `modelo` | `varchar(100)` | SÍ | — |
| `estado` | `varchar(15)` | NO | `'propuesta'` |
| `revisada_en` | `timestamptz` | SÍ | — |
| `fecha` | `timestamptz` | NO | `now()` |

- PK: `solucion_ref_id`.
- FK `pregunta_id → pregunta(pregunta_id)` con `ON DELETE CASCADE`.
- FK `docente_id → docente(docente_id)` con `ON DELETE CASCADE`.
- Único índice: el PK.
- **Filas existentes: 0.**

Conclusión: la tabla está creada pero **vacía**. HU-46 no aporta criterios
utilizables hoy; el diseño de HU-45 no puede depender de ella.

---

## 5. Entidades y relaciones relevantes

### `inciso` (PK `pregunta_id, letra`)

| Columna | Tipo | Nulable |
|---|---|---|
| `pregunta_id` | `integer` | NO |
| `letra` | `varchar` | NO |
| `enunciado_inciso` | `text` | NO |
| `tipo_respuesta` | `varchar` | NO |
| `puntaje_max` | `numeric` | NO |

`puntaje_max` no tiene escala fija: la validación de dos decimales debe
hacerse en aplicación, como ya hace `valorarInciso`.

### `solucion_inciso` (PK `pregunta_id, letra`)

| Columna | Tipo | Nulable |
|---|---|---|
| `pregunta_id` | `integer` | NO |
| `letra` | `varchar` | NO |
| `valor_correcto` | `numeric` | NO |
| `tolerancia` | `numeric` | NO |
| `rubrica` | `text` | NO |

`rubrica` es `NOT NULL` pero admite cadena vacía; no existe `CHECK` de
contenido. La evaluación de "criterios suficientes" debe hacerse en
aplicación con `btrim(rubrica) <> ''`.

### `rendicion` (PK `estudiante_id, examen_id`)

| Columna | Tipo | Nulable | Default |
|---|---|---|---|
| `nota_final` | `numeric` | SÍ | — |
| `estado` | `varchar` | NO | `'en_curso'` |
| `fecha_inicio` | `timestamptz` | SÍ | — |
| `fecha_envio` | `timestamptz` | SÍ | — |

### `examen` (PK `examen_id`)

Campos oficiales confirmados:

| Columna | Tipo | Nulable |
|---|---|---|
| `docente_id` | `integer` | SÍ |
| `estado` | `varchar(20)` | NO |
| `resultados_publicados_en` | `timestamptz` | SÍ |
| `puntaje_total` | `numeric(12,2)` | SÍ |

---

## 6. Hallazgo crítico: la base está desactualizada

La tabla `migrations` contiene **12** registros y se detiene en
`1794300000000-PuntajePreguntaExamen`.

Faltan por aplicar tres migraciones que sí existen en
`backend/safetest-api/src/migrations/`:

| Migración faltante | Efecto esperado | Verificación en la base |
|---|---|---|
| `1794400000000-ModelosFormulaRendicion` | Crea `modelo`, `pregunta_modelo`, `modelo_formula`, `respuesta_modelo` | **Ninguna de las cuatro existe** |
| `1794500000000-RevisionCalificaciones` | Añade `examen.calificaciones_revisadas_en` | **La columna no existe** |
| `1794600000000-SepararPublicacionRespuestas` | Añade `examen.respuestas_publicadas_en` | **La columna no existe** |

Evidencia adicional: la consulta de columnas con patrón
`%revisad%` / `%publicad%` en todo el esquema solo devuelve
`examen.resultados_publicados_en` y `ia_solucion_referencia.revisada_en`.

### Impacto directo

1. `RevisionCalificacionesService.obtenerDetalle` consulta la entidad
   `RespuestaModelo`. Contra esta base, **falla en tiempo de ejecución**
   porque la tabla no existe.
2. `RevisionCalificacionesService.asegurarEdicionPermitida` lee
   `examen.calificaciones_revisadas_en`. TypeORM generaría un `SELECT` con
   una columna inexistente: **falla**.
3. El gate de publicación de HU-45 depende de
   `calificaciones_revisadas_en` y `resultados_publicados_en`; el primero no
   está disponible.
4. La verificación funcional de HU-31/HU-32 contra esta base no es
   representativa del estado del código.

### Consecuencia para T2

Antes de escribir o probar HU-45 hay que aplicar las tres migraciones
pendientes. **No se hizo en T1** por restricción explícita. Debe ser un paso
0 de T2, con aprobación previa y sobre una base de desarrollo, nunca sobre
datos reales.

---

## 7. Volumen y distribución de datos (contexto)

| Métrica | Valor |
|---|---|
| `inciso` por tipo | `verdadero_falso` 7, `desarrollo` 5, `numerica` 5, `opcion_unica` 4, `opcion_multiple` 3, `texto_corto` 2 |
| `respuesta_inciso` por estado | `pendiente` 2 |
| `respuesta_inciso` con texto | 1 con texto, 1 vacía |
| `rendicion` por estado | `enviada` 4 |
| `solucion_inciso` | 3 filas, **1** con rúbrica no vacía |
| `ia_solucion_referencia` | 0 filas |

Lectura: se trata de un dataset de desarrollo muy pequeño. El camino feliz de
HU-45 (inciso de `desarrollo` con respuesta y rúbrica) tiene **muy pocos
casos reales disponibles**; T2 necesitará fixtures propios.

---

## 8. Consultas utilizadas (reproducibles)

Todas de solo lectura:

```sql
-- Columnas de las tablas auditadas
SELECT table_name, ordinal_position, column_name, data_type,
       character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('respuesta_inciso', 'ia_solucion_referencia')
 ORDER BY table_name, ordinal_position;

-- Índices
SELECT tablename, indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename IN ('respuesta_inciso', 'ia_solucion_referencia');

-- Restricciones y FKs
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column, rc.delete_rule
  FROM information_schema.table_constraints tc
  LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  LEFT JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
 WHERE tc.table_schema = 'public'
   AND tc.table_name IN ('respuesta_inciso', 'ia_solucion_referencia');

-- Migraciones aplicadas
SELECT * FROM migrations ORDER BY id;

-- Columnas de publicación/revisión en todo el esquema
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (column_name LIKE '%revisad%' OR column_name LIKE '%publicad%');
```

---

## 9. Conclusiones

1. Las siete columnas `ia_*` **existen** con los tipos esperados. No hace falta
   migración para ellas.
2. No hay índices más allá del PK en `respuesta_inciso`, lo que condiciona el
   diseño de consultas por examen.
3. `ia_solucion_referencia` existe pero está vacía: HU-46 no es una fuente de
   criterios disponible.
4. **La base está tres migraciones por detrás del código.** Cualquier prueba
   funcional de HU-45 contra esta base fallará por causas ajenas a HU-45.
5. El diseño de `correccion_ia` debe ser independiente de las columnas `ia_*`
   y del estado de HU-46, tal como se decidió funcionalmente.
