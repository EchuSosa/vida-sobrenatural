# Fallas conocidas de los tests (caso "entorno")

Regla en `CLAUDE.md` ("Cuando un test falla"): cuando una falla se atribuye al entorno y no al
producto ni a un cambio de regla, se anota acá con fecha y síntoma. **A la tercera vez deja de ser
"entorno" y se investiga como bug.** Cuando se resuelve, la fila se marca y se deja (sirve de
historia).

| Fecha | Suite | Síntoma | Veces | Qué se cree | Estado |
|---|---|---|---|---|---|
| 2026-10-11 | e2e backoffice, en local (no en CI) | `Hydration failed … server rendered text didn't match`: "Lo pidió el 13 de octubre de 2026, 11:00 a. m." (servidor) vs "… a las 11:00 a. m." (cliente). El cuerpo del test pasa; falla por el guard de errores de consola (H-100). | 3+ (todas las corridas locales del backoffice) | Diferencia de datos ICU de Node entre el servidor (`full-icu`) y Chromium en el contenedor de desarrollo. En CI no pasa. | **Pendiente de investigar** (ya superó las 3 veces): o se fija el formato en código (sin depender del ICU de cada lado) o se documenta por qué no aplica. |
| 2026-10-13 | Integración (CI), PR #54 | El job falló sin fallas de tests legibles (solo "Process completed with exit code 1"); en local, 72 suites / 557 tests en verde; al volver a correr el job, verde. | 1 | Caída del runner o de Postgres del job. | Abierta. Si se repite, pedir que el job suba el log de jest como artefacto para poder leerlo. |
| 2026-10-13 | e2e backoffice y web, en local | `page.goto: net::ERR_ABORTED` en el primer test de la corrida: el servidor de Next recién compila la ruta. Con `--retries=1` pasa. | 2 | Arranque en frío de `next dev`; no pasa en CI porque el `globalSetup` calienta las rutas. | Abierta. |
