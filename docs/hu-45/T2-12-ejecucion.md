# HU-45 · T2-12 — Cobertura de invariantes

## Mapa de pruebas I1–I17

| Invariante | Prueba(s) nombrada(s) |
| --- | --- |
| I1 | `correccionia.service.spec.ts` — `[I1] persiste una propuesta pendiente con el siguiente intento`; `[I15] solo la aceptación usa la vía oficial...` |
| I2 | `correccionia.service.spec.ts` — `[I2] modifica solo los campos editables y pasa a modificada`; `[I15] ...` |
| I3 | `correccionia.service.spec.ts` — `[I3] descarta una propuesta en estado %s y normaliza el motivo`; `[I15] ...` |
| I4 | `correccionia.worker.spec.ts` — `[I4] nunca cambia automáticamente una propuesta a aceptada` |
| I5 | `correccionia.service.spec.ts` — `[I5] aplica la valoración oficial y marca la propuesta como aceptada` |
| I6 | `correccionia.service.spec.ts` — `[I6] rechaza aceptar con el examen cerrado` |
| I7 | `correccionia.service.spec.ts` — `[I7] no consulta propuestas de un examen ajeno` |
| I8 | `correccionia.service.spec.ts` — `[I8] reemplaza la propuesta activa, enlaza el reemplazo y conserva el historial` |
| I9 | `correccionia.service.spec.ts` — `[I9] traduce la colisión del índice único activo a un conflicto estable` |
| I10 | `correccionia.worker.spec.ts` — `[I10] dos workers no reclaman la misma propuesta`; `correccionia.worker.store.spec.ts` — prueba de `FOR UPDATE SKIP LOCKED` |
| I11 | `correccionia.worker.spec.ts` — `[I11] recupera lease vencido con intentos disponibles a pendiente`; `[I11] marca TIEMPO_AGOTADO cuando vence el lease sin intentos disponibles` |
| I12 | `correccionia.service.spec.ts` — `[I12/I13] no persiste una propuesta si la solicitud tiene %s` (caso de respuesta vacía) |
| I13 | `correccionia.service.spec.ts` — `[I12/I13] no persiste una propuesta si la solicitud tiene %s` (caso de criterios insuficientes) |
| I14 | `correccionia.validacion.spec.ts` — pruebas `[I14]` para puntaje máximo, puntaje sugerido y confianza |
| I15 | `correccionia.service.spec.ts` — `[I15] solo la aceptación usa la vía oficial; servicio y worker preservan los datos oficiales` |
| I16 | `correccionia.service.spec.ts` — `[I16] rechaza una versión antigua`; `[I16] relee estado y version bajo bloqueo antes de aceptar` |
| I17 | `correccionia.service.spec.ts` — `[I17] rechaza un puntaje confirmado que no coincide` |

La advertencia adicional de criterio actualizado queda cubierta por
`correccionia.service.spec.ts` — `[I20] acepta con advertencia si cambió el
criterio vigente`.

## Verificaciones y limitaciones

| Verificación | Resultado |
| --- | --- |
| Pruebas de `src/correccionia` | 6 suites y 152 pruebas aprobadas con `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.t11.config.cjs --runInBand src/correccionia` |
| Type-check de producción (`tsconfig.build.json`) | Aprobado |
| Type-check completo incluyendo pruebas | Reporta errores preexistentes en scripts y suites ajenas a este cambio; sin errores reportados en `src/correccionia` |
| `git diff --check` | Aprobado |
| Formato Prettier | Aprobado en los archivos TypeScript modificados |
| Lint / build con versión requerida | No validados: la terminal usa Node `v18.16.0`, inferior a `20.19.0`; Oxlint no puede iniciar con esta versión |
| PostgreSQL | No conectado; `TEST_DATABASE_URL` no está configurada |

La invocación estándar de Jest también falla al usar TypeScript 6 con el
`rootDir` implícito. Se usó una configuración Jest existente del repositorio;
no se crearon archivos temporales de configuración.

El proyecto tiene un harness PostgreSQL condicional en
`backend/safetest-api/src/examen/examen.integration.spec.ts`, que exige una URL
para una base desechable. Sin `TEST_DATABASE_URL` no se ejecutaron pruebas
reales para el índice único parcial (I9), el bloqueo concurrente `SKIP LOCKED`
(I10), los `CHECK` (I14) ni las FK. Las pruebas unitarias/mocks no sustituyen
esa verificación de base de datos. No se ejecutaron SQL ni migraciones.
