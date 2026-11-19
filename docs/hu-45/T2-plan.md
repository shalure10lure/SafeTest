# HU-45 · T2 — Diagnóstico de migraciones y plan de implementación

**Estado:** diagnóstico y planificación. Nada ejecutado.
**Escrituras en PostgreSQL:** ninguna.
**Migraciones aplicadas:** ninguna.

---

## 0. Aclaración de entorno

La base `safetest` se consultó en `localhost:5433`, que es el puerto publicado
por el contenedor `safetest-postgres` y que se mapea al `5432` interno. Es
decir: **`safetest` en el puerto 5432 del contenedor = 5433 en el host**. No es
una segunda base.

Estado verificado (solo lectura):

| Comprobación | Resultado |
|---|---|
| Filas en `migrations` | 12, hasta `1794300000000` |
| Tablas `modelo`, `pregunta_modelo`, `modelo_formula`, `respuesta_modelo` | **0 de 4 existen** |
| `examen.calificaciones_revisadas_en` | **No existe** |
| `examen.respuestas_publicadas_en` | **No existe** |
| `synchronize` | `false` (no hay autosincronización) |
| Migraciones | Se cargan por `readdirSync` desde `src/migrations` |

---

## 1. Diagnóstico de las tres migraciones pendientes

### 1.1 `1794400000000-ModelosFormulaRendicion.ts`

| Dato | Valor |
|---|---|
| Clase | `ModelosFormulaRendicion1794400000000` |
| Archivo | `backend/safetest-api/src/migrations/1794400000000-ModelosFormulaRendicion.ts` |
| Registrada en la base | **No** |

**Cambios de esquema**

Crea cuatro tablas y cuatro índices. No altera tablas existentes.

| Objeto | Definición |
|---|---|
| `modelo` | PK `modelo_id` serial; `nombre varchar(150)`, `descripcion`, `variables jsonb`, `activo boolean`; `CHECK jsonb_typeof(variables) = 'object'` |
| `pregunta_modelo` | PK `(pregunta_id, modelo_id)`; FK a `pregunta` `RESTRICT`, FK a `modelo` `CASCADE` |
| `modelo_formula` | PK `(modelo_id, formula_id)`; FK a `modelo` `CASCADE`, FK a `formula` `RESTRICT` |
| `respuesta_modelo` | PK `(estudiante_id, examen_id, pregunta_id, letra)`; FK compuesta a `respuesta_inciso` `RESTRICT`; FK a `pregunta_modelo` `RESTRICT`; `valores jsonb` con `CHECK`; `resultado_final text`; `actualizado_en timestamptz` |
| Índices | `IDX_modelo_activo_nombre`, `IDX_pregunta_modelo_modelo`, `IDX_modelo_formula_formula`, `IDX_respuesta_modelo_modelo` |

**Cambios de datos**

Ninguno. Las tablas se crean vacías.

**Riesgos y efectos secundarios**

1. **No es idempotente.** Usa `CREATE TABLE` sin `IF NOT EXISTS`. Si se ejecuta
   dos veces, falla. Si se aplicara parcialmente fuera de una transacción,
   quedarían objetos huérfanos y habría que limpiarlos a mano. Ejecutar con
   transacción por migración.
2. **Bloqueos breves sobre tablas existentes.** Crear las FKs toma un lock
   `SHARE ROW EXCLUSIVE` sobre `pregunta`, `formula` y `respuesta_inciso`.
   Con el volumen actual es despreciable; en caliente habría que ventanear.
3. **No toca datos ni columnas existentes.** Riesgo de pérdida: nulo.
4. **`respuesta_modelo` referencia `respuesta_inciso` con `RESTRICT`.** No
   cambia el comportamiento actual porque está vacía, pero una futura limpieza
   de respuestas deberá considerar esta tabla.

**Dependencias**

- Requiere `pregunta`, `formula` y `respuesta_inciso` (existen).
- No depende de las otras dos pendientes.
- Es requisito para que funcione `RevisionCalificacionesService.obtenerDetalle`,
  que consulta la entidad `RespuestaModelo`.

**¿Necesaria para HU-45?**

**Sí, de forma indirecta pero efectiva.** El esquema de `correccion_ia` no
depende de estas tablas, pero HU-45 se inserta en la pantalla de revisión por
inciso, y esa pantalla hoy falla contra esta base porque `obtenerDetalle`
consulta `respuesta_modelo`. Sin esta migración no hay forma de validar el
flujo completo de revisión y aceptación.

---

### 1.2 `1794500000000-RevisionCalificaciones.ts`

| Dato | Valor |
|---|---|
| Clase | `RevisionCalificaciones1794500000000` |
| Archivo | `backend/safetest-api/src/migrations/1794500000000-RevisionCalificaciones.ts` |
| Registrada en la base | **No** |

**Cambios de esquema**

```sql
ALTER TABLE "examen"
  ADD COLUMN IF NOT EXISTS "calificaciones_revisadas_en" timestamptz NULL;
```

**Cambios de datos**

Ninguno. La columna queda `NULL` en todas las filas.

**Riesgos y efectos secundarios**

1. **Riesgo mínimo.** Añadir una columna nullable sin default es una operación
   de metadatos en PostgreSQL 11+; no reescribe la tabla.
2. **Idempotente** por `IF NOT EXISTS`.
3. **Cambio de comportamiento inmediato.** En cuanto la columna existe, el
   código empieza a usarla como compuerta de edición. Mientras no se confirme
   nada, vale `NULL` y no bloquea.
4. `down` elimina la columna y con ella la marca de confirmación. Es revertible
   pero destructivo para ese dato.

**Dependencias**

- Requiere la tabla `examen` (existe).
- Es dependencia de `asegurarEdicionPermitida`, usada por `valorarInciso` y por
  todos los endpoints de HU-45.
- No depende de 179440 ni de 179460.

**¿Necesaria para HU-45?**

**Sí, bloqueante.** Sin esta columna:
- `asegurarEdicionPermitida` produce un `SELECT` con columna inexistente.
- No se puede garantizar el invariante "no aceptar si la revisión está
  cerrada".
- La aceptación, el descarte y la regeneración no pueden validar su compuerta.

---

### 1.3 `1794600000000-SepararPublicacionRespuestas.ts`

| Dato | Valor |
|---|---|
| Clase | `SepararPublicacionRespuestas1794600000000` |
| Archivo | `backend/safetest-api/src/migrations/1794600000000-SepararPublicacionRespuestas.ts` |
| Registrada en la base | **No** |

**Cambios de esquema**

```sql
ALTER TABLE "examen"
  ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz;
```

**Cambios de datos**

```sql
UPDATE "examen"
   SET "respuestas_publicadas_en" = "resultados_publicados_en"
 WHERE "resultados_publicados_en" IS NOT NULL
   AND "respuestas_publicadas_en" IS NULL;
```

Impacto medido en la base actual: **1 fila** (`examen_id = 19`). Las otras 17
no se tocan.

**Riesgos y efectos secundarios**

1. **Cambio de visibilidad retroactivo.** El `UPDATE` autoriza la publicación
   de soluciones para los exámenes que ya tenían resultados publicados. Es
   intencional según el comentario de la migración: preserva el comportamiento
   anterior. Aun así, es el único cambio con efecto funcional visible para
   estudiantes y debe revisarse antes de aplicar.
2. **Idempotente en la práctica:** `ADD COLUMN IF NOT EXISTS` y el `UPDATE` solo
   afecta filas con la nueva columna en `NULL`.
3. **Bloqueo de filas** durante el `UPDATE`. La tabla `examen` tiene 18 filas;
   impacto nulo.
4. `down` elimina la columna y pierde la separación entre publicación de notas
   y de respuestas.

**Dependencias**

- Requiere `examen` (existe).
- Consumida por `PublicacionResultadosService` y `ExamenAccesoService`.
- No depende de 179440 ni de 179450.

**¿Necesaria para HU-45?**

**Sí, para el entorno y para el gate de publicación.** El código de publicación
de resultados y de acceso al examen ya lee `respuestas_publicadas_en`; sin la
columna, esos flujos fallan. HU-45 no la escribe, pero comparte el mismo gate
de examen cerrado y debe convivir con el flujo de publicación.

---

## 2. Estrategia de aplicación controlada

Restricción vigente: **no ejecutar `migration:run` genérico**. Hay que aplicar
una migración por vez, con verificación entre pasos.

### Opción A (recomendada): ejecutor puntual

Un script de desarrollo, fuera de `src/migrations`, que:

1. Carga el `DataSource`.
2. Lista las migraciones pendientes y **aborta** si el conjunto no es
   exactamente el esperado.
3. Ejecuta **solo** la migración indicada por nombre, con transacción.
4. Verifica que quedó registrada en `migrations` y que los objetos existen.
5. No toca ninguna otra migración.

Ventajas: control explícito, idempotencia verificable, sin riesgo de aplicar
algo no revisado.

### Opción B: `migration:run` con waiver

Dado que las pendientes son exactamente tres, `migration:run` aplicaría solo
esas tres, en orden. Requiere que el usuario levante explícitamente la
restricción. **No se propone como camino por defecto.**

### Opción C: SQL manual + insertar en `migrations` (no recomendada)

Divide la transacción, duplica la lógica y deja el registro de TypeORM
desincronizado si algo falla. Se descarta.

### Orden propuesto

1. `1794400000000`
2. `1794500000000`
3. `1794600000000`

El orden no es estrictamente obligatorio entre ellas, pero respeta la secuencia
de timestamps y permite verificar una por una.

### Verificación posterior a cada paso (solo lectura)

```sql
SELECT id, timestamp, name FROM migrations ORDER BY id;
```

Y la comprobación específica del objeto creado.

### Plan de reversa

Cada migración tiene `down`. Si algo falla:

- 179440: `DROP TABLE respuesta_modelo, modelo_formula, pregunta_modelo, modelo`.
- 179450: `DROP COLUMN calificaciones_revisadas_en`.
- 179460: `DROP COLUMN respuestas_publicadas_en`.

Antes de revertir 179460 hay que asumir que se pierde la marca de publicación
de respuestas.

---

## 3. Plan de T2 en tareas pequeñas

Cada tarea es independiente y verificable. Ninguna se inicia sin autorización.

### T2-01 · Aplicar `1794400000000-ModelosFormulaRendicion`

- **Objetivo:** crear las cuatro tablas de modelos/fórmulas.
- **Entregable:** migración registrada + verificación de tablas e índices.
- **Criterio de aceptación:** las 4 tablas existen; `migrations` incluye
  `ModelosFormulaRendicion1794400000000`; `RespuestaModelo` deja de fallar.
- **Riesgo:** bajo. Sin cambios de datos.

### T2-02 · Aplicar `1794500000000-RevisionCalificaciones`

- **Objetivo:** añadir `examen.calificaciones_revisadas_en`.
- **Entregable:** columna verificada y migración registrada.
- **Criterio de aceptación:** columna `timestamptz` nullable; todas las filas
  en `NULL`; `asegurarEdicionPermitida` deja de fallar.
- **Riesgo:** mínimo.

### T2-03 · Aplicar `1794600000000-SepararPublicacionRespuestas`

- **Objetivo:** añadir `examen.respuestas_publicadas_en` y hacer el backfill.
- **Entregable:** columna verificada, backfill auditado.
- **Criterio de aceptación:** la columna existe; exactamente las filas con
  `resultados_publicados_en` no nulo tienen `respuestas_publicadas_en` con el
  mismo valor; el resto sigue en `NULL`.
- **Riesgo:** bajo, con efecto de visibilidad sobre 1 examen. Requiere revisión
  previa del usuario.

### T2-04 · Migración `correccion_ia`

- **Objetivo:** crear la tabla con columnas, FKs, `CHECK`, índice único parcial
  e índices secundarios, incluida `version`.
- **Entregable:** nueva migración `1794700000000-CorreccionIa.ts` y su `down`.
- **Criterio de aceptación:** el esquema coincide con el diseño aprobado;
  `UPDATE`/`DELETE` no rompen FKs; insertar dos propuestas activas del mismo
  inciso falla por el índice único.
- **Riesgo:** bajo; tabla nueva vacía.
- **Dependencia:** T2-01 a T2-03 aplicadas.

### T2-05 · Entidad y módulo

- **Objetivo:** `CorreccionIa` entity + `IaCorreccionModule` + registro en
  `app.module.ts`.
- **Entregable:** entidad tipada con enums de estado y relaciones.
- **Criterio de aceptación:** la app arranca; `autoLoadEntities` reconoce la
  entidad; no se tocan columnas `ia_*`.
- **Dependencia:** T2-04.

### T2-06 · Extraer `aplicarValoracionOficial`

- **Objetivo:** separar la lógica oficial de `valorarInciso` en un método que
  reciba `EntityManager` y **no** abra transacción.
- **Entregable:** `aplicarValoracionOficial(manager, …)` + `valorarInciso` como
  envoltorio transaccional.
- **Criterio de aceptación:** todas las pruebas actuales de `valorarInciso`
  pasan sin cambios de contrato; el método nuevo no llama
  `dataSource.transaction`.
- **Riesgo:** medio (refactor). Se hace antes de HU-45 y con pruebas de
  regresión.

### T2-07 · Reglas de negocio y validación de criterios

- **Objetivo:** implementar el universo asistible.
- **Reglas:**
  - Inciso `estado_correccion = 'pendiente'`.
  - Respuesta no vacía según tipo (`texto`/`desarrollo`/`numerica` vs.
    opciones marcadas).
  - Criterio válido: `solucion_inciso.valor_correcto` finito, `rubrica` no
    vacía, o solución de referencia revisada.
  - `puntaje_max` finito y > 0.
  - `0 ≤ puntaje_sugerido ≤ puntaje_max`.
  - Confianza en `[0, 1]`.
- **Entregable:** `iacorreccion.validacion.ts` con funciones puras y pruebas.
- **Criterio de aceptación:** cada regla tiene prueba; los motivos de rechazo
  son códigos estables.

### T2-08 · Ciclo de vida (sin worker)

- **Objetivo:** crear, listar por inciso, bandeja por examen, detalle,
  modificar, descartar y regenerar.
- **Reglas:**
  - Una propuesta activa por inciso.
  - `PATCH` solo en `generada` y solo los cuatro campos editables.
  - `version` se incrementa en cada mutación.
  - Regenerar marca `reemplazada` y enlaza `reemplazada_por_id`.
- **Entregable:** `iacorreccion.service.ts` + pruebas.
- **Criterio de aceptación:** invariantes I1–I3, I8, I9, I14 verificados.

### T2-09 · Aceptación transaccional

- **Objetivo:** aceptar una propuesta en una única transacción.
- **Secuencia obligatoria:**
  1. Bloquear examen (`pessimistic_write`) y validar propiedad.
  2. Validar publicación/revisión cerrada.
  3. Bloquear rendición.
  4. Bloquear propuesta.
  5. Validar estado `generada`/`modificada`, `version` y
     `puntaje_confirmado`.
  6. Aplicar `aplicarValoracionOficial(manager, …)`.
  7. Cambiar estado a `aceptada` y registrar `revisada_en` /
     `revisada_por_docente_id`.
- **Entregable:** método de aceptación + pruebas de fallo atómico.
- **Criterio de aceptación:** si falla cualquier paso, ni la nota ni el estado
  cambian; si la valoración falla, la propuesta sigue en su estado previo.
- **Dependencia:** T2-06.

### T2-10 · Worker y proveedor `fake`

- **Objetivo:** procesar solicitudes en segundo plano.
- **Reglas:**
  - Reclamo con `FOR UPDATE SKIP LOCKED`.
  - `pendiente → procesando → generada | error`.
  - Recuperación por lease.
  - Verificación de publicación antes de persistir.
- **Entregable:** `iacorreccion.worker.ts` + extensión de `AiProvider` +
  `fake-ai.provider.ts`.
- **Criterio de aceptación:** I10 e I11; dos workers no procesan la misma fila.
- **Fuera de alcance:** Gemini.

### T2-11 · Controladores y DTO

- **Objetivo:** exponer los ocho endpoints aprobados, incluida la bandeja por
  examen.
- **Entregable:** controladores + DTO con `class-validator`.
- **Criterio de aceptación:** contratos de §4 del diseño; 404 para examen
  ajeno; 409 en todos los conflictos de estado; `whitelist` rechaza campos no
  editables.

### T2-12 · Pruebas de invariantes

- **Objetivo:** cubrir I1–I17 y no-regresión de HU-31/HU-32.
- **Entregable:** suite descrita en §5.
- **Criterio de aceptación:** suite verde contra una base migrada.

### T2-13 · Documentación y colección Postman (opcional)

- **Objetivo:** actualizar `postman/` y la documentación de la HU.
- **Se decide después de T2-12.**

---

## 4. Archivos que se crearían o modificarían

### Nuevos

```
backend/safetest-api/src/migrations/1794700000000-CorreccionIa.ts
backend/safetest-api/src/iacorreccion/entity/correccionia.entity.ts
backend/safetest-api/src/iacorreccion/iacorreccion.module.ts
backend/safetest-api/src/iacorreccion/iacorreccion.service.ts
backend/safetest-api/src/iacorreccion/iacorreccion.controller.ts
backend/safetest-api/src/iacorreccion/iacorreccion-propuesta.controller.ts
backend/safetest-api/src/iacorreccion/iacorreccion.worker.ts
backend/safetest-api/src/iacorreccion/iacorreccion.types.ts
backend/safetest-api/src/iacorreccion/iacorreccion.errores.ts
backend/safetest-api/src/iacorreccion/iacorreccion.validacion.ts
backend/safetest-api/src/iacorreccion/dto/crear-correccion-ia.dto.ts
backend/safetest-api/src/iacorreccion/dto/listar-correcciones-ia.dto.ts
backend/safetest-api/src/iacorreccion/dto/actualizar-correccion-ia.dto.ts
backend/safetest-api/src/iacorreccion/dto/aceptar-correccion-ia.dto.ts
backend/safetest-api/src/iacorreccion/dto/descartar-correccion-ia.dto.ts
scripts/ejecutar-migracion-puntual.ts        (solo si se aprueba la opción A)
```

Más los `*.spec.ts` correspondientes.

### Modificados

```
backend/safetest-api/src/app.module.ts
backend/safetest-api/src/examen/revision-calificaciones.service.ts
backend/safetest-api/src/examen/examen.module.ts
backend/safetest-api/src/ia/ai.types.ts
backend/safetest-api/src/ia/providers/ai.provider.ts
backend/safetest-api/src/ia/providers/fake-ai.provider.ts
backend/safetest-api/src/examen/revision-calificaciones.service.spec.ts
```

### No se tocan

- `respuestainciso.entity.ts` ni las columnas `ia_*`.
- Entidades de calificación oficial (`rendicion`, `respuesta_inciso` en sus
  campos oficiales).
- Frontend.
- Proveedor Gemini.

---

## 5. Pruebas esenciales previstas

### Aceptación y atomicidad

| Prueba | Verifica |
|---|---|
| `aceptar_aplica_puntaje_y_recalcula_nota` | Flujo feliz; delega en la valoración oficial |
| `aceptar_con_version_antigua_devuelve_409` | Control optimista |
| `aceptar_con_puntaje_no_confirmado_devuelve_409` | Confirmación explícita |
| `aceptar_sin_puntaje_sugerido_devuelve_409` | Propuesta sin valoración |
| `aceptar_publicado_devuelve_409` | `resultados_publicados_en` |
| `aceptar_revision_cerrada_devuelve_409` | `calificaciones_revisadas_en` |
| `fallo_en_valoracion_no_cambia_estado_ni_nota` | Atomicidad |
| `fallo_al_marcar_aceptada_no_confirma_nota` | Atomicidad inversa |

### Aislamiento y propiedad

| Prueba | Verifica |
|---|---|
| `docente_b_no_ve_propuesta_de_a` | 404, no 403 |
| `docente_b_no_puede_aceptar_ni_descartar` | 404 |
| `bandeja_solo_devuelve_propuestas_del_examen_propio` | Filtro por docente |

### Estados e historial

| Prueba | Verifica |
|---|---|
| `crear_dos_veces_solo_genera_una_activa` | Índice único + 409 |
| `patch_solo_en_generada` | 409 en otros estados |
| `patch_rechaza_confianza_y_metadatos` | Lista cerrada |
| `regenerar_conserva_historial_y_enlaza_reemplazo` | `reemplazada_por_id` |
| `regenerar_tras_aceptada_no_altera_nota` | Decisión aprobada 1 |
| `propuesta_aceptada_conserva_su_puntaje` | Historial inmutable |

### Worker

| Prueba | Verifica |
|---|---|
| `dos_workers_no_reclaman_la_misma_fila` | `SKIP LOCKED` |
| `lease_vencido_vuelve_a_pendiente` | Recuperación |
| `lease_agotado_pasa_a_error` | Límite de intentos |
| `worker_nunca_produce_aceptada` | Intervención humana |

### Reglas de negocio

| Prueba | Verifica |
|---|---|
| `respuesta_vacia_devuelve_400_sin_fila` | Universo asistible |
| `sin_criterios_devuelve_400_con_motivo` | No inventar criterios |
| `puntaje_sugerido_nunca_supera_el_maximo` | Clamp + `CHECK` |
| `confianza_fuera_de_rango_rechazada` | `CHECK` |

### No regresión

| Prueba | Verifica |
|---|---|
| `valorar_inciso_mantiene_contrato` | Refactor T2-06 |
| `obtener_detalle_no_incluye_ia_star` | Columnas deprecadas sin uso |
| `publicar_resultados_no_muta_propuestas` | Independencia HU-32 |

---

## 6. Criterios de salida de T2

1. Las tres migraciones pendientes están aplicadas y verificadas.
2. `correccion_ia` existe con constraints e índices aprobados.
3. Aceptación atómica probada con casos de fallo.
4. Invariantes I1–I17 cubiertos por pruebas.
5. Ningún endpoint escribe `nota_final` ni publica resultados.
6. Las columnas `ia_*` siguen intactas y sin uso.
7. Frontend y Gemini sin tocar.

---

## 7. Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Aplicar migraciones sobre datos reales | Solo base de desarrollo, con autorización explícita |
| Efecto de visibilidad de 179460 | Revisar el examen 19 antes de aplicar |
| Refactor de `valorarInciso` | Pruebas de regresión antes de T2-09 |
| API de ejecución puntual no disponible en la versión de TypeORM | Validar en el paso 0; si no, pedir waiver para `migration:run` |
| Worker y app compitiendo por locks | Orden fijo examen → rendición → propuesta |
