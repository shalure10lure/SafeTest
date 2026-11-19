# HU-45 · T2-03 — Revisión previa y decisión de backfill

**Migración revisada:** `SepararPublicacionRespuestas1794600000000` (`1794600000000`)
**Estado:** pendiente. **No ejecutada.**
**Escrituras realizadas:** ninguna.
**Código de producción modificado:** ninguno.

---

## 0. Resumen ejecutivo

1. La migración añade `examen.respuestas_publicadas_en` y copia en ella
   `resultados_publicados_en` donde este último no sea nulo.
2. En la base actual eso afecta **exactamente a 1 fila**: el examen 19,
   con fecha `2026-11-10 10:45:54.071397+00`.
3. La evidencia histórica indica que esa fecha **no es una publicación de
   resultados oficiales**, sino la autorización de respuestas del endpoint
   anterior `POST /examenes/:id/respuestas/publicar`, que escribía en
   `resultados_publicados_en` porque no existía otra columna.
4. Las dos alternativas pedidas (A: no backfill; B: backfill original)
   **dejan el examen 19 bloqueado**, porque `resultados_publicados_en` sigue
   no nulo y el código nuevo lo interpreta como "resultados ya publicados".
5. Con ese flag puesto, el docente **no puede editar, confirmar ni publicar**
   el examen 19. Es un bloqueo permanente, no un simple detalle de visibilidad.
6. Por eso la comparación A/B se completa con una tercera pieza necesaria:
   **limpiar `resultados_publicados_en` del examen 19**. Esa limpieza es una
   decisión aparte y **no está autorizada**.

---

## 1. Código completo de la migración

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SepararPublicacionRespuestas1794600000000 implements MigrationInterface {
  name = 'SepararPublicacionRespuestas1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "examen" ADD COLUMN IF NOT EXISTS "respuestas_publicadas_en" timestamptz',
    );
    // Mantiene visibles las soluciones que YA habían sido autorizadas por
    // el endpoint antiguo. Las nuevas publicaciones de notas no las liberan.
    await queryRunner.query(`
      UPDATE "examen"
      SET "respuestas_publicadas_en" = "resultados_publicados_en"
      WHERE "resultados_publicados_en" IS NOT NULL
        AND "respuestas_publicadas_en" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "examen" DROP COLUMN IF EXISTS "respuestas_publicadas_en"');
  }
}
```

### Cómo se calcula y aplica el backfill

| Paso | Sentencia | Efecto |
|---|---|---|
| 1 | `ALTER TABLE examen ADD COLUMN ... timestamptz` | Columna nueva, nullable, sin default |
| 2 | `UPDATE ... SET respuestas = resultados` | Copia literal de la fecha |
| Filtro | `resultados_publicados_en IS NOT NULL` | Solo filas con "publicación" previa |
| Filtro | `respuestas_publicadas_en IS NULL` | Idempotente |

No hay cálculo: es una **copia de columna a columna**. No se lee ninguna otra
tabla, no se consultan calificaciones ni respuestas.

### Filas afectadas en la base actual

| examen_id | estado | `resultados_publicados_en` |
|---|---|---|
| **19** | publicado | **2026-11-10 10:45:54.071397+00** |

Solo 1 de 18. Las otras 17 quedarían con `respuestas_publicadas_en = NULL`.

---

## 2. Contexto del examen 19 (solo lectura)

| Dato | Valor |
|---|---|
| Rendiciones | 1 (`estudiante_id = 8`) |
| Estado de la rendición | `enviada` (**no** `corregida`) |
| `nota_final` | `NULL` |
| `calificaciones_revisadas_en` | `NULL` |
| Preguntas asignadas | 12, 17, 34 |
| Respuestas registradas | 1 (`34-a`, texto vacío, `pendiente`, sin puntaje) |
| Soluciones almacenadas | 1 `solucion_opcion` (`34-a`, opción 1) |
| Explicaciones almacenadas | 1 (pregunta 34) |
| Incisos 12-a y 17-a | Sin solución ni explicación |
| Correos de calificación | 0 `envio_calificacion` |
| Ventana del examen | Cerrada (`disponible_hasta = 2026-11-08 18:09:00+00`) |

No existen resultados oficiales que publicar: no hay nota, no hay revisión
confirmada y la rendición sigue en `enviada`.

---

## 3. Origen real de `resultados_publicados_en` en el examen 19

Esto es lo que cambia la decisión.

### Evidencia de código

Antes del commit `039866f` ("Se anadio toda la hu 32 y 33", **2026-11-17**),
la única escritura de `resultados_publicados_en` en todo el backend era:

```ts
// examen-acceso.service.ts (versión anterior)
async publicarRespuestas(examenId: number, docenteId: number) {
  const publicacion = await this.examenRepository
    .createQueryBuilder()
    .update()
    .set({ resultados_publicados_en: () => 'now()' })
    .where('examen_id = :examenId', { examenId })
    .andWhere('docente_id = :docenteId', { docenteId })
    .andWhere('estado = :estado', { estado: 'publicado' })
    .andWhere('resultados_publicados_en IS NULL')
    ...
}
```

Y la vista del estudiante usaba ese mismo flag para decidir si mostraba
soluciones:

```ts
const resultadosPublicados = examen.resultados_publicados_en !== null;
const filas = await this.consultarPreguntas(ids, resultadosPublicados);
...
preguntas: resultadosPublicados
  ? this.aPreguntasEstudiantePublicadas(preguntas)
  : this.aPreguntasEstudiante(preguntas),
```

### Interpretación

- El endpoint se llamaba y documentaba como **publicar respuestas correctas**.
- Escribía en `resultados_publicados_en` porque no existía otra columna.
- La fecha del examen 19 (`2026-11-10`) es **anterior** al commit que separó
  ambos conceptos (`2026-11-17`).
- No existe ningún otro escritor de esa columna en el historial del backend.

**Conclusión de alta confianza:** `resultados_publicados_en` del examen 19
registra la publicación de **respuestas**, no de resultados oficiales. Es el
caso inverso al que preocupa: publicar respuestas terminó marcando resultados.

Esto no se puede probar al 100 % solo con la base (podría haber una escritura
manual), pero sí es la hipótesis que explica todos los datos: rendición sin
corregir, nota nula, revisión no confirmada y una fecha anterior al cambio de
código.

---

## 4. Alternativa A — no backfill

**Definición:** añadir la columna y **no** ejecutar el `UPDATE`.
`respuestas_publicadas_en` queda `NULL` en las 18 filas.

| Aspecto | Resultado |
|---|---|
| Columna | Existe |
| Examen 19 `respuestas_publicadas_en` | `NULL` |
| Examen 19 `resultados_publicados_en` | `2026-11-10 10:45:54.071397+00` (sin cambios) |
| Huella explícita `fa58b030...` | **Sin cambios** |
| Calificaciones | Sin cambios |
| Respuestas correctas visibles | **No** |
| Resultado oficial visible | **No** |
| Examen editable por el docente | **No** (bloqueado por `resultados_publicados_en`) |
| Docente puede confirmar calificaciones | **No** (409) |
| Docente puede publicar resultados | Responde `ya_publicados`; no publica de verdad |

**Qué ve el estudiante 8:** puede abrir la revisión del examen (porque el
sistema cree que los resultados están publicados), ve enunciados y opciones,
pero **no** ve explicación ni marca de opción correcta. Recibe el mensaje de
que las respuestas estarán disponibles cuando el docente las autorice. No ve
nota.

**Problema:** se descarta una autorización de respuestas que probablemente sí
ocurrió y, sobre todo, **el examen sigue bloqueado**.

---

## 5. Alternativa B — backfill original

**Definición:** aplicar el `UPDATE` tal cual.

| Aspecto | Resultado |
|---|---|
| Columna | Existe |
| Examen 19 `respuestas_publicadas_en` | `2026-11-10 10:45:54.071397+00` |
| Examen 19 `resultados_publicados_en` | Igual (sin cambios) |
| Otras 17 filas | `NULL` |
| Huella explícita `fa58b030...` | **Sin cambios** |
| Calificaciones | Sin cambios |
| Respuestas correctas visibles | **Sí**, para el estudiante 8 |
| Resultado oficial visible | **No** |
| Examen editable por el docente | **No** |
| Docente puede confirmar calificaciones | **No** (409) |
| Docente puede publicar resultados | `ya_publicados` |

**Qué ve el estudiante 8:** además de enunciados y opciones, ve:

- La explicación de la pregunta 34.
- Que la opción 1 del inciso `34-a` es correcta (`es_correcta: true`).
- Nada nuevo en 12-a y 17-a, porque no tienen solución ni explicación.

Es una exposición acotada: **1 explicación + 1 opción correcta** para 1
estudiante. Pero es contenido restringido y la decisión debe ser explícita.

**Problema:** preserva la visibilidad histórica, pero **el examen sigue
bloqueado**.

---

## 6. Comparación directa A vs B

| Criterio | A (no backfill) | B (backfill) |
|---|---|---|
| Respeta "resultados ≠ respuestas" | Estructuralmente sí | Estructuralmente sí |
| Conserva la autorización histórica de respuestas | **No** | **Sí** |
| Expone contenido restringido | **No** | 1 explicación + 1 opción |
| Deja el examen 19 editable | **No** | **No** |
| Deja confirmar calificaciones | **No** | **No** |
| Permite publicar resultados de verdad | **No** | **No** |
| Cambia la huella `fa58...` | No | No |
| Cambia notas o puntajes | No | No |
| Reversible con `down` | Sí (pierde nada) | Sí (pierde la fecha de respuestas) |

**Ninguna de las dos, por sí sola, es suficiente.** Ambas mantienen
`resultados_publicados_en` y, con el código nuevo, eso bloquea el examen.

---

## 7. Por qué el examen 19 queda bloqueado con A y con B

El código nuevo exige estados que hoy son contradictorios:

| Operación | Guard | Efecto con `resultados_publicados_en` no nulo |
|---|---|---|
| Editar calificación (`PATCH`) | `asegurarEdicionPermitida` | 409 "Los resultados ya fueron publicados" |
| Confirmar revisión (`POST .../confirmar`) | `confirmar` | 409 "Las respuestas ya fueron publicadas" |
| Publicar resultados (`POST .../resultados/publicar`) | `publicar` | Devuelve `ya_publicados: true` sin publicar |
| Publicar respuestas (`POST .../respuestas/publicar`) | exige `calificaciones_revisadas_en` | 400 hasta que se confirme la revisión |

Y no se puede confirmar la revisión porque `resultados_publicados_en` no es
nulo. Es un ciclo cerrado: **el examen 19 no se puede corregir ni publicar
nunca** mientras ese flag siga puesto.

Esto no lo introduce T2-03; ya ocurre hoy. T2-03 solo lo hace visible al
arreglar la columna faltante.

---

## 8. Guards y servicios que controlan la publicación

| Endpoint | Guard | Regla de negocio |
|---|---|---|
| `POST /examenes/:id/publicar` | `JwtAuthGuard` + `DocenteGuard` | Publica el examen para rendirlo |
| `POST /examenes/:id/resultados/publicar` | `JwtAuthGuard` + `DocenteGuard` | Exige examen publicado, `calificaciones_revisadas_en` no nulo, ventana cerrada y rendiciones corregidas; escribe `resultados_publicados_en` |
| `POST /examenes/:id/respuestas/publicar` | `JwtAuthGuard` + `DocenteGuard` | Exige `resultados_publicados_en` y `calificaciones_revisadas_en`; escribe `respuestas_publicadas_en` de forma idempotente |
| `GET /examenes/:id/respuestas` | `JwtAuthGuard` + `DocenteGuard` | El docente propietario ve todo |
| `GET /examenes/:id/estudiante` | `JwtAuthGuard` + `EstudianteGuard` | Exige asignación; permite revisar si hay resultados, respuestas o ventana abierta; incluye soluciones solo si `respuestas_publicadas_en` no es nulo |
| `GET /estudiante/resultados` | `JwtAuthGuard` + `EstudianteGuard` | Nota oculta salvo resultados publicados + revisión confirmada + rendición corregida con nota |
| `GET /estudiante/resultados/:examenId` | `JwtAuthGuard` + `EstudianteGuard` | 403 si falta cualquiera de esas condiciones |

**Observaciones de código (sin modificarlo):**

1. `publicarRespuestas` devuelve la fecha bajo la clave
   `resultados_publicados_en`, no `respuestas_publicadas_en`. Es un nombre
   heredado; no afecta a los datos, pero confunde.
2. `PublicacionResultadosService.detalleParaEstudiante` ya separa
   correctamente ambos conceptos: `fecha_publicacion` usa resultados y
   `respuestas_correctas_disponibles` usa respuestas.
3. La entidad `Examen` **ya declara** `respuestas_publicadas_en`. Mientras la
   columna no exista en la base, cualquier consulta que seleccione la entidad
   completa falla. Comprobado:

   ```sql
   SELECT "respuestas_publicadas_en" FROM examen LIMIT 1;
   -- ERROR: column "respuestas_publicadas_en" does not exist
   ```

   Esto corrige una conclusión optimista de T2-02: T2-02 no bastó para
   desbloquear HU-31, porque la entidad también espera esta segunda columna.
   T2-03 es necesaria para que el código vuelva a funcionar, con
   independencia del backfill.

---

## 9. ¿Separar las fechas altera las calificaciones existentes?

**No.** La migración:

- No toca `rendicion.nota_final` ni `rendicion.estado`.
- No toca `respuesta_inciso.puntaje_obtenido`, `estado_correccion` ni
  `retroalimentacion`.
- No toca `examen.puntaje_total`.
- No toca `envio_calificacion`.

Línea base actual (para comparar después):

| Comprobación | Valor |
|---|---|
| `rendicion` filas / con nota | 4 / **0** |
| Suma de `nota_final` | **0** |
| `respuesta_inciso` filas / con puntaje | 2 / **0** |
| Suma de `puntaje_obtenido` | **0** |
| `envio_calificacion` filas | **0** |
| Huella de `rendicion` | `2dad4f13916066d8138cec68d451f650` |
| Huella de `respuesta_inciso` | `71fb94b24c3548ffbd3f86cb1bde7bc8` |
| Huella explícita de `examen` | `fa58b030f2f380f19167550e8e52c9bf` |

No hay ninguna calificación que alterar: todas las notas y puntajes están en
`NULL`.

---

## 10. La pieza que falta: limpiar `resultados_publicados_en` del examen 19

Dado que la fecha del examen 19 proviene del endpoint de respuestas y que no
existen resultados oficiales, el estado coherente es:

| Columna | Valor coherente |
|---|---|
| `resultados_publicados_en` | `NULL` |
| `respuestas_publicadas_en` | `NULL` (A') o la fecha histórica (B') |
| `calificaciones_revisadas_en` | `NULL` (sigue pendiente de revisión) |

Con `resultados_publicados_en = NULL`:

- El docente puede editar y confirmar calificaciones.
- Después puede publicar resultados por el flujo correcto.
- Después, si quiere, publica respuestas explícitamente.
- Se respeta la regla en ambos sentidos: ni publicar resultados libera
  respuestas, ni publicar respuestas marca resultados.

**Esto es una modificación de datos y requiere autorización explícita.**
No se ejecutó ni se incluye en la migración actual.

### Dos variantes coherentes

| Variante | `respuestas_publicadas_en` | `resultados_publicados_en` | Efecto |
|---|---|---|---|
| **A'** (fail-closed) | `NULL` | `NULL` | Nada visible; el docente decide después |
| **B'** (fidelidad) | fecha histórica | `NULL` | Respuestas siguen visibles; resultados no |

**Atención:** limpiar `resultados_publicados_en` **cambia la huella explícita**
`fa58b030...`, porque esa columna sí forma parte de las 20 columnas de la
huella. El cambio es esperado y debe registrarse con su nuevo valor. Las
variantes A y B (sin limpiar) mantienen la huella.

También hay una diferencia de acceso: con **A'** el estudiante 8 deja de poder
revisar el examen (ventana cerrada y nada publicado → 403) hasta que el docente
publique algo. Con **B'** conserva la revisión y las respuestas.

---

## 11. Verificaciones posteriores propuestas

### Comunes a cualquier variante

```sql
-- 1. Registro de la migración (id 15, total 15)
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 3;
SELECT count(*) FROM migrations;  -- 15

-- 2. Columna correcta
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen'
   AND column_name='respuestas_publicadas_en';
-- esperado: timestamptz | YES | NULL

-- 3. Estructura
SELECT count(*) FROM examen;  -- 18
SELECT count(*) FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen';  -- 22

-- 4. Revisión sigue pendiente
SELECT count(*) FROM examen WHERE calificaciones_revisadas_en IS NOT NULL;  -- 0

-- 5. Calificaciones intactas
SELECT count(*), count(nota_final), coalesce(sum(nota_final),0) FROM rendicion;
-- 4 | 0 | 0
SELECT count(*), count(puntaje_obtenido), coalesce(sum(puntaje_obtenido),0)
  FROM respuesta_inciso;  -- 2 | 0 | 0
SELECT md5(string_agg(row_to_json(t)::text,'|' ORDER BY examen_id, estudiante_id))
  FROM (SELECT examen_id, estudiante_id, estado, nota_final, fecha_envio
          FROM rendicion) t;  -- 2dad4f13916066d8138cec68d451f650

-- 6. Sin transacciones residuales
SELECT count(*) FROM pg_stat_activity
 WHERE datname='safetest' AND state LIKE 'idle in transaction%';  -- 0
```

### Verificación específica de A (sin limpiar resultados)

```sql
SELECT count(*) FROM examen WHERE respuestas_publicadas_en IS NOT NULL;  -- 0
SELECT examen_id, resultados_publicados_en, respuestas_publicadas_en
  FROM examen WHERE examen_id=19;
-- resultados = 2026-11-10 10:45:54.071397+00 | respuestas = NULL

-- Huella intacta
-- fa58b030f2f380f19167550e8e52c9bf
```

Comportamiento esperado: el estudiante no ve explicación ni opción correcta;
el examen sigue bloqueado para edición y confirmación.

### Verificación específica de B (backfill original)

```sql
SELECT count(*) FROM examen WHERE respuestas_publicadas_en IS NOT NULL;  -- 1
SELECT examen_id, resultados_publicados_en, respuestas_publicadas_en,
       respuestas_publicadas_en = resultados_publicados_en AS coincide
  FROM examen WHERE examen_id=19;
-- respuestas = resultados = 2026-11-10 10:45:54.071397+00 | coincide = true

SELECT count(*) FROM examen
 WHERE resultados_publicados_en IS NULL
   AND respuestas_publicadas_en IS NOT NULL;  -- 0

-- Huella intacta
-- fa58b030f2f380f19167550e8e52c9bf
```

Comportamiento esperado: el estudiante ve la explicación de la pregunta 34 y
la opción 1 del inciso 34-a como correcta; el examen sigue bloqueado.

### Verificación específica de A' (no backfill + limpiar resultados)

```sql
SELECT count(*) FROM examen WHERE respuestas_publicadas_en IS NOT NULL;  -- 0
SELECT examen_id, resultados_publicados_en, respuestas_publicadas_en
  FROM examen WHERE examen_id=19;  -- ambos NULL

-- Huella nueva: registrar el valor; ya NO será fa58b030...
```

Comportamiento esperado: el examen queda editable y confirmable; el estudiante
no puede revisarlo hasta que el docente publique. **A' requiere autorización
aparte para limpiar el flag.**

### Verificación específica de B' (backfill + limpiar resultados)

```sql
SELECT examen_id, resultados_publicados_en, respuestas_publicadas_en
  FROM examen WHERE examen_id=19;
-- resultados = NULL | respuestas = 2026-11-10 10:45:54.071397+00

SELECT count(*) FROM examen WHERE respuestas_publicadas_en IS NOT NULL;  -- 1

-- Huella nueva: registrar el valor; ya NO será fa58b030...
```

Comportamiento esperado: el estudiante conserva la revisión y las respuestas;
el examen queda editable y confirmable.

### Criterios de rechazo / reversión

Si tras T2-03:

- aparece más de 1 fila con `respuestas_publicadas_en` no nulo (en B),
- cambia alguna nota o puntaje,
- cambia el número de filas de `rendicion` o `respuesta_inciso`,
- o queda una transacción abierta,

se revierte con el `down` de la migración y se detiene el plan. No ejecutar
`down` automáticamente sin revisar primero si hubo rollback.

---

## 12. Recomendación

**No aplicar el backfill a ciegas.** La evidencia dice que la fecha del examen
19 es una autorización de respuestas, no una publicación de resultados, pero
la consecuencia funcional es que el examen queda bloqueado en cualquiera de
las dos variantes pedidas.

Mi recomendación, en orden:

1. **Aplicar T2-03 con la columna, sin backfill (A), y limpiar
   `resultados_publicados_en` del examen 19 (A').** Es el estado más
   coherente y fail-closed: nada queda publicado, el examen se desbloquea y el
   docente decide explícitamente qué publicar y cuándo. Coste: el estudiante
   pierde la revisión hasta que el docente publique.
2. Si se prefiere conservar la autorización histórica de respuestas, **B'**:
   backfill + limpiar resultados. Mantiene la revisión del estudiante, pero
   deja respuestas visibles antes de que existan resultados publicados, un
   estado que el flujo nuevo no produce por sí solo.
3. **No elegir A ni B solas**: mantienen el examen 19 bloqueado de forma
   permanente.

La limpieza de `resultados_publicados_en` no forma parte de la migración
actual y **necesita tu autorización explícita**. Tampoco se ejecutó nada.

---

## 13. Anexo — corrección de una conclusión de T2-02

En `T2-02-ejecucion.md` se afirmó que, tras T2-02, el código de HU-31 ya podía
evaluar la columna. Es parcialmente incorrecto: la entidad `Examen` también
declara `respuestas_publicadas_en`, que aún no existe. Por eso las consultas
que seleccionan la entidad completa siguen fallando hasta T2-03. T2-02 fue
correcta y no cambió datos; solo su efecto habilitador era menor de lo
descrito. Queda registrado aquí para no arrastrar la imprecisión.
