# Fallas conocidas de los tests (caso "entorno")

Regla en `CLAUDE.md` ("Cuando un test falla"): cuando una falla se atribuye al entorno y no al
producto ni a un cambio de regla, se anota acá con fecha y síntoma. **A la tercera vez deja de ser
"entorno" y se investiga como bug.** Cuando se resuelve, la fila se marca y se deja (sirve de
historia).

**Cómo llega una falla acá desde la CI:** los e2e corren con `retries: 2` y `failOnFlakyTests: true`.
Un test que falla y pasa al reintento aparece en el reporte de Playwright como **flaky** y hace
fallar la corrida igual. No se "reintenta hasta que pase": se abre esta tabla, se decide si es (a),
(b) o (c), y recién después se toca algo.

| Fecha | Suite | Síntoma | Veces | Qué se cree | Estado |
|---|---|---|---|---|---|
| 2026-10-11 | e2e backoffice, en local (no en CI) | `Hydration failed … server rendered text didn't match`: "Lo pidió el 13 de octubre de 2026, 11:00 a. m." (servidor) vs "… a las 11:00 a. m." (cliente). El cuerpo del test pasa; falla por el guard de errores de consola (H-100). | 3+ (todas las corridas locales del backoffice) | Diferencia de datos ICU de Node entre el servidor (`full-icu`) y Chromium en el contenedor de desarrollo. En CI no pasa. | **Pendiente de investigar** (ya superó las 3 veces): o se fija el formato en código (sin depender del ICU de cada lado) o se documenta por qué no aplica. |
| 2026-10-13 | Integración (CI), PR #54 y PR #58 (este último no toca la API) | El job falló sin fallas de tests legibles (solo "Process completed with exit code 1"); en local, 72 suites / 557 tests en verde; al volver a correr el job, verde. | 2 | Caída del runner o de Postgres del job, o un test de integración inestable entre sí (orden/carrera). | Abierta. Desde ahora el reporter emite cada falla como **anotación** del job (`::error`) y los e2e usan el reporter `github`: la próxima vez se va a saber qué test fue. A la tercera se investiga. |
| 2026-10-13 | e2e backoffice y web, en local | `page.goto: net::ERR_ABORTED` o `apiRequestContext.get: Test timeout` en el primer test de la corrida: el servidor de Next recién compila la ruta. Con `--retries=1` pasa. | 3 | Arranque en frío de `next dev`; no pasa en CI porque el `globalSetup` calienta las rutas. | **Pendiente de investigar** (3 veces): calentar `/api/auth/csrf` y `/registro` en el `webServer` local o en un `globalSetup` liviano. |
| 2026-10-14 | e2e backoffice (CI), PR #59, `propuestas.spec.ts:76` (dos corridas) y `discipulado-encuentros.spec.ts:16` (`@celular`, modo oscuro) — **primeros flaky que atrapó `failOnFlakyTests`** | `axe`: contraste 1.12:1 en el botón "Más" del encabezado: texto del tema claro (`#2f1e17`) sobre fondo del tema oscuro (`#1c1612`). Pasó al reintento. | 3 | No es un color real: next-themes aplica la clase del tema en el cliente y los colores del botón transicionan (`transition-all`); si la transición arranca después de `esperarAnimacionesAsentadas` y antes de que axe mida, se mide a mitad de camino. Carrera del arnés de test, no del producto (la persona real recibe el tema del servidor, D95). | **Cerrado**: `auditar` desactiva transiciones y animaciones antes de medir (web y backoffice). 6/6 en local. |
| 2026-10-14 | e2e backoffice (CI), PR #59 (2ª corrida), `persona-editar.spec.ts:29` (`@celular`, modo claro) | `getByLabel('Teléfono')` encontró **dos** `<input id="campo-telefono">` idénticos (mismo valor) justo después de navegar de `/personas/:id` a `/personas/:id/editar`. Pasó al reintento. | 1 | El formulario de edición aparece dos veces en el DOM por un instante durante la navegación del App Router (¿árbol viejo + nuevo con `loading.tsx`?). Hay que reproducirlo con una traza antes de opinar: si el duplicado dura más de un frame es un bug del producto (ids repetidos). | Abierta. |
| 2026-10-14 | e2e backoffice (CI), PR #59 (3ª corrida), `postulaciones.spec.ts:28` (modo claro) | `axe`: `page-has-heading-one` (la página no tiene `<h1>`) justo después de ir de Inicio a la bandeja por el enlace de Pendientes. Pasó al reintento. | 1 | Se midió con el `loading.tsx` de la bandeja en pantalla (`aria-busy="true"`, sin `<h1>`): la red estaba quieta (`networkidle`) pero la navegación del App Router todavía no había pintado la página. Carrera del arnés. | **Cerrado**: `auditar` espera a que no quede ningún `[aria-busy="true"]` antes de medir (web y backoffice). |

## Hallazgos de la auditoría de tests (2026-10-13)

Revisión de las tres suites y de la historia de git desde septiembre buscando tests que pasan sin
validar, aserciones débiles, tests salteados y aserciones quitadas. Resultado: ningún test sin
aserción, ninguno salteado, 24 aserciones débiles (chequeos previos a una fuerte). Tres commits
habían quitado aserciones; revisados uno por uno:

| # | Origen | Qué pasó | Veredicto | Estado |
|---|---|---|---|---|
| 1 | `74ddeb3` (#27): se quitó "Elegí una opción en Género" del resumen de errores del registro porque "en CI no apareció". | Reproducido en Chromium con viewport de celular: al tocar "Siguiente" con un campo vacío enfocado, el `blur` muestra el error de ese campo, el botón se corre ~57 px y el dedo se levanta sobre el formulario: **el primer toque se pierde** y hay que tocar dos veces. Con `click({ delay: 150 })` (un toque real) se reproduce 3 de 3. | **(a) Bug del producto.** El test tenía razón; se ajustó el test. | Test que lo reproduce en `apps/web/e2e/ajustes-ux.spec.ts` marcado `test.fail` hasta arreglar el producto (cuando pase, Playwright avisa y se saca la marca). **Arreglo pendiente de decisión de Echu**: no mostrar el resumen al salir de un campo (solo el mensaje bajo el campo; el resumen al intentar avanzar) o `preventDefault` en el `mousedown` del botón para que el campo no pierda el foco antes del click. |
| 2 | `9a512e2` (spec 012): se borró el unit test de `EventosDiscipuladoService` (el log no lleva datos personales, Principio X). | El servicio dejó de existir; lo reemplaza `NotificacionesService` y **`test/unit/notificaciones-emitir.spec.ts` verifica lo mismo** (solo evento, tipo de destinatario e ids en el log). | Falsa alarma: la cobertura se movió. | Cerrado. |
| 3 | `232ecb5` (spec 009): se borró el test del estado vacío de la página pública de Ministerios porque los seeds ya cargan Ministerios. | El estado vacío quedó sin test (Principio VIII). | Deuda de cobertura. | **Repuesto**: `apps/web/e2e/ministerios-publica-vacia.spec.ts` pausa los Ministerios activos (con `workers: 1` nadie más corre), verifica el vacío y los restaura. |
| 4 | Configuración: `retries: 2` en CI sin `failOnFlakyTests`. | Un test inestable dejaba la corrida verde sin que nadie lo viera. | Agujero del proceso. | **Cerrado** en #57 (`failOnFlakyTests: true`). |
