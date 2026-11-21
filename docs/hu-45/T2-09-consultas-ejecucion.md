# HU-45 · T2-09 — Consultas de propuestas IA

**Estado:** implementado a nivel de servicio; controladores y DTO HTTP fuera
de esta tarea.

## Cambios

- `CorreccionIaService.listarPorExamen`: verifica primero la propiedad del
  examen y aplica filtros de estado, estudiante, pregunta, propuestas pendientes
  de revisión, límite y desplazamiento.
- `CorreccionIaService.obtenerDetalle`: obtiene por propuesta y verifica que el
  examen sea propiedad del docente actual. Las propuestas inexistentes o ajenas
  responden `404 PROPUESTA_NO_ENCONTRADA`.
- `CorreccionIaService.listarHistorial`: verifica la propiedad del examen y
  devuelve las propuestas del inciso ordenadas por `creada_en DESC`, con filtro
  opcional de estado y límite.
- Las consultas usan una proyección pública. No exponen
  `reintentos_worker` ni datos internos adicionales del worker.

## Verificaciones

- Pruebas unitarias enfocadas de autorización, aislamiento, consultas
  inexistentes, filtros y exclusión de campos internos: aprobadas.
- Pruebas enfocadas de corrección IA: 3 suites, 38 pruebas aprobadas.
- TypeScript enfocado: aprobado.
- Prettier: aprobado.
- `git diff --check`: pendiente de la revisión final.
- PostgreSQL, SQL y migraciones: no ejecutados.

## Fuera de alcance

No se implementaron PATCH, aceptación, descarte, worker, Gemini ni controladores
HTTP. No se modificaron calificaciones oficiales ni
`respuesta_inciso.ia_*`.
