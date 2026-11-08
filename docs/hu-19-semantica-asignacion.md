# HU-19 — Semántica de asignación de evaluaciones

Este documento formaliza la semántica implementada en el paso 4 del asistente de
evaluaciones (HU-13). No crea tablas, columnas ni migraciones: usa el esquema
existente (`examen.modo_asignacion`, `examen_estudiante`, `paralelo_examen` e
`inscripcion`).

## 1. Modos de asignación

### 1.1 `estudiantes` — selección individual

- La fuente de verdad para el acceso es **únicamente** `examen_estudiante`.
- `paralelo_examen` se conserva como contexto (por ejemplo, para mostrar los
  paralelos de origen), pero **nunca** autoriza el acceso.
- Entrar posteriormente a un paralelo asociado no concede acceso.
- Salir del paralelo no elimina automáticamente la asignación individual.
- La desactivación del estudiante suspende el acceso mientras permanezca
  inactivo. El registro en `examen_estudiante` se conserva para trazabilidad y
  el acceso se recupera si el estudiante vuelve a estar activo.
- El docente solo puede seleccionar estudiantes activos inscritos en paralelos
  suyos de la materia y periodo de la evaluación.

### 1.2 `paralelos` — pertenencia dinámica

- La fuente de verdad para el acceso es la pertenencia actual a alguno de los
  paralelos vinculados en `paralelo_examen` mediante `inscripcion`.
- La pertenencia se evalúa en cada solicitud, no se materializa una foto fija.
- Un estudiante activo que pertenece al paralelo accede; si deja de pertenecer,
  pierde el acceso.
- Un estudiante que ingresa posteriormente al paralelo obtiene acceso mientras
  la evaluación siga publicada y disponible según las reglas existentes de
  HU-13.
- Solo cuentan estudiantes activos.

## 2. Regla de acceso del estudiante

`GET /examenes/:id/estudiante` exige, en este orden:

1. La evaluación existe y está en estado `publicado`.
2. El estudiante autenticado está activo.
3. Según `examen.modo_asignacion`:
   - `estudiantes`: existe una fila en `examen_estudiante` para ese estudiante.
   - `paralelos`: existe una inscripción activa en un paralelo vinculado a la
     evaluación.
   - Cualquier otro valor se rechaza (`fail closed`).
4. Se mantienen las reglas de ventana de disponibilidad y de publicación de
   respuestas correctas de HU-42.

La identidad del estudiante proviene del JWT; no se acepta un `estudiante_id`
manipulable en body, query o parámetros.

## 3. Estudiantes inactivos

- No aparecen como destinatarios válidos en `GET /examenes/:id/asignacion`.
- No se pueden guardar como selección individual.
- No cuentan para el total de estudiantes de un paralelo al guardar una
  asignación grupal.
- No aparecen en el resumen (`GET /examenes/:id/resumen`) ni en los conteos de
  la lista de evaluaciones.
- No impiden ni permiten por sí solos la publicación: la publicación exige al
  menos un estudiante activo asignado.
- No reciben acceso mientras estén inactivos, aunque conserven su fila de
  asignación.
- La desactivación no elimina filas de `examen_estudiante` ni de
  `paralelo_examen`. La sustitución de una selección solo ocurre cuando el
  docente guarda explícitamente una nueva asignación o cambia el contexto de la
  evaluación.

## 4. Consecuencias funcionales

- En modo `paralelos`, la nómina efectiva puede cambiar entre la publicación y
  la rendición si cambian las inscripciones. Es el comportamiento acordado
  (dinámico).
- En modo `estudiantes`, la nómina es estable frente a cambios de paralelo.
- Un estudiante inactivo y luego reactivado recupera el acceso que le
  corresponda según su asignación, siempre que la evaluación siga publicada y
  disponible.
- La edición de la asignación sigue limitada a evaluaciones en `borrador`, igual
  que en HU-13.

### 4.1 Reemplazo explícito de la asignación

Guardar una asignación es un reemplazo total del conjunto de destinatarios del
modo elegido: se eliminan las filas actuales de `examen_estudiante` y/o
`paralelo_examen` y se insertan las de la nueva selección dentro de la misma
transacción. **Decisión: se conserva este comportamiento.**

Motivos:

- El modelo actual no guarda historial de asignaciones (`asignado_en`,
  `asignado_por`). Agregarlo requiere una migración y no forma parte de HU-19.
- `examen_estudiante` y `paralelo_examen` solo se usan para autorización y
  contexto; no son referenciadas por rendiciones ni calificaciones. Eliminar una
  fila no rompe historial académico.
- Mantener una mezcla de seleccionados anteriores y nuevos dejaría destinatarios
  obsoletos y haría impredecible lo que ve el docente.
- La desactivación por sí sola **no** borra filas: el estudiante inactivo
  conserva su registro y pierde acceso mientras esté inactivo. Si el docente
  vuelve a guardar la selección sin incluirlo, la fila se elimina; si intenta
  incluirlo, el guardado se rechaza porque solo se aceptan estudiantes activos.

Riesgo asumido: no hay trazabilidad de selecciones anteriores. Se documenta como
limitación; resolverlo requiere decisión funcional y migración.

### 4.2 Reinicio al editar materia, periodo o paralelo

`ExamenService.update` reinicia la asignación (vuelve el modo a `paralelos` y
deja solo el paralelo elegido) cuando:

- cambia `materia_id`;
- cambia `semestre_id`;
- se elige un `paralelo_id` que no estaba entre los paralelos asociados.

No reinicia si solo cambian `titulo` o `instrucciones`, ni si se reenvía el mismo
paralelo principal. Los criterios por tema se borran únicamente si cambia la
materia. La operación está dentro de una transacción y bloquea la fila de
`examen` con `pessimistic_write`, revalidando `estado = 'borrador'` dentro de la
transacción para no competir con `publicar`.

Decisión: se conserva el reinicio porque materia, periodo y paralelo definen el
contexto académico de la asignación; cambiarlo invalida la selección anterior.
El paso 1 del asistente muestra un diálogo de confirmación antes de guardar
cuando cambia la materia o el semestre, o cuando el paralelo elegido no estaba
asociado a la evaluación (`EvaluacionInfoForm`). El diálogo explica las
consecuencias, permite confirmar o cancelar sin perder los datos introducidos
y no se muestra para cambios que no reinician la asignación.


## 5. Compatibilidad con dependencias

- **HU-03 (paralelos):** compatible. La pertenencia dinámica usa `inscripcion`,
  creada y mantenida por la gestión de paralelos e invitaciones.
- **HU-05 (aceptación de invitaciones):** compatible. La aceptación crea la
  inscripción que luego evalúa el modo `paralelos`.
- **HU-06 (consulta de estudiantes del paralelo):** no se modifica su contrato.
  HU-19 aplica su propio filtro de `estudiante.activo` en asignación, resumen,
  conteos y acceso. Si HU-06 debe mostrar solo activos, se corrige en su propia
  historia para no alterar su alcance desde HU-19.
- **HU-13 (creación de evaluación):** compatible. Se reutilizan sus endpoints,
  estados, reglas de publicación y ventana de disponibilidad.
- **HU-42 (publicación de respuestas):** no se modifica. La regla de resultados
  publicados sigue intacta.
- **HU-41 (calificaciones):** no implementada y no requerida por esta semántica.

## 6. Decisiones pendientes fuera de este alcance

- Edición de la asignación después de publicar (recuperaciones, altas tardías).
- Auditoría de asignación (`asignado_en`, `asignado_por`), que requeriría
  migración y no forma parte de esta tarea.
- Pantalla «Mis evaluaciones» y endpoint de listado de evaluaciones asignadas.

## 7. Pruebas de concurrencia real

La verificación con PostgreSQL real, dos conexiones independientes y rollback
está en `docs/hu-19-integracion-postgres.md`. Se ejecuta solo con
`TEST_DATABASE_URL` apuntando a una base desechable.
