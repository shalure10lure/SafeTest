# HU-42 — Tarea 2.1: publicación de respuestas correctas

Este documento fija la semántica de publicación usada por la Tarea 2 y registra
las decisiones pendientes antes de HU-41 y T3. No implica cambios de esquema ni
migraciones.

## 1. Estados y conceptos distintos

| Concepto | Representación actual | Significado |
|---|---|---|
| Evaluación publicada | `examen.estado = 'publicado'` | La evaluación ya puede ser asignada/rendida según su ventana de disponibilidad y las asignaciones existentes. |
| Respuestas correctas publicadas | `examen.resultados_publicados_en IS NOT NULL` | El docente autorizó que los estudiantes asignados vean explicaciones y soluciones. |
| Calificaciones publicadas | **No modelado actualmente** | La nota de una rendición vive en `rendicion.nota_final`; no existe un indicador de publicación de calificaciones. |

### Regla actual

- `resultados_publicados_en` representa **exclusivamente** la publicación de
  respuestas correctas/explicaciones.
- No debe reutilizarse para publicar calificaciones. Son conceptos distintos:
  una evaluación puede estar publicada sin respuestas publicadas, y las
  calificaciones pueden requerir su propio momento de publicación.
- Consumidores actuales del campo:
  - `ExamenAccesoService.obtenerVistaEstudiante`: decide si consulta tablas de
    solución y si expone `explicacion`, `es_correcta`, `valor_correcto`,
    `tolerancia` y `solucion_referencia`.
  - `ExamenAccesoService.obtenerRespuestasDocente`: informa la fecha al docente.
  - `ExamenService.consultar`: lo devuelve en el resumen/consulta del docente.
  - Frontend: `features/evaluaciones/types.ts` y `ResumenPublicacion.tsx`.

### Propuesta si HU-41 necesita publicar calificaciones

Si HU-41 requiere un momento propio para publicar notas, la propuesta técnica es
agregar una columna nueva, por ejemplo:

```text
examen.calificaciones_publicadas_en timestamptz NULL
```

Esto **no se implementó ni se migró**. Antes de hacerlo debe confirmarse:

- Si la publicación de notas es por evaluación o por rendición.
- Si debe ser independiente de la publicación de respuestas.
- Qué endpoint y qué permiso la controlan.

## 2. Publicación concurrente

`ExamenAccesoService.publicarRespuestas` realiza un único `UPDATE` condicional:

```sql
UPDATE examen
SET resultados_publicados_en = now()
WHERE examen_id = $1
  AND docente_id = $2
  AND estado = 'publicado'
  AND resultados_publicados_en IS NULL
RETURNING examen_id, resultados_publicados_en
```

- Solo la primera solicitud que encuentra `resultados_publicados_en IS NULL`
  escribe la fecha.
- PostgreSQL serializa el acceso a la fila. Una segunda solicitud concurrente
  vuelve a evaluar la condición y no escribe, por lo que conserva la fecha de la
  primera publicación.
- Si el `UPDATE` no afecta filas, se hace una lectura de solo distinción para
  responder `404` (no existe o no es del docente) o `400` (sigue en borrador).
- Si ya estaba publicada, se devuelve la fecha existente con
  `ya_publicadas: true`, manteniendo la idempotencia.

## 3. Fechas de disponibilidad

Valores actuales en `examen`:

- `disponible_desde`: inicio de la ventana de rendición.
- `disponible_hasta`: fin de la ventana de rendición.
- Ambos son `NULL` mientras la evaluación es borrador.

Comportamiento actual:

1. Para publicar, `ExamenService.problemasParaPublicar` exige que ambas fechas
   existan, que `hasta > desde`, que `hasta` sea futura y que la ventana alcance
   para `duracion_min`.
2. Antes de publicar respuestas, `ExamenAccesoService.estaEnVentana` devuelve
   `false` si falta cualquiera de las dos fechas. Por tanto, el estudiante no
   puede rendir ni consultar una evaluación publicada sin ventana definida.
3. Después de publicar respuestas (`resultados_publicados_en != null`), el
   estudiante asignado puede revisar la evaluación aunque la ventana haya
   cerrado.

### Decisión pendiente

No se modificó esta regla. Falta que HU-40 / el flujo de rendición confirme:

- Si una fecha `NULL` significa “sin restricción” o “no disponible”.
- Si se permite publicar sin ventana.
- Si la consulta de resultados debe seguir disponible indefinidamente después de
  la publicación o depender de otra fecha.

Recomendación conservadora mientras no exista definición: mantener `NULL` como
“no disponible” y validar la ventana al publicar.

Nota de alcance: en el backend actual HU-40 solo cuenta con la entidad/tabla
`rendicion`; no existe todavía un módulo, controlador o servicio de rendición
que defina reglas adicionales de inicio/fin. Por eso no hay otra regla de
negocio con la que contrastar el comportamiento y no se alteró la existente.

## 4. Soluciones textuales

- Existe la entidad/tabla `solucion_texto`:
  - `pregunta_id`
  - `letra`
  - `respuesta_aceptada`
- Actualmente **no se consulta** en `ExamenAccesoService`.
- La vista publicada del estudiante expone `solucion_referencia`, que se obtiene
  de `solucion_inciso.rubrica`.
- Para preguntas de texto, `solucion_referencia` puede ser una rúbrica o
  referencia, no necesariamente la lista completa de respuestas aceptadas.

No se amplió la respuesta HTTP. Si la experiencia de revisión necesita mostrar
las respuestas aceptadas, la propuesta es agregar en la proyección posterior a
la publicación un campo como:

```text
respuestas_aceptadas: string[]
```

Debe decidirse si se muestra la lista completa o solo una referencia, y si eso
aplica a todos los tipos de respuesta. Antes de la publicación no debe
consultarse ni exponerse `solucion_texto`.

## 5. Pruebas de integración

- `test/jest-e2e.json` existe, pero levanta `AppModule` completo y usa la
  configuración de `.env`, que apunta a la base de desarrollo `safetest` en
  `localhost:5433`.
- No existe una base de datos de pruebas dedicada ni un archivo de entorno de
  pruebas versionado.
- Por seguridad no se ejecutaron pruebas de integración contra esa base ni se
  alteraron datos reales.
- Las pruebas de la Tarea 2.1 son unitarias y simulan las respuestas del
  repositorio; no validan los joins reales contra PostgreSQL.

Para habilitar integración real se necesitaría, como trabajo posterior y con
autorización:

1. Una base PostgreSQL exclusiva de pruebas (por ejemplo, un contenedor o base
   separada).
2. Variables de entorno de prueba explícitas.
3. Un mecanismo de limpieza/seed seguro.
4. Ejecutar las migraciones solo en ese entorno de pruebas.

## 6. Restricciones respetadas

- No se ejecutaron migraciones.
- No se modificó el esquema.
- No se cambió el contrato de los endpoints existentes.
- No se implementó HU-41 ni T3.
- Se conservaron las protecciones de T1 y T2.
