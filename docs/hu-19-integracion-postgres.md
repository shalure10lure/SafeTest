# HU-19 — Pruebas de integración reales con PostgreSQL

Este documento explica cómo ejecutar la prueba de concurrencia real de HU-19.
La prueba **no forma parte** de la ejecución normal: se omite automáticamente si
no existe `TEST_DATABASE_URL`.

## Qué valida

`src/examen/examen.integration.spec.ts` usa tres conexiones PostgreSQL
independientes:

- Una conexión de preparación crea el esquema mínimo y siembra los datos.
- Dos conexiones independientes (`A` y `B`) ejecutan `ExamenService` de forma
  concurrente.

Casos cubiertos:

| Caso | Qué comprueba |
|---|---|
| A | Dos asignaciones simultáneas se serializan y dejan una única selección consistente. |
| B | Dos publicaciones simultáneas: solo una cambia el estado; la otra recibe `BadRequestException`. |
| C | Un cambio de estado concurrente (otra transacción con la fila bloqueada) impide publicar. |
| D | Un error de persistencia revierte también los `DELETE`/`UPDATE` previos de la transacción. |

Las entidades de la prueba son espejos mínimos de las tablas usadas por
`ExamenService`. No se usan las entidades de producción para evitar arrastrar
todo el grafo de relaciones, pero sí se ejecuta el servicio real contra
PostgreSQL real y sus bloqueos reales.

## Requisitos de seguridad

La prueba rechaza la ejecución si:

- `NODE_ENV=production`.
- La URL no es `postgres://` o `postgresql://`.
- El puerto es `5433` (base de desarrollo del proyecto).
- El nombre de la base no contiene `_test`.
- El nombre de la base es exactamente `safetest`.

Además, la conexión de preparación usa `dropSchema: true` y `synchronize: true`.
Eso **borra y recrea el esquema de la base indicada**. Por eso solo debe
apuntarse a una base desechable.

No se lee `.env`, no se usan migraciones del proyecto y no se toca la base de
desarrollo.

## Cómo ejecutarla

1. Levantar un PostgreSQL temporal en otro puerto (por ejemplo `55432`):

```powershell
docker run --rm -d --name safetest-pg-hu19-test `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=<password-temporal> `
  -e POSTGRES_DB=safetest_test_hu19 `
  -p 55432:5432 postgres:16
```

2. Exportar la URL explícita y ejecutar solo la suite de integración:

```powershell
$env:NODE_OPTIONS='--experimental-vm-modules'
$env:TEST_DATABASE_URL='postgresql://postgres:<password-temporal>@localhost:55432/safetest_test_hu19'
npx jest --config jest.t11.config.cjs --runInBand src/examen/examen.integration.spec.ts
```

3. Destruir el contenedor:

```powershell
docker rm -f safetest-pg-hu19-test
```

## Resultado de la ejecución realizada

Se ejecutó contra un contenedor PostgreSQL 16 desechable en el puerto `55432`,
con la base `safetest_test_hu19`, y los cuatro casos pasaron
(`4 passed`). El contenedor se eliminó al terminar.

## Relación con la suite normal

Sin `TEST_DATABASE_URL`, la suite aparece como *skipped* y no falla. Esto es
intencional: la validación de concurrencia real requiere una base explícita y no
debe ejecutarse por accidente en CI contra una base compartida.

La suite normal (`npx jest --config jest.t11.config.cjs`) valida la lógica con
mocks; la suite de integración es la que valida bloqueos y rollback reales.
