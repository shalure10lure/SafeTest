# HU-45 · T2-03 — Registro de ejecución (alternativa A')

**Migración ejecutada:** `SepararPublicacionRespuestas1794600000000` (`1794600000000`)
**Variante:** **A'** — columna nueva **sin backfill** + limpieza controlada del examen 19
**Método:** script puntual `scripts/ejecutar-migracion-puntual.ts` (Opción A)
**`migration:run` genérico:** no utilizado
**Otras migraciones ejecutadas:** ninguna
**Fecha:** 2026-11-19

---

## 1. Cambio aplicado en la migración

Se eliminó el `UPDATE` de backfill del método `up`. La migración quedó
**solo estructural**:

```ts
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(
    'ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz',
  );
  // Sin backfill (alternativa A'): publicar resultados NO autoriza por sí
  // mismo la publicación de respuestas correctas. La fecha heredada del
  // examen 19 no se copia; su `resultados_publicados_en` se limpia en un
  // paso separado y controlado. El docente decide después, de forma
  // explícita, qué publicar y cuándo.
}
```

El `down` no cambió: elimina la columna.

---

## 2. Verificación previa

| Comprobación | Resultado |
|---|---|
| `current_database()` | `safetest` |
| `inet_server_port()` (conexión TCP del script) | **5432** |
| `DB_NAME` del entorno | `safetest` |
| Migraciones aplicadas | 14 |
| `examen.respuestas_publicadas_en` | **no existía** |
| Exámenes con `resultados_publicados_en` no nulo | **1** (examen 19) |
| Valor del examen 19 | **`2026-11-10 10:45:54.071397+00`** |
| Filas en `examen` | 18 |
| Pendientes detectadas por el script | 1, en lista blanca |

Huellas base medidas antes de ejecutar:

| Huella | Valor |
|---|---|
| `examen` (18 filas, 20 columnas) | `fa58b030f2f380f19167550e8e52c9bf` |
| `examen` sin el 19 (17 filas) | `4fc73a571da6a16c9c2b9bff3905498e` |
| `rendicion` | `2dad4f13916066d8138cec68d451f650` |
| `respuesta_inciso` (8 columnas) | `b621f513291b57adf71739699480a7ff` |
| `respuesta_inciso` (7 columnas, sin `retroalimentacion`) | `71fb94b24c3548ffbd3f86cb1bde7bc8` |

---

## 3. Ejecución de la migración

```powershell
npx ts-node --transpile-only -P scripts/tsconfig.json `
  scripts/ejecutar-migracion-puntual.ts `
  --migracion=SepararPublicacionRespuestas1794600000000 `
  --confirmar-base=safetest
```

Salida relevante:

```
Destino real: base=safetest puerto_servidor=5432
Pendientes detectadas (1):
  - SepararPublicacionRespuestas1794600000000

Ejecutando únicamente: SepararPublicacionRespuestas1794600000000
  timestamp=1794600000000

[OK] Migración confirmada (commit).
```

Ejecutada dentro de una transacción explícita, con `rollback` ante error.

### Estado intermedio (antes de la limpieza)

| Comprobación | Resultado |
|---|---|
| Columna `respuestas_publicadas_en` | `timestamptz`, nullable, sin default |
| Filas con `respuestas_publicadas_en` no nulo | **0** (sin backfill) |
| Examen 19 `resultados_publicados_en` | `2026-11-10 10:45:54.071397+00` (intacto) |
| Huella de los otros 17 exámenes | `4fc73a571da6a16c9c2b9bff3905498e` (intacta) |
| Huella de las 18 | `fa58b030f2f380f19167550e8e52c9bf` (intacta) |

---

## 4. Limpieza controlada del examen 19

Se ejecutó en una **transacción separada** con `ON_ERROR_STOP` y las siguientes
guardas dentro de un bloque `DO`:

1. `SELECT ... FOR UPDATE` sobre `examen_id = 19`.
2. Abortar si el examen no existe.
3. Abortar si `resultados_publicados_en` es distinto de
   `2026-11-10 10:45:54.071397+00`.
4. Abortar si la huella de los otros 17 exámenes no es
   `4fc73a571da6a16c9c2b9bff3905498e`.
5. Abortar si la huella de `rendicion` no es
   `2dad4f13916066d8138cec68d451f650`.
6. Abortar si la huella de `respuesta_inciso` no es
   `b621f513291b57adf71739699480a7ff`.
7. `UPDATE examen SET resultados_publicados_en = NULL` con
   `WHERE examen_id = 19 AND resultados_publicados_en = '2026-11-10 10:45:54.071397+00'`.
8. Abortar si no se actualizó exactamente una fila.
9. Abortar si el examen 19 conserva algún campo de publicación no nulo.
10. Recalcular y comparar las tres huellas laterales; abortar si cambiaron.

Salida:

```
BEGIN
DO
NOTICE:  Limpieza aplicada al examen 19. Huellas laterales intactas.
COMMIT
```

Cualquier `RAISE EXCEPTION` habría abortado la transacción sin modificar datos.
No fue necesario ningún rollback manual.

---

## 5. Registro en `migrations`

| id | timestamp | name |
|---|---|---|
| **15** | **1794600000000** | **SepararPublicacionRespuestas1794600000000** |
| 14 | 1794500000000 | RevisionCalificaciones1794500000000 |
| 13 | 1794400000000 | ModelosFormulaRendicion1794400000000 |

Total: **15** (antes 14). Solo se añadió la fila 15.

---

## 6. Columna creada

| Atributo | Valor |
|---|---|
| `column_name` | `respuestas_publicadas_en` |
| `data_type` | `timestamp with time zone` |
| `is_nullable` | `YES` |
| `column_default` | **ninguno** |

Coincide con el diseño: `timestamptz NULL` sin default.

---

## 7. Estado final del examen 19

| Campo | Valor |
|---|---|
| `estado` | `publicado` (sin cambios) |
| `resultados_publicados_en` | **`NULL`** |
| `respuestas_publicadas_en` | **`NULL`** |
| `calificaciones_revisadas_en` | **`NULL`** |

| Comprobación | Resultado |
|---|---|
| Exámenes con `resultados_publicados_en` no nulo | **0** |
| Exámenes con `respuestas_publicadas_en` no nulo | **0** |
| Exámenes con revisión confirmada | **0** |

Bajo A', el estudiante 8 ya no puede revisar el examen (ventana cerrada y
nada publicado → 403) hasta que el docente ejecute el flujo correcto. Es el
comportamiento esperado de la variante fail-closed.

---

## 8. Los otros 17 exámenes conservan sus valores

| Comprobación | Antes | Después |
|---|---|---|
| Huella de `examen` sin el 19 | `4fc73a571da6a16c9c2b9bff3905498e` | **idéntica** |
| Filas en `examen` | 18 | **18** |
| Columnas de `examen` | 21 | **22** (+1 esperada) |

Ningún otro examen fue modificado.

---

## 9. Calificaciones intactas

| Comprobación | Antes | Después |
|---|---|---|
| `rendicion` filas / con nota | 4 / 0 | **4 / 0** |
| Suma de `nota_final` | 0 | **0** |
| `respuesta_inciso` filas / con puntaje | 2 / 0 | **2 / 0** |
| Suma de `puntaje_obtenido` | 0 | **0** |
| `envio_calificacion` | 0 | **0** |
| Huella de `rendicion` | `2dad4f13916066d8138cec68d451f650` | **idéntica** |
| Huella de `respuesta_inciso` (8 col.) | `b621f513291b57adf71739699480a7ff` | **idéntica** |
| Huella de `respuesta_inciso` (7 col.) | `71fb94b24c3548ffbd3f86cb1bde7bc8` | **idéntica** |

No se modificaron notas, puntajes, rendiciones, respuestas ni estados de
revisión.

---

## 10. Cambio esperado de la huella del examen

Al limpiar `resultados_publicados_en` del examen 19, la huella de las 18 filas
cambia, porque esa columna forma parte de las 20 columnas de la huella:

| Huella | Valor |
|---|---|
| Antes de la limpieza | `fa58b030f2f380f19167550e8e52c9bf` |
| **Después de la limpieza** | **`d28a9fdbf971044b61eb15cfb3452f63`** |

Es el único cambio de datos autorizado. La huella de los 17 exámenes restantes
no cambió.

---

## 11. Sin conexiones ni transacciones residuales

| Comprobación | Resultado |
|---|---|
| Conexiones abiertas a `safetest` al finalizar | **0** |
| Transacciones `idle in transaction` | **0** |

---

## 12. Confirmación de que no se ejecutaron otras migraciones

| Comprobación | Resultado |
|---|---|
| Filas en `migrations` | 15 (solo se añadió `1794600000000`) |
| Archivos de migración posteriores a `1794600000000` | **ninguno** (`T2-04` no creada) |
| Migraciones pendientes | **0** |
| `calificaciones_revisadas_en` | Sigue en `NULL` en los 18 exámenes |
| Exámenes con resultados o respuestas publicadas | **0** |

---

## 13. Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/safetest-api/src/migrations/1794600000000-SepararPublicacionRespuestas.ts` | Se eliminó el `UPDATE` de backfill; el `up` solo añade la columna |
| `docs/hu-45/T2-03-ejecucion.md` | Este registro |

La limpieza se ejecutó con un SQL temporal fuera del repositorio
(`%TEMP%\opencode\limpiar-examen-19.sql`), no versionado.

**No se modificó** ningún otro archivo de producción. Las modificaciones
preexistentes en `frontend/package.json` y `frontend/package-lock.json` no se
tocaron.

---

## 14. Advertencia de reversión

El `down` de esta migración elimina la columna, pero **no restaura**
`resultados_publicados_en = '2026-11-10 10:45:54.071397+00'` en el examen 19:
esa fecha se perdió al aplicar A'. Si se revierte T2-03, el examen 19 quedará
sin ningún registro de la publicación histórica. Cualquier reversión debe
evaluarse con ese dato en consideración y no ejecutarse automáticamente.

---

## 15. Estado posterior

- **Migraciones pendientes:** 0.
- **T2-04** (`1794700000000-CorreccionIa.ts`): no creada, no ejecutada.
- **Examen 19:** desbloqueado para edición y confirmación por parte del
  docente; sin resultados ni respuestas publicadas.
- **HU-45:** la base queda lista para la migración de `correccion_ia` (T2-04),
  que no se inició.

No se avanzó con T2-04 ni con ninguna otra migración.
