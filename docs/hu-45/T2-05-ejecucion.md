# HU-45 · T2-05 — Registro del módulo de persistencia

**Fecha:** 2026-11-19  
**Estado:** cableado de entidad y módulo completado; verificación de arranque con
PostgreSQL pendiente.

## Alcance implementado

- Se reutilizó la entidad existente `CorreccionIa`.
- Se creó `CorreccionIaModule`, que registra `CorreccionIa` mediante
  `TypeOrmModule.forFeature`.
- Se importó el módulo en `AppModule`. `autoLoadEntities` está habilitado y
  `synchronize` permanece deshabilitado.
- No se añadieron servicios, controladores ni worker en este paso.

## Estado de dependencias revisado

- T2-01 a T2-03 constan como aplicadas en sus registros de ejecución.
- El archivo de T2-04 existe y fue revisado estáticamente, pero no se ha
  aplicado. La conexión sigue sin configuración disponible; no se intentó
  conectar ni ejecutar migraciones durante T2-05.
- T2-06 ya está implementada en `RevisionCalificacionesService`; sus pruebas
  enfocadas se ejecutaron junto con la prueba de registro del módulo.
- No se encontraron informes de ejecución separados para T2-04.5/T2-04.6 ni
  T2-06; la evidencia de T2-06 está en el servicio y su archivo de pruebas.

## Verificaciones

| Verificación | Resultado |
|---|---|
| Prueba de registro de `CorreccionIaModule` | Pasó |
| Regresión de `RevisionCalificacionesService` | Pasaron 11 pruebas |
| Total de pruebas enfocadas | 2 suites, 12 pruebas pasaron |
| TypeScript enfocado (`correccionia.module.ts`, su prueba y `app.module.ts`) | Pasó |
| Prettier en los archivos nuevos | Pasó |
| PostgreSQL / migraciones | No ejecutados |

La suite se ejecutó en modo ESM con configuración temporal basada en
`tsconfig.jest.t11.json`; dicha configuración se retiró al terminar. El chequeo
Prettier de `app.module.ts` no pasa ya en la versión base del archivo, por lo
que no se reformateó de manera amplia.

## Pendientes

- Aplicar únicamente T2-04 cuando se recupere la configuración y se vuelva a
  comprobar el destino autorizado.
- Verificar el arranque conectado después de aplicar T2-04.
- Siguiente tarea de implementación recomendada: T2-07, validación pura de
  criterios y respuestas, con pruebas unitarias y sin acceso a PostgreSQL.
