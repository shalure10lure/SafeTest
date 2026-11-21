# HU-45 · T2-08 — Avance del servicio

**Estado:** parcial; solicitud de propuestas implementada. T2-08 permanece en
progreso.

## Alcance implementado

- `CorreccionIaService.solicitarPropuesta` valida la propiedad actual del
  examen, estados del examen y rendición, asignación del inciso, respuesta,
  criterios y puntaje máximo antes de insertar.
- La operación corre dentro de una transacción, bloqueando en orden examen,
  rendición, respuesta y propuesta. Bloquear la respuesta serializa solicitudes
  concurrentes del mismo inciso antes de consultar el historial/intento.
- Inserta una propuesta `pendiente`, con el siguiente `intento` y puntaje
  sugerido/confianza nulos. No modifica la calificación oficial ni columnas
  `respuesta_inciso.ia_*`.
- Traduce únicamente la violación `23505` de `UX_correccion_ia_activa` a
  `409 PROPUESTA_ACTIVA_EXISTENTE`.
- `CorreccionIaModule` registra y exporta el servicio.
- `PUNTAJE_MAX_INVALIDO` se valida tanto en la solicitud como al validar el
  resultado IA, reutilizando la misma regla pura para mantener el contrato HTTP.

## Verificaciones

- Pruebas enfocadas: 3 suites, 33 pruebas aprobadas (validación, servicio y
  módulo). Las pruebas de servicio usan dobles; no requieren PostgreSQL.
- TypeScript enfocado sobre el servicio, módulo, validaciones y dependencias:
  aprobado.
- Prettier y `git diff --check`: aprobados.
- PostgreSQL, SQL y migraciones: no ejecutados.

Se usó una configuración Jest ESM temporal para corregir la resolución de
`rootDir` con TypeScript 6 y cargar dependencias ESM; se retiró al terminar.
La configuración Jest ordinaria falla en este entorno antes de ejecutar las
pruebas por TS5011 y por intentar cargar dependencias ESM como CommonJS.

## Pendiente en T2-08

Implementar las operaciones restantes del ciclo de vida (consultar historial,
bandeja y detalle, modificar, descartar y regenerar), así como su cobertura.
La implementación actual no completa el alcance total ni los criterios de
aceptación de T2-08.
