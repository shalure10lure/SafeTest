# HU-45 · T1 — Diseño de persistencia y contrato de corrección asistida por IA

**Estado:** diseño actualizado a la entidad implementada. La entidad TypeORM
`CorreccionIa` existe en `backend/safetest-api/src/correccionia/entity/correccionia.entity.ts`;
el módulo está registrado en `AppModule`. La migración
`1794700000000-CorreccionIa.ts` existe, pero aún no se ha aplicado. El refactor
de valoración oficial (T2-06) está hecho; los servicios de corrección IA,
controladores y worker siguen pendientes.
**Alcance:** solo documentación. Este documento describe el contrato objetivo y lo
alinea con la entidad ya implementada. No ejecuta SQL ni migraciones.
**Evidencia de esquema:** [`T1-verificacion-esquema.md`](./T1-verificacion-esquema.md)

---

## 1. Resumen de decisiones

| Decisión                              | Elección                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Persistencia                          | Tabla nueva `correccion_ia`, independiente de la calificación oficial                                 |
| Columnas `ia_*` de `respuesta_inciso` | Se **deprecan**. No se escriben ni se leen como fuente de verdad. No se eliminan en T2                |
| Historial                             | Una fila por intento. Nunca se sobrescribe ni se borra                                                |
| Integridad del historial              | Las cuatro FK de `correccion_ia` usan `ON DELETE RESTRICT`. No hay `CASCADE` ni `SET NULL`            |
| Ordinal de propuesta                  | `intento`: secuencia funcional del historial por inciso. Inmutable                                    |
| Reintentos técnicos                   | `reintentos_worker`: contador del worker, separado de `intento`                                       |
| Propuesta activa                      | Máximo una por inciso, garantizada con índice único parcial                                           |
| Estados                               | `pendiente`, `procesando`, `generada`, `modificada`, `aceptada`, `descartada`, `error`, `reemplazada` |
| Generación                            | Asíncrona con worker (`202 Accepted`), igual que HU-44                                                |
| Proveedor de corrección               | Token independiente `AI_CORRECCION_PROVIDER`: `fake` en T2 y Gemini en T3                             |
| Aceptación                            | Explícita por inciso, delega en la valoración oficial existente                                       |
| Universo asistible                    | Inciso `pendiente`, con respuesta no vacía y criterios válidos                                        |
| HU-46                                 | No bloquea. Si no hay criterios, se rechaza la solicitud con motivo explícito                         |
| HU-27                                 | Independiente. La IA no reemplaza reglas ni corrección automática                                     |
| `nota_final`                          | La IA nunca la escribe. Solo la valoración oficial la recalcula                                       |
| `criterio_hash` cambiado              | Detectable. La aceptación se permite mostrando una advertencia; no se bloquea                         |

---

## 2. Persistencia propuesta

### 2.1 DDL de referencia (no ejecutado)

```sql
CREATE TABLE "correccion_ia" (
  "propuesta_id"            SERIAL       NOT NULL,
  "estudiante_id"           integer      NOT NULL,
  "examen_id"               integer      NOT NULL,
  "pregunta_id"             integer      NOT NULL,
  "letra"                   varchar      NOT NULL,
  "docente_id"              integer      NOT NULL,
  "estado"                  varchar(15)  NOT NULL DEFAULT 'pendiente',
  "puntaje_sugerido"        numeric(6,2),
  "puntaje_max_inciso"      numeric(6,2),
  "valoracion"              text,
  "explicacion"             text,
  "errores"                 jsonb,
  "confianza"               numeric(3,2),
  "criterio_fuente"         varchar(30),
  "criterio_hash"           varchar(64),
  "modelo"                  varchar(100),
  "proveedor"               varchar(30),
  "intento"                 smallint     NOT NULL DEFAULT 1,
  "reintentos_worker"       integer      NOT NULL DEFAULT 0,
  "version"                 integer      NOT NULL DEFAULT 1,
  "creada_en"               timestamptz  NOT NULL DEFAULT now(),
  "iniciada_en"             timestamptz,
  "finalizada_en"           timestamptz,
  "actualizada_en"          timestamptz  NOT NULL DEFAULT now(),
  "revisada_en"             timestamptz,
  "revisada_por_docente_id" integer,
  "reemplazada_por_id"      integer,
  "error_codigo"            varchar(40),
  "error_mensaje"           varchar(500),
  "motivo"                  varchar(300),

  CONSTRAINT "PK_correccion_ia" PRIMARY KEY ("propuesta_id"),

  CONSTRAINT "FK_correccion_ia_respuesta"
    FOREIGN KEY ("estudiante_id", "examen_id", "pregunta_id", "letra")
    REFERENCES "respuesta_inciso" ("estudiante_id", "examen_id", "pregunta_id", "letra")
    ON DELETE RESTRICT ON UPDATE NO ACTION,

  CONSTRAINT "FK_correccion_ia_docente"
    FOREIGN KEY ("docente_id") REFERENCES "docente" ("docente_id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,

  CONSTRAINT "FK_correccion_ia_revisor"
    FOREIGN KEY ("revisada_por_docente_id") REFERENCES "docente" ("docente_id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,

  CONSTRAINT "FK_correccion_ia_reemplazo"
    FOREIGN KEY ("reemplazada_por_id") REFERENCES "correccion_ia" ("propuesta_id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,

  CONSTRAINT "CHK_correccion_ia_estado" CHECK ("estado" IN (
    'pendiente', 'procesando', 'generada', 'modificada',
    'aceptada', 'descartada', 'error', 'reemplazada'
  )),
  CONSTRAINT "CHK_correccion_ia_confianza"
    CHECK ("confianza" IS NULL OR ("confianza" >= 0 AND "confianza" <= 1)),
  CONSTRAINT "CHK_correccion_ia_puntaje_no_negativo"
    CHECK ("puntaje_sugerido" IS NULL OR "puntaje_sugerido" >= 0),
  CONSTRAINT "CHK_correccion_ia_puntaje_dentro_max"
    CHECK ("puntaje_sugerido" IS NULL OR "puntaje_max_inciso" IS NULL
           OR "puntaje_sugerido" <= "puntaje_max_inciso"),
  CONSTRAINT "CHK_correccion_ia_intento" CHECK ("intento" >= 1),
  CONSTRAINT "CHK_correccion_ia_reintentos_worker" CHECK ("reintentos_worker" >= 0),
  CONSTRAINT "CHK_correccion_ia_version" CHECK ("version" >= 1)
);
```

> **Implementación:** este DDL es la referencia para la futura migración
> `1794700000000-CorreccionIa.ts`. La entidad `CorreccionIa` ya declara las mismas
> columnas, siete `CHECK`, ocho índices y relaciones. La PK se llama
> `PK_correccion_ia` y `propuesta_id` usa `SERIAL`, como corresponde a la
> estrategia `increment` de `@PrimaryGeneratedColumn({ type: 'int' })`. Las cuatro
> FK son `RESTRICT`; ninguna usa `CASCADE` ni `SET NULL`.

Restricciones `CHECK` implementadas en la entidad:

| Nombre                                  | Regla                                                         |
| --------------------------------------- | ------------------------------------------------------------- |
| `CHK_correccion_ia_estado`              | `estado` pertenece a los ocho estados permitidos              |
| `CHK_correccion_ia_confianza`           | `confianza` es nula o está en `[0, 1]`                        |
| `CHK_correccion_ia_puntaje_no_negativo` | `puntaje_sugerido` es nulo o `>= 0`                           |
| `CHK_correccion_ia_puntaje_dentro_max`  | `puntaje_sugerido <= puntaje_max_inciso` cuando ambos existen |
| `CHK_correccion_ia_intento`             | `intento >= 1`                                                |
| `CHK_correccion_ia_reintentos_worker`   | `reintentos_worker >= 0`                                      |
| `CHK_correccion_ia_version`             | `version >= 1`                                                |

No se declara un `CHECK` sobre la forma de `errores`: la entidad lo tipa como
`jsonb` y la validación de arreglo queda a cargo del DTO y del servicio.

### 2.2 Índices y unicidad

```sql
-- Una sola propuesta activa por inciso.
CREATE UNIQUE INDEX "UX_correccion_ia_activa"
  ON "correccion_ia" ("estudiante_id", "examen_id", "pregunta_id", "letra")
  WHERE "estado" IN ('pendiente', 'procesando', 'generada', 'modificada');

-- Un número de intento por inciso, sin duplicados.
CREATE UNIQUE INDEX "UX_correccion_ia_intento"
  ON "correccion_ia" ("estudiante_id", "examen_id", "pregunta_id", "letra", "intento");

-- Bandeja por examen.
CREATE INDEX "IX_correccion_ia_examen_estado"
  ON "correccion_ia" ("examen_id", "estado");

-- Aislamiento por docente.
CREATE INDEX "IX_correccion_ia_docente_estado"
  ON "correccion_ia" ("docente_id", "estado");

-- Integridad eficiente al comprobar las FK restrictivas de revisión y reemplazo.
CREATE INDEX "IX_correccion_ia_revisada_por_docente"
  ON "correccion_ia" ("revisada_por_docente_id");

CREATE INDEX "IX_correccion_ia_reemplazada_por"
  ON "correccion_ia" ("reemplazada_por_id");

-- Historial de un inciso.
CREATE INDEX "IX_correccion_ia_historial"
  ON "correccion_ia" ("estudiante_id", "examen_id", "pregunta_id", "letra", "creada_en" DESC);

-- Recuperación de leases vencidos.
CREATE INDEX "IX_correccion_ia_lease"
  ON "correccion_ia" ("iniciada_en")
  WHERE "estado" = 'procesando';
```

Notas:

- PostgreSQL no crea índices automáticamente para FKs, por eso
  `IX_correccion_ia_historial` cubre tanto la FK compuesta como las consultas
  de historial.
- El índice único parcial es la garantía de base de datos para "una propuesta
  activa por inciso". Es la última línea de defensa ante dos solicitudes
  concurrentes; el servicio traduce la violación `23505` a `409`.
- Los índices anteriores están declarados en la entidad con `@Index`, incluido
  el `DESC` de `IX_correccion_ia_historial` y los predicados parciales de
  `UX_correccion_ia_activa` e `IX_correccion_ia_lease`.
- La tabla tiene ocho índices: los seis de unicidad, consulta, historial y
  recuperación, más los dos índices simples de FK para revisión y reemplazo.
- `IX_correccion_ia_historial` también cubre la FK compuesta
  `(estudiante_id, examen_id, pregunta_id, letra)`, que no tiene índice propio.

### 2.3 Justificación de columnas

| Columna                                                       | Motivo                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `propuesta_id`                                                | Identidad estable para auditar y enlazar historial                                                                                                                                                                                                                                                   |
| `(estudiante_id, examen_id, pregunta_id, letra)`              | FK compuesta al inciso respondido con `ON DELETE RESTRICT`. Evita duplicar la respuesta y garantiza integridad                                                                                                                                                                                       |
| `docente_id`                                                  | Dueño del examen al momento de la solicitud. **Snapshot** para auditoría                                                                                                                                                                                                                             |
| `estado`                                                      | Máquina de estados explícita                                                                                                                                                                                                                                                                         |
| `puntaje_sugerido`                                            | Único valor que puede llegar a la nota oficial, y solo tras aceptación                                                                                                                                                                                                                               |
| `puntaje_max_inciso`                                          | Snapshot del máximo vigente al generar. Permite auditar el clamp aunque `inciso.puntaje_max` cambie                                                                                                                                                                                                  |
| `valoracion`                                                  | Valoración cualitativa de la IA                                                                                                                                                                                                                                                                      |
| `explicacion`                                                 | Justificación del puntaje                                                                                                                                                                                                                                                                            |
| `errores`                                                     | Errores detectados en la respuesta, en JSONB                                                                                                                                                                                                                                                         |
| `confianza`                                                   | 0.00–1.00, con `CHECK`                                                                                                                                                                                                                                                                               |
| `criterio_fuente`                                             | `solucion_inciso`, `rubrica`, `solucion_referencia`, `enunciado`…                                                                                                                                                                                                                                    |
| `criterio_hash`                                               | SHA-256 del criterio usado. Detecta si la solución cambió después                                                                                                                                                                                                                                    |
| `modelo`, `proveedor`                                         | Trazabilidad técnica de la sugerencia                                                                                                                                                                                                                                                                |
| `intento`                                                     | Ordinal funcional del historial dentro del inciso. Se calcula como `max(intento) + 1` al crear o regenerar. No cambia por reintentos del worker                                                                                                                                                      |
| `reintentos_worker`                                           | Contador técnico del worker. Se incrementa en cada reclamo y gobierna el lease. No forma parte del historial funcional ni del contrato público                                                                                                                                                       |
| `version`                                                     | Control optimista de concurrencia. Se incrementa en cada mutación funcional (`PATCH`, aceptar, descartar, regenerar y al persistir el resultado del worker). El claim y la recuperación por lease no lo incrementan porque no cambian el contenido revisable; la aceptación exige la versión vigente |
| `creada_en`, `iniciada_en`, `finalizada_en`, `actualizada_en` | Ciclo de vida y detección de abandono                                                                                                                                                                                                                                                                |
| `revisada_en`, `revisada_por_docente_id`                      | Auditoría de la intervención humana                                                                                                                                                                                                                                                                  |
| `reemplazada_por_id`                                          | Cadena de reemplazos sin borrar historia                                                                                                                                                                                                                                                             |
| `error_codigo`, `error_mensaje`                               | Fallo técnico observable                                                                                                                                                                                                                                                                             |
| `motivo`                                                      | Razón de descarte o reemplazo                                                                                                                                                                                                                                                                        |

### 2.4 Relación con las columnas `ia_*` de `respuesta_inciso`

**Decisión: se deprecan, no se usan como caché.**

Razones:

1. **Doble fuente de verdad.** Mantener `ia_*` sincronizado con
   `correccion_ia` exige escrituras dobles no atómicas.
2. **Separación de escrituras.** El flujo oficial escribe únicamente
   `puntaje_obtenido`, `estado_correccion` y `retroalimentacion` mediante un
   `update` dirigido. `correccion_ia` es la única fuente de sugerencias; el
   worker nunca toca `respuesta_inciso`.
3. **Sin valor de lectura.** El frontend ya consulta el detalle por inciso;
   añadir los campos desde `correccion_ia` es una junta más, no un problema de
   rendimiento con este volumen.

Reglas para T2:

- `CorreccionIaService` **no** escribe ninguna columna `ia_*`.
- No se eliminan en T2 (evita migración destructiva).
- Se documentan como deprecadas. Su eliminación queda para una historia de
  limpieza posterior, con aprobación explícita.

### 2.5 Información oficial que **no** se duplica

`correccion_ia` **no** contiene:

- `puntaje_obtenido`
- `estado_correccion`
- `retroalimentacion`
- `nota_final`
- `rendicion.estado`
- `calificaciones_revisadas_en` ni `resultados_publicados_en`

La aceptación escribe esos campos únicamente a través del mecanismo oficial.
El flujo de corrección IA tampoco escribe `respuesta_inciso`: la única vía de
escritura oficial es `aplicarValoracionOficial(manager, …)`, ejecutada dentro de
la transacción de aceptación.

### 2.6 Protección del historial

La entidad implementada declara cuatro relaciones `ManyToOne` con
`onDelete: 'RESTRICT'`:

| FK                           | Referencia         | Efecto                                                                        |
| ---------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `FK_correccion_ia_respuesta` | `respuesta_inciso` | No se puede borrar una respuesta que tenga propuestas                         |
| `FK_correccion_ia_docente`   | `docente`          | No se puede borrar el docente autor de la solicitud mientras exista historial |
| `FK_correccion_ia_revisor`   | `docente`          | No se puede borrar el docente que revisó mientras exista historial            |
| `FK_correccion_ia_reemplazo` | `correccion_ia`    | No se puede borrar una propuesta mientras otra la referencie como reemplazo   |

Consecuencias:

- No hay borrado en cascada ni anulación automática de referencias.
- El historial solo se conserva; para "retirar" una propuesta se cambia su
  estado, nunca se elimina la fila.
- `ON DELETE RESTRICT` protege también las cadenas de reemplazo: la propuesta
  apuntada por `reemplazada_por_id` no puede borrarse mientras exista la fila
  que la referencia.
- La aplicación no ejecuta `DELETE` sobre `correccion_ia`.

### 2.7 Etapas de validación pura

Las validaciones se separan para que una solicitud pueda crear una fila
`pendiente` antes de que exista una salida del proveedor:

| Etapa                                      | Función                        | Validaciones                                                                                                                    |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Solicitud, antes de insertar `pendiente`   | `validarSolicitudCorreccionIa` | Inciso pendiente de corrección oficial, respuesta no vacía según tipo, criterios suficientes y puntaje máximo finito y positivo |
| Resultado IA, antes de persistir la salida | `validarResultadoCorreccionIa` | Puntaje máximo finito y positivo, puntaje sugerido entre 0 y el máximo, confianza entre 0 y 1 o nula                            |

La solicitud no requiere `puntaje_sugerido` ni `confianza`; esos campos siguen
siendo nulos mientras la propuesta está pendiente. Los códigos de error de
validación permanecen estables. Ambas etapas reutilizan la misma regla para
validar el puntaje máximo; `PUNTAJE_MAX_INVALIDO` se devuelve tanto al solicitar
una propuesta como al validar el resultado del proveedor.

---

## 3. Estados y transiciones

### 3.1 Significado

| Estado        | Significado                                           | ¿Activa? | ¿Terminal? |
| ------------- | ----------------------------------------------------- | -------- | ---------- |
| `pendiente`   | Solicitud creada, en cola                             | Sí       | No         |
| `procesando`  | Reclamada por un worker                               | Sí       | No         |
| `generada`    | Propuesta lista, sin revisar                          | Sí       | No         |
| `modificada`  | El docente editó los valores; aún no aplicada         | Sí       | No         |
| `aceptada`    | Aplicada a la nota oficial con intervención explícita | No       | Sí         |
| `descartada`  | Rechazada por el docente                              | No       | Sí         |
| `error`       | Fallo técnico o criterios desaparecidos               | No       | Sí*        |
| `reemplazada` | Superada por una propuesta más nueva                  | No       | Sí         |

\* `error` es terminal para ese intento, pero puede reintentarse creando un
nuevo intento.

### 3.2 Transiciones válidas

```
                    ┌─────────────┐
      crear ───────►│  pendiente  │
                    └──────┬──────┘
                           │ claim atómico (worker)
                           ▼
                    ┌─────────────┐
                    │ procesando  │
                    └──┬───────┬──┘
             éxito     │       │  fallo definitivo
                       ▼       ▼
                ┌──────────┐ ┌───────┐
                │ generada │ │ error │
                └──┬───┬───┘ └───────┘
      PATCH        │   │      terminal: el reintento
                   ▼   │      crea una fila nueva
            ┌────────────┐
            │ modificada │
            └──┬───┬─────┘
   aceptar     │   │  descartar
               ▼   ▼
        ┌──────────┐ ┌────────────┐
        │ aceptada │ │ descartada │
        └──────────┘ └────────────┘

  Cualquier estado activo ──regenerar──► reemplazada
  Estado terminal ──reintento──► nueva fila pendiente (intento = max + 1)
```

| Desde                                            | Hacia         | Actor       | Condición                                                                                                      |
| ------------------------------------------------ | ------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| —                                                | `pendiente`   | Docente     | Inciso pendiente, respuesta no vacía, criterios válidos, sin propuesta activa, examen editable                 |
| `pendiente`                                      | `procesando`  | Worker      | Reclamo atómico con `FOR UPDATE SKIP LOCKED`                                                                   |
| `pendiente`                                      | `descartada`  | Docente     | Cancelación antes de procesar                                                                                  |
| `pendiente`                                      | `reemplazada` | Sistema     | Regeneración                                                                                                   |
| `pendiente`                                      | `error`       | Worker      | Criterios ya no disponibles al procesar                                                                        |
| `procesando`                                     | `generada`    | Worker      | Respuesta válida y examen aún editable                                                                         |
| `procesando`                                     | `error`       | Worker      | Fallo no reintentable o `reintentos_worker` máximo                                                             |
| `procesando`                                     | `pendiente`   | Recuperador | Lease vencido y `reintentos_worker < max`                                                                      |
| `procesando`                                     | `error`       | Recuperador | Lease vencido y `reintentos_worker >= max` (`TIEMPO_AGOTADO`)                                                  |
| `generada`                                       | `modificada`  | Docente     | `PATCH` con al menos un campo                                                                                  |
| `generada`                                       | `aceptada`    | Docente     | Aceptación válida                                                                                              |
| `generada`                                       | `descartada`  | Docente     | Descarte                                                                                                       |
| `generada`                                       | `reemplazada` | Sistema     | Regeneración                                                                                                   |
| `modificada`                                     | `aceptada`    | Docente     | Aceptación válida                                                                                              |
| `modificada`                                     | `descartada`  | Docente     | Descarte                                                                                                       |
| `modificada`                                     | `reemplazada` | Sistema     | Regeneración                                                                                                   |
| `error`                                          | —             | Docente     | Sin transición: el reintento inserta una fila nueva con `intento = max(intento) + 1` y `reintentos_worker = 0` |
| `aceptada`, `descartada`, `error`, `reemplazada` | —             | —           | Estados terminales inmutables. Regenerar crea otra fila y no modifica la terminal                              |

> `reemplazada_por_id` solo enlaza una propuesta **activa** que fue superada. Un
> estado terminal (`aceptada`, `descartada`, `error`, `reemplazada`) nunca se
> reescribe para enlazar un reemplazo.

### 3.3 Regeneración

- Permitida cuando **no existe propuesta activa** o cuando la propuesta activa
  **no está `procesando`**, y el examen sigue editable.
- Crea una fila nueva con `intento = max(intento) + 1` y
  `reintentos_worker = 0`.
- Si existe una propuesta activa, la marca `reemplazada` y enlaza
  `reemplazada_por_id` con la fila nueva, de forma atómica.
- Nunca modifica `aceptada`, `descartada`, `error` ni `reemplazada`.
- Tras `aceptada` se permite regenerar: la nota oficial ya está fijada y una
  nueva sugerencia no la altera. Queda como intento nuevo en el historial sin
  tocar la propuesta aceptada.
  **Decisión aprobada:** se permite; la propuesta aceptada conserva su estado y
  su puntaje original.

### 3.4 Recuperación de procesos abandonados

Parámetros propuestos:

| Variable                       | Default | Uso                                                     |
| ------------------------------ | ------- | ------------------------------------------------------- |
| `IA_CORRECCION_LEASE_SEGUNDOS` | `120`   | Antigüedad máxima de `procesando`                       |
| `IA_CORRECCION_MAX_INTENTOS`  | `3`     | Reclamos técnicos permitidos por propuesta (`reintentos_worker`) |

Barrido (al arrancar el worker y periódicamente):

```sql
-- Lease vencido con reintentos disponibles → vuelve a la cola.
-- No se reinicia reintentos_worker para evitar bucles infinitos.
UPDATE correccion_ia
   SET estado = 'pendiente', iniciada_en = NULL, actualizada_en = now()
 WHERE estado = 'procesando'
   AND iniciada_en < now() - ($1 || ' seconds')::interval
   AND reintentos_worker < $2;

-- Lease vencido sin reintentos → error terminal
UPDATE correccion_ia
   SET estado = 'error',
       error_codigo = 'TIEMPO_AGOTADO',
       error_mensaje = 'El worker no finalizó dentro del lease',
       finalizada_en = now(),
       actualizada_en = now()
 WHERE estado = 'procesando'
   AND iniciada_en < now() - ($1 || ' seconds')::interval
   AND reintentos_worker >= $2;
```

### 3.5 Exclusión mutua entre workers

Reclamo en una sola sentencia:

```sql
UPDATE correccion_ia
   SET estado = 'procesando',
       iniciada_en = now(),
       actualizada_en = now(),
       reintentos_worker = reintentos_worker + 1
 WHERE propuesta_id = (
   SELECT propuesta_id
     FROM correccion_ia
    WHERE estado = 'pendiente'
    ORDER BY creada_en
    FOR UPDATE SKIP LOCKED
    LIMIT 1
 )
 RETURNING *;
```

Garantías:

1. `FOR UPDATE SKIP LOCKED` impide que dos workers tomen la misma fila.
2. El `WHERE estado = 'pendiente'` hace que el segundo `UPDATE` afecte 0 filas.
3. El índice único parcial impide, además, dos propuestas activas del mismo
   inciso.
4. El reclamo solo incrementa `reintentos_worker`; `intento` permanece
   inmutable durante toda la vida de la fila.
5. El reclamo no incrementa `version`: la versión cambia cuando el worker
   persiste el resultado o cuando el docente modifica la propuesta.

### 3.6 Historial

- No se ejecuta `DELETE` sobre `correccion_ia` desde la aplicación.
- Las cuatro FK con `RESTRICT` impiden que un borrado externo arrastre el
  historial.
- Los estados terminales no se modifican. La única escritura asociada es
  `reemplazada_por_id`, que se fija en la misma transacción en que una propuesta
  activa pasa a `reemplazada`.
- Un error se reintenta insertando una fila nueva; la fila `error` permanece
  intacta.
- `intento` es inmutable. `reintentos_worker` puede cambiar por reclamos y
  barridos del worker, pero no altera el ordinal del historial.
- La API de historial devuelve todas las filas del inciso, ordenadas por
  `creada_en DESC`.
- `aceptada` conserva el `puntaje_sugerido` original aunque la nota oficial se
  haya vuelto a editar después.

### 3.7 Publicación del examen con propuestas pendientes

Regla: **la publicación no muta propuestas**. Se congelan.

1. Todo endpoint mutante valida primero `asegurarEdicionPermitida`
   (`calificaciones_revisadas_en` y `resultados_publicados_en` nulos). Si no,
   responde `409 REVISION_CERRADA` o `409 RESULTADOS_PUBLICADOS`.
2. El worker vuelve a validar antes de persistir el resultado. Si el examen se
   publicó mientras procesaba, marca `error` con
   `error_codigo = 'EXAMEN_PUBLICADO'`. No reintenta.
3. Las propuestas `pendiente` o `generada` quedan como historia inmutable. No
   se marcan `descartada` de forma masiva: eso falsearía la autoría de la
   decisión.
4. No se acopla HU-32 a HU-45: la publicación no importa el módulo de
   corrección IA.

---

## 4. Contrato de API

### 4.1 Convenciones

- Prefijo existente: `examenes/:examenId/calificaciones`, con
  `JwtAuthGuard` y `DocenteGuard`.
- Sin prefijo global adicional (`main.ts` no define `setGlobalPrefix`).
- Validación global con `ValidationPipe({ whitelist: true, transform: true })`,
  por lo que los DTO con `class-validator` funcionan.
- Propiedad: se resuelve el examen y se exige
  `examen.docente_id === request.user.id`. Si no coincide → **404**, nunca 403,
  para no filtrar existencia.
- Ratas propuestas: la colección vive en un controlador anidado y las
  operaciones sobre una propuesta en otro controlador por `propuestaId`.

### 4.2 Endpoints

#### 4.2.1 Solicitar propuesta

```
POST examenes/:examenId/calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia
```

- **Cuerpo:** ninguno.
- **Respuesta 202:**
  ```json
  { "propuesta_id": 42, "estado": "pendiente", "intento": 1 }
  ```
- **Errores:**
  | Código                       | HTTP | Cuándo                                                  |
  | ---------------------------- | ---- | ------------------------------------------------------- |
  | `RESPUESTA_VACIA`            | 400  | `respuesta_texto` vacío o sin opciones marcadas         |
  | `SIN_CRITERIOS`              | 400  | No hay solución ni rúbrica utilizable; incluye `motivo` |
  | `PUNTAJE_MAX_INVALIDO`       | 400  | `inciso.puntaje_max` no finito o ≤ 0                    |
  | `EXAMEN_NO_ENCONTRADO`       | 404  | Examen ajeno o inexistente                              |
  | `RENDICION_NO_ENCONTRADA`    | 404  | Sin rendición del estudiante                            |
  | `INCISO_NO_ENCONTRADO`       | 404  | El inciso no pertenece a la pregunta asignada           |
  | `PROPUESTA_ACTIVA_EXISTENTE` | 409  | Ya hay `pendiente/procesando/generada/modificada`       |
  | `INCISO_NO_PENDIENTE`        | 409  | Ya corregido de forma oficial                           |
  | `RENDICION_NO_ENVIADA`       | 409  | `rendicion.estado` no es `enviada` ni `corregida`       |
  | `REVISION_CERRADA`           | 409  | `calificaciones_revisadas_en` no nulo                   |
  | `RESULTADOS_PUBLICADOS`      | 409  | `resultados_publicados_en` no nulo                      |

#### 4.2.2 Consultar historial del inciso

```
GET examenes/:examenId/calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia
```

- **Query:** `estado?` (uno de los ocho), `limite?` (1–100, default 50).
- **Respuesta 200:** `CorreccionIaDto[]`, orden `creada_en DESC`.
- **Errores:** 404 de propiedad; 400 si `estado` o `limite` son inválidos.

#### 4.2.3 Detalle de propuesta

```
GET correcciones-ia/:propuestaId
```

- **Respuesta 200:** `CorreccionIaDto`.
- **Errores:** `404 PROPUESTA_NO_ENCONTRADA` (incluye propuestas de otro
  docente).

#### 4.2.4 Modificar propuesta

```
PATCH correcciones-ia/:propuestaId
```

- **Cuerpo (`ActualizarCorreccionIaDto`):**
  ```json
  {
    "puntaje": 3.5,
    "valoracion": "Identifica el modelo, omite una restricción.",
    "explicacion": "Falta la restricción de no negatividad.",
    "errores": [
      { "tipo": "restriccion_omitida", "descripcion": "No declara x >= 0" }
    ]
  }
  ```
  Todos los campos son opcionales, pero se exige al menos uno.
- **Campos editables (lista cerrada):** `puntaje`, `valoracion`, `explicacion`,
  `errores`.
- **Campos NO editables:** `confianza`, `modelo`, `proveedor`,
  `criterio_fuente`, `criterio_hash`, `error_codigo`, `error_mensaje`,
  `docente_id`, `intento`, `version`, marcas de tiempo y estado. El DTO los
  rechaza por `whitelist`; si llegan, se responde 400.
- **Respuesta 200:** `CorreccionIaDto` con `estado = 'modificada'`.
- **Errores:**
  | Código                                       | HTTP | Cuándo                                                        |
  | -------------------------------------------- | ---- | ------------------------------------------------------------- |
  | `SIN_CAMBIOS`                                | 400  | Cuerpo vacío o solo campos nulos                              |
  | `PUNTAJE_FUERA_DE_RANGO`                     | 400  | Negativo, más de 2 decimales o mayor que `puntaje_max_inciso` |
  | `CONFIANZA_FUERA_DE_RANGO`                   | 400  | Fuera de 0–1, si se permite editarla (no por defecto)         |
  | `PROPUESTA_NO_ENCONTRADA`                    | 404  | Inexistente o de otro docente                                 |
  | `ESTADO_NO_PERMITE_OPERACION`                | 409  | Estado distinto de `generada`                                 |
  | `REVISION_CERRADA` / `RESULTADOS_PUBLICADOS` | 409  | Examen cerrado                                                |

> Decisión: solo se modifica en `generada`. Una propuesta ya `modificada` debe
> aceptarse o descartarse; así el estado conserva un significado claro.

#### 4.2.5 Aceptar propuesta

```
POST correcciones-ia/:propuestaId/aceptar
```

- **Cuerpo (`AceptarCorreccionIaDto`):**
  ```json
  {
    "version": 4,
    "puntaje_confirmado": "3.50",
    "retroalimentacion": "Correcto, pero justifica la restricción."
  }
  ```
  - `version` (**obligatorio**): versión leída por el cliente. Si no coincide
    con la vigente → `409 PROPUESTA_DESACTUALIZADA`.
  - `puntaje_confirmado` (**obligatorio**): copia exacta del
    `puntaje_sugerido` que el docente vio y confirma. Se compara numéricamente
    con dos decimales. Si difiere → `409 PUNTAJE_CONFIRMADO_NO_COINCIDE`.
  - `retroalimentacion` (opcional): si se omite, la retroalimentación oficial
    existente no se altera.
  - **No se acepta un puntaje nuevo.** Para aplicar otro valor, primero se usa
    `PATCH` (lo que cambia `version`) y luego se acepta.
  - **`criterio_hash` desactualizado:** si el criterio usado al generar ya no
    coincide con el vigente, la aceptación **no se bloquea**. Se devuelve una
    advertencia `CRITERIO_ACTUALIZADO` en la respuesta y el docente decide.
- **Respuesta 200:**
  ```json
  {
    "propuesta": { "propuesta_id": 42, "estado": "aceptada" },
    "calificacion": {
      "puntaje_obtenido": "3.50",
      "estado_correccion": "manual",
      "nota_final": "7.20",
      "estado_rendicion": "corregida",
      "pendientes_revision": 0
    },
    "advertencias": [
      {
        "codigo": "CRITERIO_ACTUALIZADO",
        "mensaje": "El criterio del inciso cambió después de generar la propuesta."
      }
    ]
  }
  ```
- **Errores:**

  | Código                                       | HTTP | Cuándo                                           |
  | -------------------------------------------- | ---- | ------------------------------------------------ |
  | `SIN_PUNTAJE_SUGERIDO`                       | 409  | La propuesta no tiene puntaje                    |
  | `PROPUESTA_DESACTUALIZADA`                   | 409  | `version` no coincide con la vigente             |
  | `PUNTAJE_CONFIRMADO_NO_COINCIDE`             | 409  | `puntaje_confirmado` difiere del sugerido        |
  | `ESTADO_NO_PERMITE_OPERACION`                | 409  | Estado distinto de `generada` o `modificada`     |
  | `REVISION_CERRADA` / `RESULTADOS_PUBLICADOS` | 409  | Examen cerrado                                   |
  | `PUNTAJE_FUERA_DE_RANGO`                     | 400  | Validación oficial de `aplicarValoracionOficial` |
  | `PROPUESTA_NO_ENCONTRADA`                    | 404  | Inexistente o de otro docente                    |

- **Implementación obligatoria:** la aceptación **no** escribe la nota. Llama a
  la valoración oficial dentro de la misma transacción (ver §5.3).

#### 4.2.6 Descartar propuesta

```
POST correcciones-ia/:propuestaId/descartar
```

- **Cuerpo (`DescartarCorreccionIaDto`):** `{ "motivo": "..." }` opcional,
  máx. 300.
- **Respuesta 200:** `{ "propuesta_id": 42, "estado": "descartada" }`.
- **Errores:** `404`; `409 ESTADO_NO_PERMITE_OPERACION` si ya es terminal;
  `409` de examen cerrado.

#### 4.2.7 Regenerar propuesta

```
POST examenes/:examenId/calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia/regenerar
```

- **Cuerpo:** ninguno.
- **Respuesta 202:** `{ "propuesta_id": 57, "estado": "pendiente", "intento": 2 }`.
- **Errores:** los mismos de 4.2.1, salvo que **sí** se permite cuando existe
  una propuesta activa: se marca `reemplazada` y se crea la nueva, de forma
  atómica. Si el estado activo es `procesando` → `409 PROPUESTA_EN_PROCESO`.

#### 4.2.8 Bandeja de revisión por examen

```
GET examenes/:examenId/correcciones-ia
```

- **Query (`ListarCorreccionesIaDto`):**
  - `estado?` (uno de los ocho)
  - `estudiante_id?` (entero)
  - `pregunta_id?` (entero)
  - `solo_pendientes_revision?` (boolean, default `false`): deja únicamente
    propuestas en `generada` o `modificada`
  - `limite?` (1–200, default 100)
  - `desplazamiento?` (≥ 0, default 0)
- **Respuesta 200:**
  ```json
  {
    "total": 12,
    "propuestas": [{ "propuesta_id": 42, "estado": "generada", "...": "..." }]
  }
  ```
- **Errores:** 404 de propiedad; 400 por filtros inválidos.
- **Ruta separada a propósito:** `examenes/:examenId/calificaciones/:estudianteId`
  ya existe y `ia` colisionaría con `:estudianteId`. Por eso la bandeja vive en
  `examenes/:examenId/correcciones-ia`.
- El detalle por inciso se obtiene con `GET correcciones-ia/:propuestaId` y el
  contexto clínico con el detalle de revisión ya existente.

### 4.3 DTO de respuesta

```ts
interface CorreccionIaDto {
  propuesta_id: number;
  examen_id: number;
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  estado: EstadoCorreccionIa;
  puntaje_sugerido: string | null; // numeric llega como string en TypeORM
  puntaje_max_inciso: string | null;
  valoracion: string | null;
  explicacion: string | null;
  errores: ErrorCorreccionIa[] | null;
  confianza: string | null;
  criterio_fuente: string | null;
  criterio_hash: string | null;
  modelo: string | null;
  proveedor: string | null;
  intento: number;
  version: number;
  creada_en: string;
  iniciada_en: string | null;
  finalizada_en: string | null;
  actualizada_en: string;
  revisada_en: string | null;
  revisada_por_docente_id: number | null;
  reemplazada_por_id: number | null;
  error_codigo: string | null;
  error_mensaje: string | null;
  motivo: string | null;
}

interface ErrorCorreccionIa {
  tipo: string;
  descripcion: string;
  ubicacion?: string;
}
```

No se incluye `respuesta_texto` en el DTO: ya lo entrega el detalle de
revisión existente.

`reintentos_worker` es un contador técnico interno del worker. No forma parte
del contrato público ni se puede editar por `PATCH`; si se necesita para
diagnóstico, se expone en un endpoint administrativo separado. El DTO mantiene
`intento`, que es el ordinal funcional del historial.

---

## 5. Invariantes y plan de pruebas

### 5.1 Tabla de invariantes

| #   | Invariante                                       | Cómo se garantiza                                                                         | Prueba futura                                     |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| I1  | Generar no modifica la nota oficial              | El servicio solo inserta en `correccion_ia`; no importa repositorios de escritura oficial | `generar_propuesta_no_altera_nota_ni_puntaje`     |
| I2  | Modificar no modifica la nota oficial            | `PATCH` solo actualiza `correccion_ia`                                                    | `modificar_propuesta_no_altera_nota_ni_puntaje`   |
| I3  | Descartar no modifica la nota oficial            | `POST /descartar` solo cambia `estado`                                                    | `descartar_propuesta_no_altera_nota_ni_puntaje`   |
| I4  | Aceptar exige intervención explícita             | No existe transición automática a `aceptada`; el worker solo produce `generada` o `error` | `worker_nunca_produce_estado_aceptada`            |
| I5  | Aceptar pasa por la validación oficial           | Delega en `aplicarValoracionOficial(manager, …)`, ya extraído de `valorarInciso` en T2-06 | `aceptar_rechaza_puntaje_mayor_al_maximo`         |
| I6  | No se acepta si el examen está publicado         | `asegurarEdicionPermitida` antes de cualquier mutación                                    | `aceptar_publicado_devuelve_409`                  |
| I7  | Aislamiento entre docentes                       | Toda consulta resuelve el examen y compara `docente_id`; 404 si no coincide               | `docente_b_no_ve_ni_modifica_propuesta_de_a`      |
| I8  | El historial se conserva                         | Sin `DELETE`; FKs `RESTRICT`; regenerar inserta fila nueva y enlaza la anterior           | `regenerar_conserva_historial_y_enlaza_reemplazo` |
| I9  | Una sola propuesta activa                        | Índice único parcial + transacción                                                        | `dos_solicitudes_concurrentes_solo_crean_una`     |
| I10 | Un solo worker por solicitud                     | `FOR UPDATE SKIP LOCKED` + `WHERE estado='pendiente'`                                     | `dos_workers_no_reclaman_la_misma_fila`           |
| I11 | Se recuperan trabajos abandonados                | Barrido por lease                                                                         | `lease_vencido_vuelve_a_pendiente`                |
| I12 | Sin respuesta no hay propuesta                   | Validación previa al insert                                                               | `respuesta_vacia_devuelve_400_sin_fila`           |
| I13 | Sin criterios no hay propuesta                   | Validación de solución/rúbrica                                                            | `sin_criterios_devuelve_400_con_motivo`           |
| I14 | Confianza y puntaje respetan rango               | `CHECK` en BD + validación en servicio                                                    | `confianza_y_puntaje_fuera_de_rango_rechazados`   |
| I15 | El estado oficial no se contamina                | `correccion_ia` no tiene columnas oficiales                                               | Revisión de esquema en CI                         |
| I16 | No se acepta una propuesta obsoleta              | `version` obligatoria + `UPDATE … WHERE version = :version`                               | `aceptar_con_version_antigua_devuelve_409`        |
| I17 | La aceptación exige confirmar el puntaje vigente | `puntaje_confirmado` comparable con `puntaje_sugerido`                                    | `aceptar_con_puntaje_no_confirmado_devuelve_409`  |
| I18 | `intento` es el ordinal funcional e inmutable    | Se fija al crear/regenerar con `max + 1`; el worker solo toca `reintentos_worker`         | `reintentos_no_alteran_intento`                   |
| I19 | El historial no se puede borrar en cascada       | Cuatro FK `ON DELETE RESTRICT` en la entidad y en la migración                            | `borrar_respuesta_con_historial_falla`            |
| I20 | Un criterio actualizado no impide aceptar        | Comparación de `criterio_hash`; se devuelve advertencia, no 409                           | `aceptar_con_criterio_hash_distinto_advierte`     |

### 5.2 Pruebas de no-regresión

- `valorarInciso` sigue funcionando igual tras extraer
  `aplicarValoracionOficial`.
- HU-31: confirmar calificaciones no altera propuestas.
- HU-32: publicar resultados no altera propuestas.
- El detalle de revisión sigue devolviendo el mismo contrato, con los campos
  `ia_*` **sin usar**.

### 5.3 Punto crítico de implementación: transacción única

`valorarInciso` abre su propia transacción con `dataSource.transaction`.
Llamarlo desde otra transacción **no** la anida: usa otra conexión, por lo que
la aceptación y el cambio de estado de la propuesta no serían atómicos.

Implementado en T2-06:

1. `aplicarValoracionOficial(manager, examenId, estudianteId, preguntaId, letra, docenteId, datos)`
   contiene la validación y la escritura oficial. **No** abre transacción y
   **no** llama a `dataSource.transaction`.
2. `valorarInciso` es un envoltorio que abre `dataSource.transaction` y delega
   en `aplicarValoracionOficial`.
3. `aplicarValoracionOficial` vuelve a verificar propiedad, estado del examen y
   edición permitida usando el `manager` recibido, por lo que la aceptación
   hereda las mismas garantías sin duplicar reglas.
4. La aceptación usa **la misma** transacción:
   ```ts
   dataSource.transaction(async (manager) => {
     // Bloquea examen y rendición dentro de la misma transacción.
     const resultado = await aplicarValoracionOficial(manager, ...);

     // La propuesta se bloquea después de examen y rendición.
     const propuesta = await manager.findOne(CorreccionIa, {
       where: { propuesta_id: propuestaId, examen_id: examenId },
       lock: { mode: 'pessimistic_write' },
     });
     // ... validar estado, version y puntaje_confirmado ...
     // ... marcar la propuesta como aceptada ...

     return { propuesta, calificacion: resultado };
   });
   ```
5. Orden de bloqueo, para evitar interbloqueos:
   **examen → rendición → propuesta**.

Si la validación de la propuesta falla después de aplicar la valoración, toda
la transacción se revierte: la nota oficial no queda confirmada y la propuesta
conserva su estado. Si la valoración falla, la propuesta no queda `aceptada`.
Todo o nada.

### 5.4 Regla arquitectónica antirregresión

`CorreccionIaService` puede **leer** `RespuestaInciso`, pero tiene prohibido
llamar `save()` o `update()` sobre ella. La única vía de escritura oficial es
`aplicarValoracionOficial`. Se verifica con una prueba que espía el
repositorio.

---

## 6. Riesgos residuales

| Riesgo                                     | Estado tras el diseño | Nota                                                              |
| ------------------------------------------ | --------------------- | ----------------------------------------------------------------- |
| Base desactualizada                        | **Resuelto**          | T2-01 a T2-03 aplicadas y verificadas; falta solo `correccion_ia` |
| Doble fuente de verdad `ia_*`              | Mitigado              | Se deprecan, no se escriben                                       |
| Contención de escritura en la fila oficial | **Resuelto**          | La propuesta vive en otra tabla                                   |
| Borrado accidental del historial           | **Resuelto**          | Las cuatro FK usan `ON DELETE RESTRICT`                           |
| Confusión entre ordinal y reintentos       | **Resuelto**          | `intento` funcional inmutable; `reintentos_worker` técnico        |
| Coste/abuso de IA                          | Mitigado              | Una propuesta activa por inciso                                   |
| Prompt injection                           | Pendiente de T3       | Corresponde al proveedor                                          |
| Acoplamiento del proveedor de corrección   | Mitigado              | Token separado `AI_CORRECCION_PROVIDER`                           |
| Auditoría de modelo/proveedor              | Mitigado              | Columnas dedicadas                                                |
| Historial ilimitado                        | Aceptado              | Volumen bajo; se puede archivar después                           |
| `criterio_hash` desactualizado             | Mitigado              | Se permite aceptar con advertencia `CRITERIO_ACTUALIZADO`         |

---

## 7. Recomendación para T2

### Paso 0: sincronizar el esquema — completado

Aplicadas y verificadas en T2-01 a T2-03, con aprobación explícita y sobre base
de desarrollo:

1. `1794400000000-ModelosFormulaRendicion`
2. `1794500000000-RevisionCalificaciones`
3. `1794600000000-SepararPublicacionRespuestas`

Ver [`T2-03-ejecucion.md`](./T2-03-ejecucion.md). Queda pendiente la migración
de `correccion_ia`.

### Alcance propuesto de T2

1. Migración `correccion_ia` (solo tablas, índices y constraints).
2. Entidad TypeORM y registro del módulo en `app.module.ts`. La entidad ya existe.
3. Refactor de `RevisionCalificacionesService`:
   `aplicarValoracionOficial(manager, …)`. **Completado en T2-06.**
4. `CorreccionIaService`: crear, listar, detalle, modificar, aceptar,
   descartar, regenerar, reclamar, recuperar.
5. Controladores y DTO con `class-validator`.
6. Worker con `AI_CORRECCION_PROVIDER` y proveedor `fake` para pruebas; Gemini
   queda para T3.
7. Pruebas unitarias y de integración de §5.

### Fuera de T2

- Prompt engineering y proveedor Gemini real (T3).
- Frontend (T4).
- Eliminación de las columnas `ia_*`.
- Aceptación masiva.
- Bandeja global de propuestas por examen.

---

## 8. Archivos que se crearían o modificarían

### Nuevos (T2)

```
backend/safetest-api/src/migrations/1794700000000-CorreccionIa.ts
backend/safetest-api/src/correccionia/entity/correccionia.entity.ts   (implementado)
backend/safetest-api/src/correccionia/correccionia.module.ts
backend/safetest-api/src/correccionia/correccionia.service.ts
backend/safetest-api/src/correccionia/correccionia.controller.ts
backend/safetest-api/src/correccionia/correccionia-propuesta.controller.ts
backend/safetest-api/src/correccionia/correccionia.worker.ts
backend/safetest-api/src/correccionia/correccionia.types.ts
backend/safetest-api/src/correccionia/correccionia.errores.ts
backend/safetest-api/src/correccionia/correccionia.validacion.ts
backend/safetest-api/src/correccionia/dto/crear-correccion-ia.dto.ts
backend/safetest-api/src/correccionia/dto/listar-correcciones-ia.dto.ts
backend/safetest-api/src/correccionia/dto/actualizar-correccion-ia.dto.ts
backend/safetest-api/src/correccionia/dto/aceptar-correccion-ia.dto.ts
backend/safetest-api/src/correccionia/dto/descartar-correccion-ia.dto.ts
```

La entidad se implementó en `src/correccionia/`. El resto de archivos de T2
seguirá esa misma carpeta para no mezclar la propuesta con el módulo `ia`
genérico. Más sus `*.spec.ts`.

### Modificados (T2)

```
backend/safetest-api/src/app.module.ts
backend/safetest-api/src/examen/revision-calificaciones.service.ts   (T2-06)
backend/safetest-api/src/examen/revision-calificaciones.service.spec.ts (T2-06)
backend/safetest-api/src/examen/examen.module.ts
backend/safetest-api/src/ia/ai.types.ts
backend/safetest-api/src/ia/providers/ai.provider.ts
backend/safetest-api/src/ia/providers/fake-ai.provider.ts
```

El proveedor Gemini real no se toca en T2: se implementará detrás del token
`AI_CORRECCION_PROVIDER` en T3.

### T3 / T4

- T3: `AI_CORRECCION_PROVIDER` con Gemini y parseo estructurado.
- T4: `frontend/features/evaluaciones/**` (servicio, hook, tipos y
  componente de sugerencia).

---

## 9. Decisiones aprobadas

1. **Regenerar tras `aceptada`:** permitido. Se crea un registro nuevo, se
   conserva el historial y no se altera la valoración oficial anterior.
2. **Bandeja:** por examen (`GET examenes/:examenId/correcciones-ia`), con
   acceso al detalle por inciso.
3. **`PATCH`:** solo `puntaje`, `valoracion`, `explicacion` y `errores`. No se
   editan `confianza`, metadatos de IA ni errores técnicos.
4. **Aceptación:** exige `version` vigente y `puntaje_confirmado` igual al
   sugerido. Cualquier desajuste devuelve 409.
5. **FK del historial:** las cuatro FK usan `ON DELETE RESTRICT`. No se usa
   `CASCADE` ni `SET NULL` para no destruir ni desreferenciar auditoría.
6. **Reintentos:** `intento` es el ordinal funcional del historial y no cambia;
   `reintentos_worker` es el contador técnico del worker y es independiente.
7. **Proveedor de corrección:** token separado `AI_CORRECCION_PROVIDER`. En T2
   se usa `FakeAiProvider`; Gemini se implementa en T3 sin tocar el servicio.
8. **`criterio_hash` cambiado:** no bloquea la aceptación. Se devuelve la
   advertencia `CRITERIO_ACTUALIZADO` y se registra el criterio vigente.
