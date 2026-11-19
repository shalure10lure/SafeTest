# HU-45 · T2-02 — Registro de ejecución

**Migración ejecutada:** `RevisionCalificaciones1794500000000` (`1794500000000`)
**Método:** script puntual `scripts/ejecutar-migracion-puntual.ts` (Opción A)
**`migration:run` genérico:** no utilizado
**Otras migraciones ejecutadas:** ninguna
**Fecha:** 2026-11-19

---

## 1. Verificación de destino

| Comprobación | Resultado |
|---|---|
| `current_database()` | `safetest` |
| `inet_server_port()` | `5432` |
| `DB_NAME` del entorno | `safetest` |
| Migraciones pendientes detectadas | 2, ambas en la lista blanca |

El script habría abortado si la base no fuera `safetest`, si el puerto del
servidor no fuera 5432 o si hubiera pendientes fuera de la lista aprobada.

## 2. Comando ejecutado

```powershell
npx ts-node --transpile-only -P scripts/tsconfig.json `
  scripts/ejecutar-migracion-puntual.ts `
  --migracion=RevisionCalificaciones1794500000000 `
  --confirmar-base=safetest
```

Salida relevante:

```
Destino real: base=safetest puerto_servidor=5432
Pendientes detectadas (2):
  - RevisionCalificaciones1794500000000
  - SepararPublicacionRespuestas1794600000000

Ejecutando únicamente: RevisionCalificaciones1794500000000
  timestamp=1794500000000

[OK] Migración confirmada (commit).
```

Ejecutada dentro de una transacción explícita
(`startTransaction` / `commitTransaction`, con `rollback` ante error).

## 3. Registro en `migrations`

| id | timestamp | name |
|---|---|---|
| **14** | **1794500000000** | **RevisionCalificaciones1794500000000** |
| 13 | 1794400000000 | ModelosFormulaRendicion1794400000000 |
| 12 | 1794300000000 | PuntajePreguntaExamen1794300000000 |

Total de filas: **14** (antes 13). Solo se añadió la fila 14.

## 4. Columna creada

| Comprobación | Resultado |
|---|---|
| `column_name` | `calificaciones_revisadas_en` |
| `data_type` | `timestamp with time zone` |
| `is_nullable` | `YES` |
| `column_default` | **ninguno** |

Coincide exactamente con el diseño: `timestamptz NULL` sin default.

## 5. Valores tras la migración

| Comprobación | Resultado |
|---|---|
| Filas con `calificaciones_revisadas_en IS NOT NULL` | **0** |
| Filas con `calificaciones_revisadas_en IS NULL` | **18** |
| Examen 19 (`examen_id=19`) | `NULL` |

Ningún examen quedó marcado como revisado: las compuertas siguen cerradas.

## 6. Estructura y datos intactos

| Comprobación | Antes | Después |
|---|---|---|
| `count(*) FROM examen` | 18 | **18** |
| Columnas de `examen` | 20 | **21** (+1 esperada) |
| `count(*) FROM respuesta_inciso` | 2 | **2** |
| `count(*) FROM rendicion` | 4 | **4** |
| Índices de `examen` | 1 (`PK_9afa0652...`) | **1 (sin cambios)** |
| Restricciones de `examen` | 1 CHECK, 3 FK, 1 PK | **sin cambios** |

No se crearon índices ni restricciones nuevas.

## 7. Huella del examen

| Comprobación | Resultado |
|---|---|
| Huella explícita (20 columnas) | **`fa58b030f2f380f19167550e8e52c9bf`** |
| Esperada | `fa58b030f2f380f19167550e8e52c9bf` |

Idéntica. La huella no incluye `calificaciones_revisadas_en` y la migración no
modificó ninguna fila.

## 8. T2-03 sigue pendiente

| Comprobación | Resultado |
|---|---|
| `examen.respuestas_publicadas_en` | **no existe** (0 filas en `information_schema`) |
| Registro de `1794600000000` en `migrations` | **0** |
| `resultados_publicados_en` | Intacto; solo el examen 19 lo tiene (1 fila) |
| Examen 19 `resultados_publicados_en` | `2026-11-10 10:45:54.071397+00` (sin cambios) |

La decisión sobre el backfill del examen 19 permanece abierta y no se tocó.

## 9. Sin bloqueos residuales

| Comprobación | Resultado |
|---|---|
| Conexiones abiertas a `safetest` al finalizar | **0** |
| Transacciones `idle in transaction` | **0** |

## 10. Estado posterior

Pendientes: **1**

1. `SepararPublicacionRespuestas1794600000000` — bloqueada pendiente de decisión
   explícita sobre el backfill del examen 19.

T2-02 **no abrió ninguna compuerta**: no publica soluciones, no publica
resultados y no marca ningún examen como revisado. Solo habilita que el código
de HU-31 evalúe la columna en lugar de fallar por inexistencia.

No se avanzó con T2-03 ni T2-04.
