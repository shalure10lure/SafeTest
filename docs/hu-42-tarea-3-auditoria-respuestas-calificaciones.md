# HU-42 — Tarea 3: auditoría y protección de respuestas y calificaciones

## 1. Conclusión principal

En el backend actual **no existen operaciones de creación, modificación o
consulta de respuestas de estudiantes ni de calificaciones**. Solo existen las
entidades/tablas `respuesta_inciso`, `opcion_marcada`, `formula_elegida`,
`rendicion` y `envio_calificacion`; no hay módulos, controladores, servicios ni
endpoints que las manipulen.

Por tanto:

- No hay un flujo de rendición implementado (HU-40 no existe como módulo).
- No hay endpoints que lean o escriban `rendicion.nota_final`.
- No hay endpoints que lean o escriban `respuesta_inciso`.
- La única operación académica existente para estudiantes es la vista segura de
  la evaluación (`GET /examenes/:id/estudiante`), que no devuelve respuestas
  almacenadas ni calificaciones.
- Las protecciones de T1 y T2 ya cubren esa vista y los endpoints del docente;
  no se añadieron guards ni servicios duplicados.

## 2. T0 — Auditoría

### 2.1 Entidades revisadas

| Entidad / tabla | Campos relevantes | Relaciones |
|---|---|---|
| `Rendicion` / `rendicion` | PK `(estudiante_id, examen_id)`, `paralelo_id`, `nota_final` (decimal, nullable), `estado`, `fecha_inicio`, `fecha_envio` | `Estudiante`, `Examen`, `Paralelo`, `EnvioCalificacion`, `EventoSeguridad` |
| `RespuestaInciso` / `respuesta_inciso` | PK `(estudiante_id, examen_id, pregunta_id, letra)`, `respuesta_texto`, `puntaje_obtenido`, `estado_correccion`, `retroalimentacion`, `guardado_en`, campos IA | `Inciso`, `AsignacionPregunta`, `OpcionMarcada`, `FormulaElegida` |
| `OpcionMarcada` / `opcion_marcada` | PK `(estudiante_id, examen_id, pregunta_id, letra, nro_opcion)` | `RespuestaInciso`, `Opcion` |
| `FormulaElegida` / `formula_elegida` | Respuesta a fórmulas | `RespuestaInciso`, `Formula` |
| `EnvioCalificacion` / `envio_calificacion` | `estudiante_id`, `examen_id`, `fecha`, `estado` | `Rendicion` |
| `EventoSeguridad` / `evento_seguridad` | Eventos de rendición | `Rendicion` |
| `Estudiante` | `estudiante_id`, `activo`, datos personales | `Inscripcion`, `Rendicion` |
| `Docente` | `docente_id`, `activo` | Materias, paralelos, exámenes |
| `Examen` | `docente_id`, `estado`, `resultados_publicados_en`, ventana de disponibilidad | `ExamenPregunta`, `ParaleloExamen`, `ExamenEstudiante`, `Rendicion` |
| `ExamenEstudiante` | PK `(examen_id, estudiante_id)` | Asignación directa |
| `Inscripcion` | PK `(estudiante_id, paralelo_id)` | Pertenencia a paralelo |
| `ParaleloExamen` | PK `(paralelo_id, examen_id)` | Asignación por paralelo |
| `Paralelo` | `docente_id`, `materia_id`, `semestre_id` | Inscripciones, rendiciones |
| `AsignacionPregunta` | PK `(estudiante_id, examen_id, pregunta_id)`, `orden` | Preguntas asignadas al estudiante |
| `ExamenPregunta` | PK `(examen_id, pregunta_id)`, `orden` | Preguntas de la evaluación |

### 2.2 Controladores y servicios revisados

- `AppModule`: registro global de `JwtAuthGuard`; registro de entidades; no hay
  módulo de rendición ni de respuestas.
- `AuthModule`, `JwtAuthGuard`, `JwtStrategy`, `DocenteGuard`,
  `EstudianteGuard`, `Public`.
- `ExamenController`, `ExamenEstudianteController`, `ExamenService`,
  `ExamenAccesoService`.
- `PreguntaController`, `PreguntaService` (docente-only y filtrado por
  `materia.docente_id`).
- `ParaleloEstudiantesController`, `ParaleloEstudiantesService` (docente-only y
  filtrado por `paralelo.docente_id`).
- `ParaleloController`, `MateriaController`, `TemaController` (gestión docente).
- Migración `1792887256691-CambiosSprint1` para verificar columnas y
  restricciones existentes.

### 2.3 Operaciones realmente implementadas

| Operación | Estado |
|---|---|
| Consultar la evaluación para el estudiante autenticado | **Implementada**: `GET /examenes/:id/estudiante` |
| Consultar respuestas correctas como docente propietario | **Implementada**: `GET /examenes/:id/respuestas` |
| Publicar respuestas correctas | **Implementada**: `POST /examenes/:id/respuestas/publicar` |
| Crear/guardar respuestas de un estudiante | **No existe** |
| Modificar respuestas de un estudiante | **No existe** |
| Consultar respuestas de otro estudiante | **No existe** |
| Iniciar/enviar una rendición | **No existe** |
| Calcular o modificar `nota_final` | **No existe** |
| Consultar calificaciones propias o de terceros | **No existe** |
| Publicar calificaciones | **No existe** (tampoco existe el campo de publicación) |

### 2.4 Autenticación y pertenencia existentes

- `JwtAuthGuard` es global y valida el token salvo rutas `@Public()`.
- `JwtStrategy` verifica que el docente/estudiante siga existiendo y activo, y
  construye `request.user = { id, nombre, correo, tipo }`.
- `DocenteGuard` exige `tipo === 'docente'`.
- `EstudianteGuard` exige `tipo === 'estudiante'`.
- Pertenencia del estudiante:
  - Asignación directa: `examen_estudiante(examen_id, estudiante_id)`.
  - Asignación por paralelo: `inscripcion(estudiante_id, paralelo_id)` +
    `paralelo_examen(paralelo_id, examen_id)`.
- Pertenencia del docente:
  - Evaluaciones: `examen.docente_id = request.user.id`.
  - Materias: `materia.docente_id`.
  - Paralelos: `paralelo.docente_id`.
- Preguntas por estudiante: se respeta `asignacion_pregunta` si existe; si no,
  se usa `examen_pregunta`.

## 3. T1 — Protección de respuestas

No hay operaciones de escritura de respuestas que proteger. Las operaciones
existentes relacionadas se comportan así:

1. **La identidad del estudiante no es manipulable.** El endpoint
   `GET /examenes/:id/estudiante` no recibe `estudiante_id`; usa exclusivamente
   `request.user.id`. No existe un identificador de estudiante en la ruta, el
   body o la query que pueda modificarse para leer respuestas ajenas.
2. **La asignación se valida en el backend.** `ExamenAccesoService` comprueba
   `examen_estudiante` o la combinación `inscripcion` + `paralelo_examen`. Si no
   hay asignación, devuelve `404` genérico.
3. **La evaluación debe estar publicada.** Si `estado !== 'publicado'`, devuelve
   `404` genérico para no permitir enumeración.
4. **La ventana se valida antes de publicar resultados.** Fuera de
   `disponible_desde`/`disponible_hasta`, devuelve `403`.
5. **No se exponen soluciones antes de tiempo.** Antes de
   `resultados_publicados_en`, la consulta no une tablas de solución ni
   selecciona `pregunta.explicacion`.
6. **El docente solo accede a sus evaluaciones.** `obtenerRespuestasDocente` y
   `publicarRespuestas` filtran por `examen_id` y `docente_id`. Un docente ajeno
   recibe `404`.
7. **No hay respuestas almacenadas expuestas.** La vista del estudiante no
   consulta `respuesta_inciso`, `opcion_marcada` ni `rendicion`, y no devuelve
   `puntaje_obtenido`, `retroalimentacion`, `respuesta_texto` ni
   `estado_correccion`.

## 4. T2 — Protección de calificaciones

`rendicion.nota_final` **no se lee ni se escribe en ningún controlador o
servicio actual**. Por tanto:

- Un estudiante no puede modificar su propia calificación porque no existe
  ningún endpoint que acepte notas.
- Un estudiante no puede consultar calificaciones de otros porque no existe
  ningún endpoint de calificaciones.
- Un docente no puede modificar calificaciones fuera de su ámbito porque no
  existe ninguna operación de modificación.
- No hay rutas que reciban `estudiante_id` o `nota_final` para manipular.

La protección efectiva hoy es la ausencia de superficie de ataque. Cuando se
implemente HU-40, las reglas de T2 deberán aplicarse en el nuevo módulo.

## 5. T3 — Dependencias y contrato de seguridad propuesto

No se implementaron controladores, servicios ni endpoints nuevos. El contrato
que deberá respetar la futura implementación es el siguiente.

### 5.1 Respuestas del estudiante (futuro HU-40)

Endpoints sugeridos, solo cuando exista el flujo de rendición:

- `GET /examenes/:examenId/rendicion` — consulta la rendición propia.
- `PUT /examenes/:examenId/respuestas/:preguntaId/:letra` — guarda/actualiza la
  respuesta propia.
- `POST /examenes/:examenId/rendicion/enviar` — envía la rendición propia.

Reglas obligatorias:

1. `estudiante_id` se obtiene **siempre** de `request.user.id`; nunca del body,
   query o params.
2. Verificar `EstudianteGuard` y usuario activo.
3. Verificar que el examen esté publicado y dentro de la ventana.
4. Verificar asignación por `examen_estudiante` o por
   `inscripcion` + `paralelo_examen`.
5. Verificar que la pregunta pertenezca al examen y, si existe
   `asignacion_pregunta`, que esté asignada al estudiante.
6. Verificar que el inciso/pertenencia corresponda (`pregunta_id`, `letra`).
7. No devolver soluciones ni `explicacion` antes de
   `resultados_publicados_en`.
8. No permitir modificar respuestas después de enviar la rendición, salvo regla
   funcional explícita.
9. Conservar las respuestas existentes: las actualizaciones deben ser sobre la
   misma clave `(estudiante_id, examen_id, pregunta_id, letra)`.

### 5.2 Calificaciones (futuro HU-40/HU-41)

Endpoints sugeridos, solo cuando exista el flujo de corrección:

- `GET /examenes/:examenId/rendiciones` — docente propietario.
- `GET /examenes/:examenId/rendiciones/:estudianteId` — docente propietario.
- `PATCH /examenes/:examenId/rendiciones/:estudianteId/nota` — docente
  propietario, si el flujo de corrección lo requiere.

Reglas obligatorias:

1. `docente_id` se obtiene **siempre** de `request.user.id`.
2. Verificar `DocenteGuard`.
3. Verificar `examen.docente_id = request.user.id` antes de leer o escribir.
4. Verificar que el `estudianteId` pertenezca a la evaluación mediante
   `examen_estudiante` o `inscripcion` + `paralelo_examen`.
5. Un estudiante nunca debe tener acceso a endpoints de escritura de notas.
6. La consulta de notas propias, si se habilita, debe usar `request.user.id` y
   respetar la publicación definida por HU-41.
7. No reutilizar `resultados_publicados_en` para calificaciones.

### 5.3 Publicación de calificaciones

No se implementó ni se agregó ningún campo. Si HU-41 requiere un momento propio
de publicación, la propuesta sigue siendo un campo separado como
`examen.calificaciones_publicadas_en` o un estado por rendición. Esa decisión
requiere aprobación y migración autorizada; **no forma parte de esta tarea**.

## 6. T4 — Pruebas

Pruebas existentes relevantes:

- `src/examen/examen-acceso.service.spec.ts`
  - Vista del estudiante sin soluciones antes de publicar.
  - Vista con soluciones después de publicar.
  - Estudiante no asignado → `404`.
  - Evaluación en borrador → `404`.
  - Fuera de ventana → `403`.
  - Docente propietario obtiene soluciones.
  - Docente ajeno → `404`.
  - Publicación atómica, idempotente y concurrente.
  - **Nueva:** la vista no expone `nota_final`, `puntaje_obtenido`,
    `retroalimentacion`, `respuesta_texto`, `opcionesMarcadas` ni
    `estado_correccion`.
- `src/auth/guards/guards.spec.ts`
  - `DocenteGuard` permite docentes y niega estudiantes/sin sesión.
  - `EstudianteGuard` permite estudiantes y niega docentes/sin sesión.
- `src/auth/strategies/jwt.strategy.spec.ts`
  - Usuarios deshabilitados/eliminados son rechazados.
- **Nuevo** `src/examen/examen-estudiante.controller.spec.ts`
  - La vista del estudiante usa `request.user.id`.
  - Un `estudiante_id` enviado en body/query no se utiliza.
- **Nuevo** `src/examen/examen.controller.spec.ts`
  - Las respuestas del docente usan `request.user.id`.
  - La publicación usa `request.user.id`.
  - Un `docente_id` enviado en body/query no se utiliza.

No se añadieron pruebas de escritura de respuestas ni de notas porque esas
operaciones no existen.

## 7. Limitaciones

- No hay endpoints de rendición, respuestas ni calificaciones que probar.
- No se ejecutaron pruebas de integración contra PostgreSQL porque no existe una
  base de pruebas aislada; `.env` apunta a la base de desarrollo.
- Las protecciones de T1/T2 para el futuro flujo dependen de que HU-40
  implemente el contrato de la sección 5.
- La publicación de calificaciones queda pendiente de HU-41 y de una decisión
  de esquema aprobada.

## 8. Restricciones respetadas

- No se ejecutaron migraciones.
- No se modificó el esquema.
- No se crearon tablas ni columnas.
- No se alteró `resultados_publicados_en`.
- No se duplicaron guards ni servicios.
- No se expusieron secretos.
