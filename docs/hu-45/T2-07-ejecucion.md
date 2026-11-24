# HU-45 · T2-07 — Validación previa para corrección IA

**Estado:** completado.

## Alcance

- Se extrajo a `validacion-respuesta.ts` la comprobación pura que ya usaba
  `RendicionService`; conserva las reglas para texto, opciones y respuestas
  numéricas.
- `validarSolicitudCorreccionIa` rechaza con códigos estables una respuesta
  vacía/incompleta, un inciso no pendiente o criterios insuficientes. Acepta
  criterios basados en valor correcto finito, rúbrica no vacía o referencia
  revisada.
- `validarResultadoCorreccionIa` valida puntaje máximo finito y positivo,
  puntaje sugerido en `[0, máximo]` y confianza en `[0, 1]` o nula.
- `validarSolicitudCorreccionIa` también valida el puntaje máximo finito y
  positivo, compartiendo la misma regla y preservando el contrato HTTP de
  `PUNTAJE_MAX_INVALIDO`.
- La solicitud no requiere puntaje sugerido ni confianza, ausentes mientras la
  propuesta está `pendiente`.
- Los errores incluyen códigos estables (`INCISO_NO_PENDIENTE`,
  `PUNTAJE_MAX_INVALIDO`, `PUNTAJE_FUERA_DE_RANGO` y
  `CONFIANZA_FUERA_DE_RANGO`) y motivos legibles.
- La validación no usa repositorios, proveedor IA ni servicios, y no modifica
  notas oficiales ni columnas `ia_*`.

## Archivos

- `backend/safetest-api/src/rendicion/validacion-respuesta.ts`
- `backend/safetest-api/src/rendicion/rendicion.service.ts`
- `backend/safetest-api/src/correccionia/correccionia.validacion.ts`
- `backend/safetest-api/src/correccionia/correccionia.validacion.spec.ts`

## Verificaciones

| Verificación                                                          | Resultado                      |
| --------------------------------------------------------------------- | ------------------------------ |
| Pruebas enfocadas de ambas etapas y `RendicionService`                | 2 suites, 83 pruebas aprobadas |
| TypeScript enfocado sobre los archivos modificados y sus dependencias | Aprobado                       |
| Prettier y `git diff --check`                                         | Aprobados                      |
| PostgreSQL, SQL y migraciones                                         | No ejecutados                  |

Las pruebas se ejecutaron con una configuración temporal ESM que fija `rootDir`
para TypeScript 6; esa configuración se eliminó al terminar.

Siguiente tarea recomendada: continuar T2-08 implementando las operaciones
restantes del ciclo de vida y la validación de resultados generados.
