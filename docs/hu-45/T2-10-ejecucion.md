# HU-45 · T2-10 — Worker y proveedor `fake`

**Estado:** implementación enfocada lista; aceptación pendiente de validar
build y lint en una versión de Node compatible.

## Alcance implementado

- El worker reclama propuestas pendientes en una sentencia atómica con
  `FOR UPDATE SKIP LOCKED`; los reclamos técnicos aumentan
  `reintentos_worker`, no el ordinal funcional `intento`.
- El proveedor de corrección se inyecta mediante el token independiente
  `AI_CORRECCION_PROVIDER`, configurado con `FakeAiProvider`.
- El procesamiento valida y normaliza la respuesta del proveedor, recupera
  leases vencidos y evita guardar resultados de exámenes cerrados.
- La persistencia sincroniza el bloqueo del examen con el de la propuesta.
- `GeminiAiProvider` conserva un método explícito no implementado para esta
  operación, que queda fuera de alcance hasta el caso 9.
- El worker no acepta propuestas ni escribe en `RespuestaInciso`, `Rendicion`,
  `Examen` o columnas `ia_*`.

## Verificaciones

| Verificación | Resultado |
| --- | --- |
| Pruebas enfocadas de worker, store, módulos y proveedores | 9 suites, 101 pruebas aprobadas |
| Type-check enfocado de los cambios | Aprobado |
| `git diff --check` | Aprobado |
| Suite completa | 55 suites aprobadas, 1 omitida y 4 fallidas |
| Build de Nest | Bloqueado por Node `v18.16.0`; la CLI instalada contiene sintaxis de import attributes no soportada por esa versión |
| Lint (`npm run lint`) | Bloqueado por Node `v18.16.0`; Oxlint instalado requiere Node `^20.19.0` o `>=22.12.0` y su launcher falla al cargar ESM |
| Type-check completo del proyecto | Reporta errores preexistentes fuera del alcance, incluidos tipos en `correccionia.service.spec.ts` y `jwt.strategy.spec.ts` |
| PostgreSQL, SQL y migraciones | No ejecutados |

La suite completa también presenta fallos de PDF.js por falta de `DOMMatrix`
en Node 18; además de fallos ya existentes en pruebas de examen y corrección.
Las fallas del type-check completo no corresponden a los archivos modificados
para T2-10. No se marca la tarea como completada hasta repetir build y lint en
un entorno compatible y resolver o separar de forma verificable las fallas
preexistentes.

## Archivos

- `backend/safetest-api/src/correccionia/correccionia.worker.ts`
- `backend/safetest-api/src/correccionia/correccionia.worker.store.ts`
- `backend/safetest-api/src/correccionia/correccionia.worker.spec.ts`
- `backend/safetest-api/src/correccionia/correccionia.worker.store.spec.ts`
- `backend/safetest-api/src/ia/ai.types.ts`
- `backend/safetest-api/src/ia/ia.module.ts`
- `backend/safetest-api/src/ia/ia.module.spec.ts`
- `backend/safetest-api/src/ia/providers/ai.provider.ts`
- `backend/safetest-api/src/ia/providers/fake-ai.provider.ts`
- `backend/safetest-api/src/ia/providers/fake-ai.provider.spec.ts`
- `backend/safetest-api/src/ia/providers/gemini-ai.provider.ts`
- `backend/safetest-api/src/ia/providers/gemini-ai.provider.spec.ts`
- `backend/safetest-api/src/ia/providers/provider.factory.ts`
- `backend/safetest-api/src/ia/providers/provider.factory.spec.ts`
- `docs/hu-45/T1-diseno-persistencia-y-contrato.md`
- `docs/hu-45/T2-plan.md`
- `docs/hu-45/T2-10-ejecucion.md`
