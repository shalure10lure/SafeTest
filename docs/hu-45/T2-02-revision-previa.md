# HU-45 · T2-02 — Revisión previa (solo lectura)

**Migración revisada:** `RevisionCalificaciones1794500000000` (`1794500000000`)
**Estado:** pendiente. **No ejecutada.**
**Escrituras realizadas:** ninguna.

> Nota de nombre: la clase exacta es `RevisionCalificaciones1794500000000`
> (trece dígitos en el timestamp). La referencia
> `RevisionCalificaciones1794500000` del pedido tiene un dígito menos y no
> coincidiría con ninguna migración cargada.

---

## 1. Código completo

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/** HU-31: confirmación docente independiente de la publicación (HU-32). */
export class RevisionCalificaciones1794500000000 implements MigrationInterface {
  name = 'RevisionCalificaciones1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "examen"
      ADD COLUMN IF NOT EXISTS "calificaciones_revisadas_en" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "examen"
      DROP COLUMN IF EXISTS "calificaciones_revisadas_en"
    `);
  }
}
```

Es la migración más simple de las tres: una sola sentencia `ALTER TABLE`.

---

## 2. Objetos y datos afectados

| Elemento | Efecto |
|---|---|
| Tabla | `examen` (única) |
| Columna | Añade `calificaciones_revisadas_en timestamptz NULL` |
| Índices | **Ninguno** creado, modificado ni eliminado |
| Restricciones | **Ninguna** creada, modificada ni eliminada |
| Secuencias | Ninguna |
| Datos | **Ninguno** modificado |
| Triggers / reglas / políticas | Ninguno se dispara: `ALTER TABLE ADD COLUMN` no ejecuta triggers |
| Vistas | Ninguna depende de la tabla; añadir columna no las invalida |

### Nivel de bloqueo

`ALTER TABLE ... ADD COLUMN` toma un `ACCESS EXCLUSIVE` sobre `examen`. En
PostgreSQL 11+ una columna nullable **sin default** es una operación de
catálogo: no reescribe la tabla ni las filas. Con 18 filas y 32 kB, el bloqueo
es de milisegundos.

### Idempotencia

`IF NOT EXISTS` hace que un segundo intento no falle y no haga nada. El `down`
también es idempotente.

---

## 3. ¿Hay backfill o modificación de registros?

**No.**

- No hay `UPDATE`.
- No hay `INSERT`.
- No hay `DELETE`.
- Las 18 filas existentes reciben `calificaciones_revisadas_en = NULL`.
- No se toca `resultados_publicados_en`, `respuestas_publicadas_en` ni
  ninguna otra columna.

Es una migración puramente estructural.

---

## 4. Condiciones previas verificadas

| Condición | Consulta | Resultado |
|---|---|---|
| La columna no existe | `information_schema.columns` | **0 filas** |
| La tabla `examen` existe | `pg_class` | `relkind='r'` |
| No está particionada | `relispartition` | `false` |
| No tiene RLS | `relrowsecurity` | `false` |
| Filas actuales | `count(*)` | **18** |
| Columnas actuales | `information_schema.columns` | **20** |
| Tamaño | `pg_total_relation_size` | 32 kB |
| Triggers | `pg_trigger` | Ninguno |
| Reglas de reescritura | `pg_rewrite` | Ninguna |
| Políticas RLS | `pg_policies` | Ninguna |
| Columnas generadas | `is_generated` | Ninguna |
| Colisión del nombre en todo el esquema | `information_schema.columns` | Ninguna tabla tiene esa columna |
| Otra migración que la defina | `grep` en `src/migrations` | Solo `1794500000000` |
| `INSERT` posicionales en código | `grep` | El único `INSERT INTO examen` es un spec con lista explícita de columnas |
| Estado de `migrations` | `SELECT` | 13 filas; última `1794400000000`; T2-02 **no registrada** |
| Bloqueos o conexiones activas | `pg_stat_activity` | Ninguno |

---

## 5. Efecto sobre la huella `fa58b030f2f380f19167550e8e52c9bf`

**No puede cambiarla**, siempre que la huella se calcule con la consulta
definida, que enumera explícitamente 20 columnas y **no** incluye
`calificaciones_revisadas_en`.

Razones:

1. La migración no modifica ninguna fila.
2. La huella proyecta columnas concretas; una columna nueva fuera de esa lista
   no interviene en el `row_to_json`.
3. `ADD COLUMN` sin default no reescribe filas.

Matiz importante: si en el futuro alguien calcula la huella con `SELECT *`,
la incorporación de la columna (con `NULL`) **sí** alteraría el resultado,
aunque los datos sigan intactos. La verificación debe mantener la lista
explícita de columnas.

Valor actual confirmado antes de T2-02: `fa58b030f2f380f19167550e8e52c9bf`.

---

## 6. Efectos funcionales esperados

No hay cambios de datos, pero sí de comportamiento del código, porque hoy las
consultas que usan la columna fallan:

| Flujo | Antes de T2-02 | Después de T2-02 |
|---|---|---|
| `RevisionCalificacionesService.verificarExamen` / `asegurarEdicionPermitida` | Error SQL por columna inexistente | Funciona; con `NULL` **no bloquea** edición |
| `POST .../calificaciones/confirmar` | Error SQL | Funciona; puede fijar la marca |
| `PublicacionResultadosService.publicar` | Error SQL | Exige confirmación previa; sin ella, responde error de negocio |
| Resultados al estudiante | Error SQL | Sigue bloqueado: exige `calificaciones_revisadas_en` no nulo, y hoy sería `NULL` en los 18 exámenes |
| Examen 19 | — | No se desbloquea nada: su `calificaciones_revisadas_en` quedaría `NULL` |

Conclusión: T2-02 **no abre ninguna compuerta**. Solo hace que las compuertas
existentes puedan evaluarse. La publicación de soluciones del examen 19 sigue
dependiendo de T2-03, que no está autorizada.

---

## 7. Verificaciones posteriores a la ejecución

Todas de solo lectura, inmediatamente después:

```sql
-- 1. Registro de la migración (debe ser id 14)
SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 2;
SELECT count(*) FROM migrations;  -- 14

-- 2. Definición exacta de la columna
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen'
   AND column_name='calificaciones_revisadas_en';
-- esperado: timestamptz | YES | NULL

-- 3. Nadie quedó confirmado
SELECT count(*) FROM examen WHERE calificaciones_revisadas_en IS NOT NULL;
-- esperado: 0

-- 4. Sin cambios estructurales colaterales
SELECT count(*) FROM examen;  -- 18
SELECT count(*) FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen';  -- 21

-- 5. Huella intacta
SELECT md5(string_agg(row_to_json(t)::text, '|' ORDER BY examen_id))
  FROM (
    SELECT examen_id, nro_prueba, fecha, modo_seleccion, modo_entrega_nota,
           semestre_id, docente_id, materia_id, titulo, instrucciones,
           duracion_min, disponible_desde, disponible_hasta, estado,
           orden_preguntas, al_terminar_tiempo, resultados_publicados_en,
           enviar_resultados_correo, modo_asignacion, puntaje_total
      FROM examen
  ) t;
-- esperado: fa58b030f2f380f19167550e8e52c9bf

-- 6. T2-03 sigue pendiente
SELECT count(*) FROM information_schema.columns
 WHERE table_schema='public' AND table_name='examen'
   AND column_name='respuestas_publicadas_en';  -- 0
SELECT count(*) FROM migrations
 WHERE timestamp='1794600000000';  -- 0

-- 7. Sin bloqueos residuales
SELECT count(*) FROM pg_stat_activity
 WHERE datname='safetest' AND state LIKE 'idle in transaction%';  -- 0
```

### Criterios de aceptación

1. Fila 14 en `migrations` con `RevisionCalificaciones1794500000000`.
2. Columna `timestamptz` nullable, sin default.
3. 0 filas con valor no nulo.
4. 18 filas y 21 columnas en `examen`.
5. Huella idéntica a `fa58b030f2f380f19167550e8e52c9bf`.
6. `respuestas_publicadas_en` sigue sin existir.
7. Sin transacciones abiertas.

Si falla cualquiera, se revierte con `down` y se detiene el plan.

---

## 8. Riesgos

| Riesgo | Evaluación |
|---|---|
| Pérdida de datos | **Nula**: no se elimina ni modifica nada |
| Bloqueo prolongado | **Nulo**: operación de catálogo sobre 18 filas |
| Cambio de visibilidad | **Ninguno** |
| Backfill implícito | **No existe** |
| Reversión | `down` elimina la columna; hoy no contiene datos que perder |
| Colisión de nombre | Verificada: no existe en ninguna tabla |

---

## 9. Conclusión

T2-02 es una migración estructural, sin datos, idempotente y sin efecto sobre
la huella del examen. No desbloquea resultados ni soluciones. Su único efecto
es habilitar el código de HU-31 que hoy falla por columna inexistente, dejando
todas las compuertas abiertas (`NULL`) hasta que un docente confirme.

No se ejecutó. Queda a la espera de autorización explícita.
