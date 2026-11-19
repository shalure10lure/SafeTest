# HU-45 · T2-01 — Registro de ejecución

**Migración ejecutada:** `ModelosFormulaRendicion1794400000000` (`1794400000000`)
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
| Migraciones pendientes detectadas | 3, todas en la lista blanca |

El script habría abortado si la base no fuera `safetest`, si el puerto del
servidor no fuera 5432 o si hubiera pendientes fuera de la lista aprobada.

## 2. Comando ejecutado

```powershell
npx ts-node --transpile-only -P scripts/tsconfig.json `
  scripts/ejecutar-migracion-puntual.ts `
  --migracion=ModelosFormulaRendicion1794400000000 `
  --confirmar-base=safetest
```

Salida relevante:

```
Destino real: base=safetest puerto_servidor=5432
Pendientes detectadas (3):
  - ModelosFormulaRendicion1794400000000
  - RevisionCalificaciones1794500000000
  - SepararPublicacionRespuestas1794600000000

Ejecutando únicamente: ModelosFormulaRendicion1794400000000
[OK] Migración confirmada (commit).
```

La migración se ejecutó dentro de una transacción explícita
(`startTransaction` / `commitTransaction`, con `rollback` en caso de error).

## 3. Registro en `migrations`

| id | timestamp | name |
|---|---|---|
| **13** | **1794400000000** | **ModelosFormulaRendicion1794400000000** |
| 12 | 1794300000000 | PuntajePreguntaExamen1794300000000 |
| 11 | 1794100000000 | ExamenPoolSnapshot1794100000000 |

Total de filas: **13** (antes 12). Solo se añadió la fila 13.

## 4. Tablas creadas

| Tabla | `relkind` |
|---|---|
| `modelo` | `r` (tabla) |
| `pregunta_modelo` | `r` |
| `modelo_formula` | `r` |
| `respuesta_modelo` | `r` |

Secuencia creada: `modelo_modelo_id_seq`.

### Columnas

| Tabla | Columnas |
|---|---|
| `modelo` | `modelo_id integer NOT NULL` (serial), `nombre varchar(150) NOT NULL`, `descripcion text`, `variables jsonb NOT NULL DEFAULT '{}'`, `activo boolean NOT NULL DEFAULT true` |
| `pregunta_modelo` | `pregunta_id integer NOT NULL`, `modelo_id integer NOT NULL` |
| `modelo_formula` | `modelo_id integer NOT NULL`, `formula_id integer NOT NULL` |
| `respuesta_modelo` | `estudiante_id integer NOT NULL`, `examen_id integer NOT NULL`, `pregunta_id integer NOT NULL`, `letra varchar NOT NULL`, `modelo_id integer NOT NULL`, `valores jsonb NOT NULL DEFAULT '{}'`, `resultado_final text`, `actualizado_en timestamptz NOT NULL DEFAULT now()` |

## 5. Índices

| Tabla | Índice | Tipo |
|---|---|---|
| `modelo` | `PK_modelo` | PK |
| `modelo` | `IDX_modelo_activo_nombre` | secundario |
| `pregunta_modelo` | `PK_pregunta_modelo` | PK |
| `pregunta_modelo` | `IDX_pregunta_modelo_modelo` | secundario |
| `modelo_formula` | `PK_modelo_formula` | PK |
| `modelo_formula` | `IDX_modelo_formula_formula` | secundario |
| `respuesta_modelo` | `PK_respuesta_modelo` | PK |
| `respuesta_modelo` | `IDX_respuesta_modelo_modelo` | secundario |

Total: 8 (4 PK + 4 secundarios).

## 6. Restricciones

| Tabla | Constraint | Tipo | ON DELETE |
|---|---|---|---|
| `modelo` | `PK_modelo` | PK | — |
| `modelo` | `CHK_modelo_variables_objeto` | CHECK | — |
| `pregunta_modelo` | `PK_pregunta_modelo` | PK | — |
| `pregunta_modelo` | `FK_pregunta_modelo_pregunta` | FK → `pregunta` | **RESTRICT** |
| `pregunta_modelo` | `FK_pregunta_modelo_modelo` | FK → `modelo` | **CASCADE** |
| `modelo_formula` | `PK_modelo_formula` | PK | — |
| `modelo_formula` | `FK_modelo_formula_formula` | FK → `formula` | **RESTRICT** |
| `modelo_formula` | `FK_modelo_formula_modelo` | FK → `modelo` | **CASCADE** |
| `respuesta_modelo` | `PK_respuesta_modelo` | PK | — |
| `respuesta_modelo` | `FK_respuesta_modelo_respuesta_inciso` | FK compuesta → `respuesta_inciso` | **RESTRICT** |
| `respuesta_modelo` | `FK_respuesta_modelo_pregunta_modelo` | FK compuesta → `pregunta_modelo` | **RESTRICT** |
| `respuesta_modelo` | `CHK_respuesta_modelo_valores_objeto` | CHECK | — |

Las acciones de borrado coinciden con el diseño.

## 7. Conteos

| Tabla | Filas |
|---|---|
| `modelo` | **0** |
| `pregunta_modelo` | **0** |
| `modelo_formula` | **0** |
| `respuesta_modelo` | **0** |

## 8. Confirmación de no alteración de datos existentes

| Comprobación | Antes | Después |
|---|---|---|
| `count(*) FROM examen` | 18 | **18** |
| `count(*) FROM respuesta_inciso` | 2 | **2** |
| `count(*) FROM rendicion` | 4 | **4** |
| Huella de `examen` | `fa58b030f2f380f19167550e8e52c9bf` | **`fa58b030f2f380f19167550e8e52c9bf`** |

No se modificaron exámenes, respuestas, rendiciones ni calificaciones.

## 9. Confirmación de que no se ejecutaron otras migraciones

| Comprobación | Resultado |
|---|---|
| Filas en `migrations` | 13 (solo se añadió `1794400000000`) |
| `examen.calificaciones_revisadas_en` | Sigue sin existir |
| `examen.respuestas_publicadas_en` | Sigue sin existir |
| Registros de `1794500000000` y `1794600000000` | 0 |
| Conexiones abiertas al finalizar | 0 |
| Transacciones `idle in transaction` | 0 |

## 10. Estado posterior

Pendientes: **2**

1. `RevisionCalificaciones1794500000000`
2. `SepararPublicacionRespuestas1794600000000`

No se avanzó con T2-02, T2-03 ni T2-04.
