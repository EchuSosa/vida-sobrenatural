---
description: "Tareas de la spec 012 — Notificaciones: Avisos in-app y email"
---

# Tasks: Notificaciones — Avisos in-app y email

**Input**: Design documents from `/specs/012-notificaciones/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la Constitución los exige (Principio VI y VII): unit para toda regla con ramas,
integración para lo que escribe en la base dentro de una transacción, e2e con axe en los dos temas
para los flujos críticos (ver un aviso y llegar a su destino; mandar un aviso manual con mail). Cada
FR y cada SC tiene al menos una tarea de test que lo cita.

**Organización**: por historia de usuario (US1–US3 son P1, US4–US5 P2, US6 P3), y al final
**Lotes** agrupa las tareas en sesiones paralelas que no se pisan, con un **lote 0** compartido.

**Convenciones que valen para todas las tareas** (para no repetirlas en cada una):
- Permisos solo con `@RequierePermiso` / `requerirPermiso` contra `CATALOGO_PERMISOS` (D132).
  Los `/avisos/*` exigen sesión como `/personas/me` y filtran por la Persona de la sesión.
- Errores con Problem Details y un `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito; listados con `Pagina<T>` paginados por la API (H-42, `docs/15`
  §Listados paginados).
- Textos de interfaz por `next-intl`, rioplatense con voseo (D84). Colores solo de tokens (D118).
  Estados con texto + ícono (D81).
- Botones de acción con `Button` + `useEnvio` de `packages/ui` (H-57). Validación con
  `useValidacionCampos` + `ResumenErrores` + `MensajeErrorCampo` (H-50).
- En Next, "cargando" es `loading.tsx` y "error" es `error.tsx`.
- **Celular (D150)**: las pantallas de la web app se diseñan a 360 px primero; letra de 16 px en
  títulos, detalle, etiquetas y botones (14 px solo para la fecha); `Button` de 44 px de alto;
  objetivos táctiles ≥ 44×44 px; sus e2e llevan la etiqueta `@celular`.
- Nada de datos personales (nombres, emails, teléfonos, motivos) en logs, Sentry, `datos` de un
  evento, `params` de una Notificación ni asuntos de mail (Principio X, FR-013, FR-024).
- Toda emisión de aviso va por `NotificacionesService.emitir(tx, evento)` **dentro** de la
  transacción del cambio (contracts/emision.md).

---

## Phase 1: Setup

- [x] T001 **[Lote 0 global: la 007 y la 012 comparten el lote 0 global: `EmailService`, `EmailServiceFalso` y Mailpit ya están]** Verificar antes de arrancar: `main` actualizado; `.specify/feature.json` apunta a `specs/012-notificaciones`; si la spec 007 ya está en `main`, que existan `apps/api/src/email/email.service.ts`, `EmailServiceFalso`, Mailpit en `docker-compose.yml` y `apps/api/src/email/mensajes/es.json` (si no, el lote C espera); anotar qué specs de 008–011 están en `main` (decide qué tareas del lote F se hacen, research #13). Si hay que agregar algo a `docs/05-decisiones.md`, mirar el último número antes (D89, D103).
- [x] T002 **[Lote 0 global: dependencia y variables hechas; la validación "no arranca sin `WEB_URL`" → lote C (cuando la use el envío)]** Agregar `@nestjs/schedule` a `apps/api/package.json` (`pnpm --filter api add @nestjs/schedule`) y las variables `WEB_URL` (obligatoria: la API no arranca sin ella, mismo criterio que `INTERNAL_API_SECRET`) y `TAREAS_PROGRAMADAS` (default `true`; `false` en `.env.test` y `.env.e2e`) a `apps/api/.env.example`, `.env.test.example`, `.env.e2e.example` y la validación de configuración de `apps/api/src/configurar-app.ts` (plan, research #7).

---

## Phase 2: Foundational — lote 0 (bloquea todas las historias, secuencial)

- [x] T003 **[Lote 0 global: hecho con todos los eventos 004–011 y los destinatarios `lideres_grupo` y `evento_inscriptos` (D199–D201); los DTOs del backoffice (`NotificacionManual*`, `ConteoDestinatarios`, `MailFallido`) → lote D; `eventos-discipulado.ts` sigue igual hasta el lote B]** Crear `packages/shared-types/src/avisos.ts` según contracts/catalogo-eventos.md y data-model.md: `Disparador` (`contenido_liberado` | `solicitud_actualizada` | `evento_proximo` | `recordatorio_inscripcion` | `proceso_actualizado`), `Destinatario` (8 variantes), `EventoAviso` (unión discriminada por `nombre`, con `a` y `datos` tipados por evento, los ~30 eventos de 004, `persona`, 008, 009, 010 y 011), `NombreEventoAviso`, `EntradaCatalogo`, `CATALOGO_AVISOS` (con `spec`, `destinatario`, `disparador`, `prioridad`, `entidad`, `destino`, `clave` de cada uno, exactamente como la tabla del contrato; destino de `discipulado.propuesta_nueva` = `/mi-camino` hasta la 006), las constantes `TITULO_AVISO_MAX = 80`, `MENSAJE_AVISO_MAX = 1000`, `AVISOS_POR_PAGINA = 20`, `MAX_INTENTOS_EMAIL = 5`, `ESPERAS_REINTENTO_EMAIL_MS = [60_000, 600_000, 3_600_000, 21_600_000]`, `DIAS_MAILS_FALLIDOS_VISIBLES = 30`, `DIAS_ANTES_EVENTO_PROXIMO = 1`, y los DTOs `AvisoResumen`, `AvisoDetalle`, `NotificacionManualResumen`, `NotificacionManualDetalle`, `NuevaNotificacionManual`, `ConteoDestinatarios`, `MailFallido` (contracts/avisos-api.md, contracts/notificaciones-api.md). Cambiar `eventos-discipulado.ts` a un reexport transitorio (`EventoDiscipulado = Extract<EventoAviso, { nombre: \`discipulado.${string}\` }>`), que se borra en T030. Exportar desde `index.ts`. (FR-010, FR-012, FR-013, FR-039)
- [x] T004 **[Lote 0 global: (a) y el prefijo de dominio en `lote-0-global.spec.ts`; (b)–(e) → lote A]** [P] Unit test del catálogo en `apps/api/test/unit/catalogo-avisos.spec.ts`: (a) cada entrada con `destinatario: 'admin'` tiene `disparador: null` y ninguna otra lo tiene; (b) `destino` de cada evento con datos de ejemplo devuelve una ruta que empieza con `/` y sin dominio; (c) `clave` de `evento.proximo`, `evento.recordatorio_inscripcion`, `vida_servicio.contenido_liberado`, `bautismo.fecha_asignada` y `persona.cuenta_activada` no es `null` y depende solo de ids; (d) cada importante tiene destinatario `persona` o `discipulador`; (e) los importantes son exactamente los de `docs/16` §1 (lista fija en el test). (FR-012, FR-014, US6-6)
- [x] T005 **[Lote 0 global: hecho, con traducciones]** Extender `packages/shared-types/src/error-code.ts` con `NOTIFICACION_SIN_DESTINATARIOS` y `ALCANCE_NO_DISPONIBLE` (comentario con el FR), y agregar los códigos de campo `TITULO_REQUERIDO`, `TITULO_DEMASIADO_LARGO`, `MENSAJE_REQUERIDO`, `MENSAJE_DEMASIADO_LARGO`, `ALCANCE_REQUERIDO`, `ALCANCE_ID_REQUERIDO` donde viven los de campo; sus traducciones en `apps/backoffice/src/messages/es.json` (que digan cómo corregir: "Escribí un título de hasta 80 caracteres"). (FR-027, FR-029, FR-034)
- [x] T006 **[Lote 0 global: hecho]** Extender `packages/shared-types/src/permisos.ts`: agregar `'notificaciones.enviar': ['admin']` a `Permiso` y `CATALOGO_PERMISOS` (`notificaciones.ver` ya existe con `admin` y `pastor`). Actualizar el test del catálogo de permisos si enumera los permisos. (FR-032)
- [x] T007 **[Lote 0 global: en la migración única `20261008120000_lote_0_global`]** Extender `apps/api/prisma/schema.prisma` según data-model.md: enums `TipoNotificacion`, `PrioridadNotificacion`, `AlcanceNotificacion`, `CanalEntrega { app, email, push }`, `EstadoEntrega { pendiente, enviada, fallida }`; modelo `Notificacion` (`alcanceId String?`, `evento String?`, `params Json?`, `entidadTipo String?`, `entidadId String?`, `titulo String? @db.VarChar(80)`, `mensaje String? @db.VarChar(1000)`, `creadoPorId String?` → Persona, `claveIdempotencia String? @unique`, `createdAt`; `@@index([tipo, createdAt])`, `@@index([creadoPorId])`, `@@map("notificaciones")`); modelo `EntregaNotificacion` (`intentos Int @default(0)`, `proximoIntentoEn DateTime?`, `ultimoError String? @db.VarChar(64)`, `enviadaEn DateTime?`, `leidaEn DateTime?`, `createdAt`; `@@unique([notificacionId, personaId, canal])`, `@@index([personaId, canal, createdAt])`, `@@index([canal, estado, proximoIntentoEn])`, `@@index([notificacionId, canal, estado])`, `@@map("entregas_notificacion")`); relaciones inversas en `Persona`. (data-model.md)
- [x] T008 **[Lote 0 global: en la migración única]** Crear la migración con `pnpm --filter api exec prisma migrate dev --create-only --name notificaciones` y agregarle a mano (patrón H-140): CHECK manual ⇒ `titulo`, `mensaje`, `"creadoPorId"` no nulos y `evento`, `params`, `"claveIdempotencia"` nulos; CHECK automática ⇒ `evento` no nulo y `titulo`, `mensaje`, `"creadoPorId"` nulos; CHECK `(alcance = 'todos') = ("alcanceId" IS NULL)`; CHECK `canal = 'app' OR "leidaEn" IS NULL`; `CREATE INDEX entregas_sin_leer ON entregas_notificacion ("personaId") WHERE canal = 'app' AND "leidaEn" IS NULL`. Aplicarla y correr `pnpm --filter api run test`.
- [x] T009 **[Lote 0 global: todos los tipos resueltos de verdad (los modelos de 009 y 011 ya existen)]** Crear `apps/api/src/notificaciones/destinatarios.ts` con `resolverDestinatarios(tx, destinatario): Promise<{ id: string; tieneEmail: boolean }[]>`, la **única** implementación (envío y conteo previo, Principio XI): `persona`/`discipulador` → esa Persona; `grupo` → Inscripciones `activa` del Grupo; `ministerio` → miembros vigentes (lanza `ALCANCE_NO_DISPONIBLE` mientras no exista la 009); `evento_confirmados` y `todas_sin_inscripcion` → lanzan `ALCANCE_NO_DISPONIBLE` mientras no exista la 011 (se completan en T055); `todas` → todas; `admin` → `[]`. Siempre filtra `estado = activa` y `activo = true` en la misma consulta. (FR-015, FR-016)
- [x] T010 **[Lote 0 global: → lote A]** [P] Test de integración de `resolverDestinatarios` en `apps/api/test/integration/notificaciones-destinatarios.integration-spec.ts`: Persona `pendiente_tutor` y Persona `activo = false` nunca aparecen; `grupo` excluye Inscripciones `completada`, `dada_de_baja` y `abandono`; `todas` incluye a la Persona Admin; `tieneEmail` refleja el email nulo; `admin` → vacío. (FR-015, FR-016, edge cases)
- [x] T011 **[Lote 0 global: registrado como `@Global`]** Crear `apps/api/src/notificaciones/notificaciones.module.ts` y `notificaciones.service.ts` con `emitir(tx, evento)` según contracts/emision.md: valida `a.tipo` contra el catálogo (lanza si no coincide), escribe el log estructurado sin datos personales (`{ evento, destinatario: a.tipo, ...ids }`), termina si `destinatario = admin`, inserta la Notificación con `ON CONFLICT ("claveIdempotencia") DO NOTHING` (si no insertó, termina), deriva `alcance`/`alcanceId` del destinatario, guarda `params = datos`, `entidadTipo`/`entidadId` del catálogo, y crea en **una sentencia por canal** las Entregas `app` (`enviada`) y, si es importante, `email` (`pendiente`, `proximoIntentoEn = now()`) solo para quienes `tieneEmail`. Devuelve `{ hayEmails }`. Registrar el módulo en `app.module.ts`. (FR-010, FR-011, FR-012, FR-014, FR-015, FR-017)
- [x] T012 **[Lote 0 global: → lote A]** [P] Unit test de `emitir` con `tx` falso en `apps/api/test/unit/notificaciones-emitir.spec.ts` (reusar el patrón de `discipulado-tx-falso.ts`): evento a `admin` → solo log, ninguna escritura; `a.tipo` incorrecto → lanza; el log tiene exactamente `evento`, `destinatario` y los ids de `datos` (adapta y reemplaza `eventos-discipulado.spec.ts`); normal → solo canal `app`; importante → `app` para todos y `email` solo para los que tienen email. (FR-013, FR-015, FR-017, FR-024)
- [x] T013 **[Lote 0 global: (a), (c) y "admin no genera" en `lote-0-global.integration-spec.ts`; (b) cubierto por la misma; (d) y (e) → lote A]** Test de integración de `emitir` en `apps/api/test/integration/notificaciones-emitir.integration-spec.ts`: (a) dentro de una `$transaction` que después lanza → no queda Notificación ni Entrega (FR-011, US2-4); (b) dentro de una que confirma → las Entregas existen al volver de `$transaction`, sin esperar ningún proceso (SC-001); (c) misma clave dos veces → una Notificación y una Entrega por destinatario (FR-014, US2-5); (d) un evento `todas` con 500 Personas sembradas tarda menos de 1 s y crea 500 Entregas `app` (SC-005); (e) los CHECK de la migración rechazan una manual sin título y una automática sin `evento`.
- [x] T014 **[Lote 0 global: `avisos.eventos.<dominio>.<evento>.titulo|detalle` (anidado: next-intl no admite puntos en las claves) para todos los eventos que no van al Admin; el resto de los textos de pantalla → lote A (web) y D (backoffice)]** [P] Agregar a `apps/web/src/messages/es.json` el namespace `avisos` (pantalla: título "Avisos", "Sin leer", "Marcar todos como leídos", "Listo, marcamos todos como leídos", estado vacío "Acá vas a ver las novedades de tu camino y los avisos de la iglesia" + "Ir a Mi camino", error, "{n} avisos sin leer", "Volver a Avisos", paginado) y `avisos.eventos.<nombre>.titulo|detalle` para **cada** evento del catálogo con destinatario distinto de `admin` (textos de la columna Título de contracts/catalogo-eventos.md, voseo, sin nombres de Personas ni motivos). Agregar a `apps/backoffice/src/messages/es.json` el namespace `notificaciones` (listado, columnas, diálogo, advertencia de importante, conteo "Le va a llegar a {n} personas" / "{m} lo reciben también por mail", confirmación, detalle, "Mails que no salieron", "Por ahora no hay ministerios para elegir"). (FR-002, FR-006, D84)
- [x] T015 **[Lote 0 global: → lote A (las claves son `avisos.eventos.<dominio>.<evento>`)]** [P] Unit test de completitud y privacidad de textos en `apps/api/test/unit/catalogo-avisos-textos.spec.ts`: por cada evento del catálogo con destinatario ≠ `admin`, existen `avisos.eventos.<nombre>.titulo` y `.detalle` en `apps/web/src/messages/es.json`; ningún texto contiene placeholders de nombre de Persona (`{nombre}`, `{apellido}`, `{persona}`) ni la palabra "motivo"; los placeholders usados existen en los `datos` del evento. (FR-040, SC-006, SC-009)
- [x] T016 **[Lote 0 global: hecho]** Extender `apps/api/scripts/limpiar-e2e.ts` (H-67): antes de borrar las Personas `e2e-`, borrar sus `EntregaNotificacion`, las `Notificacion` creadas por ellas y las que quedan sin Entregas. Única excepción al soft delete, como ya hace el script.
- [x] T017 **[Lote 0 global: → lote A]** Extender `apps/api/prisma/seed-demo.ts` (D120, FR-041): para una Persona de demo, ~25 avisos (para ver el paginado) mezclando leídos y sin leer, uno por cada evento de la 004 con destinatario persona/discipulador y uno de `persona.cuenta_activada` (con `params` válidos); dos manuales enviados por el Admin de demo (uno con título de 80 caracteres con tildes y eñes, uno con mensaje de 1000 caracteres con saltos de línea); uno importante con una Entrega `email` `fallida` (`ultimoError = 'ENVIO_FALLIDO'`) y otra `pendiente`. Idempotente.

**Checkpoint**: lote 0 en verde (`pnpm --filter api run test`, `pnpm --filter api run test:e2e`); a partir de acá los lotes A–D pueden ir en paralelo.

---

## Phase 3: User Story 1 — Ver mis avisos y llegar a lo que cambió (P1) 🎯 MVP — lote A

**Goal**: la pestaña Avisos lista, marca y lleva a destino; la barra muestra el contador.

**Independent Test**: con el seed (o avisos creados por API), entrar a `/avisos`, ver orden y
contador, tocar uno y llegar a su destino con el contador una unidad más bajo.

### Tests

- [x] T018 [P] [US1] Test de integración de la API de Avisos en `apps/api/test/integration/avisos.integration-spec.ts`: `GET /avisos` devuelve solo las Entregas `app` propias, `createdAt desc`, de a 20, con `destino` del catálogo (automática) o `/avisos/{id}` (manual), `params` y `extracto` (140 caracteres sin cortar palabras); `?pagina=99` devuelve la última; `GET /avisos/sin-leer` cuenta solo las propias sin leer; `GET /avisos/:id` y `PATCH /avisos/:id/leido` de otra Persona → `404 NO_ENCONTRADO`; `PATCH` dos veces conserva la primera `leidaEn`; `POST /avisos/leer-todos` devuelve `{ marcados }` y no toca las de otra Persona; sin sesión → 401. (FR-001, FR-003, FR-004, FR-007, FR-008, US1-8)
- [x] T019 [P] [US1] E2E en `apps/web/e2e/avisos.spec.ts` (`@celular`, 360 px), con avisos creados por API para una Persona `e2e-`: (1) la pestaña muestra el número y el texto accesible "3 avisos sin leer" (US1-1); (2) los sin leer dicen "Sin leer" con ícono (US1-1); (3) tocar uno automático lleva a `/mi-camino` en un toque y al volver el contador bajó (US1-2, SC-003); (4) tocar el manual muestra el mensaje completo con saltos de línea (US1-3); (5) "Marcar todos como leídos" saca el contador y muestra la confirmación (US1-4); (6) Persona sin avisos ve el estado vacío con "Ir a Mi camino" (US1-5); (7) con 25 avisos, "Página 1 de 2" y Siguiente es un enlace con `?pagina=2` (US1-6); (8) la lista y el contador se piden desde el servidor (Server Components), así que Playwright no puede interceptarlos: el e2e cubre el error de "Marcar todos como leídos" interceptando su pedido del cliente (mensaje con "Reintentar" y código de referencia, el contador no cambia), y el error de carga de la lista y del contador (US1-7) se verifica en el escenario 12 de `quickstart.md` con la API apagada (T066); (9) más de 99 sin leer → "99+" con el número real en el texto accesible (edge case); (10) `axe` sin violaciones en claro y oscuro en `/avisos` y `/avisos/[id]` (SC-008); (11) los textos de los avisos y botones miden 16 px y el botón 44 px de alto (D150, FR-009).
- [x] T020 [P] [US1] Unit test del recorte del extracto y de la fecha relativa en `apps/api/test/unit/avisos-extracto.spec.ts` (si la fecha relativa se arma en la web, test en el lugar donde vivan los helpers de la web): mensaje corto queda entero; 141+ caracteres corta en el último espacio y agrega "…"; mensaje sin espacios corta a 140. (FR-002)

### Implementation

- [x] T021 [US1] Crear `apps/api/src/notificaciones/avisos.service.ts` y `avisos.controller.ts` según contracts/avisos-api.md: `GET /avisos?pagina=`, `GET /avisos/sin-leer` (usa el índice parcial), `GET /avisos/:id`, `PATCH /avisos/:id/leido` (`UPDATE … SET "leidaEn" = now() WHERE id = $1 AND "personaId" = $2 AND canal = 'app' AND "leidaEn" IS NULL`, después lee el destino; 404 si la Entrega no es de la Persona), `POST /avisos/leer-todos`. `destino` con `CATALOGO_AVISOS[evento].destino(params)`. Select explícito; DTOs de `shared-types`. Swagger. (FR-001, FR-003, FR-004, FR-007, FR-008)
- [x] T022 [US1] Contador en la barra: en `apps/web/src/app/(app)/layout.tsx` pedir `GET /avisos/sin-leer` sin caché y pasar `sinLeer: number | null` a `apps/web/src/components/nav-app-bar.tsx`, que lo muestra junto al ícono de Avisos (`"99+"` por encima de 99) con un `<span className="sr-only">` "{n} avisos sin leer"; `null` (falló) → sin número. Colores de token para el globo (fondo `primary` o el token que corresponda de `docs/17`, con contraste medido en los dos temas; si no existe un token para "insignia", agregarlo al tema, no escribir el color). También en la variante de escritorio de la barra. (FR-005, D81, D118)
- [x] T023 [US1] Reescribir `apps/web/src/app/(app)/avisos/page.tsx` (Server Component): título desde `next-intl` (hoy está fijo en el código), lista de tarjetas (cada una un `<a href="/avisos/{id}/ir">` real con título y detalle de `avisos.eventos.<evento>` interpolando `params`, o título y extracto si es manual; fecha relativa con `<time dateTime>` y la fecha completa en `title`/texto accesible; "Sin leer" con ícono + texto; "Importante" no se distingue en la web), `Paginacion` de `packages/ui` con enlaces `?pagina=`, redirect si la página pedida no es la que devolvió la API (`docs/15` punto 5), estado vacío con `EstadoVacio` + enlace a Mi camino, y la acción secundaria "Marcar todos como leídos" (componente cliente con `Button` + `useEnvio`, toast breve con `aria-live`, `router.refresh()`), visible solo si hay sin leer. Agregar `loading.tsx` (esqueleto de 5 tarjetas) y `error.tsx` (mensaje simple, "Reintentar", código de referencia). Diseño a 360 px, 16 px, 44 px (D150). (FR-001, FR-002, FR-004, FR-006, FR-009)
- [x] T024 [US1] Crear `apps/web/src/app/(app)/avisos/[id]/ir/route.ts` (Route Handler): llama a `PATCH /avisos/{id}/leido` con la sesión y responde `303` al `destino`; si la API falla o responde 404, `303` a `/avisos`. Sin JS del lado del cliente. (FR-003, research #9)
- [x] T025 [US1] Crear `apps/web/src/app/(app)/avisos/[id]/page.tsx` (+ `loading.tsx`, `error.tsx`, `not-found` vía `notFound()` ante 404): miga de pan "Avisos" (`docs/15` §Miga de pan), título como `h1`, fecha, mensaje completo con `white-space: pre-line` y como texto plano (sin volver clickeables los enlaces, edge case), y para un automático su detalle + enlace "Ver" a su destino. Si llega sin leer (entrada por URL directa), marcarlo leído desde el servidor. (FR-003, FR-006, FR-009)
- [ ] T026 [US1] Checklist de `docs/15-guia-ux-ui.md` (D114) para la pantalla **Avisos** (`/avisos`): una acción principal (abrir un aviso) y "Marcar todos" como secundaria; orden de botones; cuatro estados; `useEnvio` en "Marcar todos"; feedback según `docs/16` (toast + cambio visible); se entiende qué pasa al tocar; tono; celular a 360 px con 16 px / 44 px (D150), teclado y lector de pantalla (cada tarjeta es un enlace con nombre accesible que incluye "Sin leer"); contraste claro/oscuro incluido `hover` (H-56). Anotar el resultado en el PR.
- [ ] T027 [US1] Checklist de `docs/15` (D114) para la pantalla **Aviso completo** (`/avisos/[id]`): mismos puntos que T026, con la miga de pan y el enlace "Ver" como acción principal en los automáticos.
- [ ] T028 [US1] Checklist de `docs/15` (D114) para la **barra de navegación de la app** modificada (contador): texto accesible, no solo color (D81), contraste del globo en los dos temas, tamaño táctil del ítem sin cambios, `aria-current` intacto.

**Checkpoint**: US1 se demuestra con el seed sin depender de ninguna otra historia.

---

## Phase 4: User Story 2 — Que el sistema avise solo cuando algo cambia (P1) — lote B

**Goal**: la 004 y la activación de menores producen avisos reales por el mecanismo único.

**Independent Test**: aceptar una propuesta y rechazar una Solicitud con la 004; cada Persona tiene
su aviso con texto y destino del catálogo; forzar un rollback no deja aviso.

### Tests

- [x] T029 [P] [US2] Actualizar los tests de la 004 que hoy espían `EventosDiscipuladoService` (`apps/api/test/unit/*.spec.ts` que lo usan, y los `*.integration-spec.ts` de discipulado) para que afirmen, por cada transición, que se llamó a `NotificacionesService.emitir(tx, …)` con el nombre nuevo (`discipulado.*`) y el `a`/`datos` de la tabla de research #12 — en el **mismo commit** que el cambio de cada servicio (T031–T035, CLAUDE.md). Agregar en `apps/api/test/integration/discipulado-avisos.integration-spec.ts`: aceptar una propuesta crea el aviso importante de la Persona (`app` + `email` si tiene email) y el `propuesta_nueva` previo creó el del Discipulador (US2-1, US2-3); rechazar crea el importante sin el motivo en `params` (US2-2, FR-013); declinar no crea ningún aviso (US2-6, FR-015); una transición que falla después de emitir no deja aviso (US2-4). (FR-018)

### Implementation

- [x] T030 [US2] Borrar `apps/api/src/discipulado/eventos.ts`, `EventosDiscipuladoService` de `discipulado.module.ts` (importar `NotificacionesModule`) y `packages/shared-types/src/eventos-discipulado.ts` (el reexport de T003), y reemplazar `apps/api/test/unit/eventos-discipulado.spec.ts` por lo que cubre T012. (FR-018)
- [x] T031 [US2] `apps/api/src/discipulado/propuestas.service.ts`: mover cada emisión adentro de su `$transaction` como `await this.notificaciones.emitir(tx, { nombre: 'discipulado.…', a, datos })` (sin el arreglo `eventos` que se emitía después) y, después de confirmar, `if (hayEmails) this.envioEmails.empujar()` (si `EnvioEmailsService` todavía no existe porque el lote C espera a la 007, dejar la llamada detrás de una interfaz opcional que hoy no hace nada y que T040 conecta). Commit propio con sus tests. (FR-011, FR-018)
- [x] T032 [US2] Igual que T031 en `apps/api/src/solicitud-discipulado/solicitud-discipulado.service.ts`. (FR-011, FR-018)
- [x] T033 [US2] Igual que T031 en `apps/api/src/discipulado/baja.service.ts`. (FR-011, FR-018)
- [x] T034 [US2] Igual que T031 en `apps/api/src/discipulado/finalizacion.service.ts`. (FR-011, FR-018)
- [x] T035 [US2] Igual que T031 en `apps/api/src/discipulado/reasignacion.service.ts`. (FR-011, FR-018)
- [x] T036 [US2] `apps/api/src/persona/persona.service.ts` → `activar(id, dto)`: dentro de su transacción, `emitir(tx, { nombre: 'persona.cuenta_activada', a: { tipo: 'persona', personaId: id }, datos: { personaId: id } })` **después** de que la Persona quedó `activa` (si no, `resolverDestinatarios` la filtraría). Test de integración en `apps/api/test/integration/personas.integration-spec.ts`: activar crea un aviso importante para la Persona y no lo duplica si se reintenta (clave). (FR-019, US2-7)
- [x] T037 [US2] Verificar con `grep` que ningún archivo fuera de `apps/api/src/notificaciones/` escribe en `prisma.notificacion` o `prisma.entregaNotificacion` y dejarlo como test en `apps/api/test/unit/notificaciones-un-solo-escritor.spec.ts` (lee los fuentes y falla si aparece otro escritor). (FR-010, Principio XI)

**Checkpoint**: la 004 sigue verde en las tres suites, con avisos reales.

---

## Phase 5: User Story 3 — Recibir por mail lo importante (P1) — lote C (requiere la 007 en `main`)

**Goal**: las Entregas `email` salen con reintentos, sin duplicar, sin datos sensibles.

**Independent Test**: resolver una Solicitud de una Persona con email y otra sin email; un solo mail
en Mailpit; con Mailpit apagado, reintento y estado final.

### Tests

- [x] T038 [P] [US3] Unit test de `plantillaAviso` en `apps/api/test/unit/plantilla-aviso.spec.ts`: el HTML tiene `lang`, ancho máximo 480 px, un solo enlace (el botón) con la URL absoluta, el logo con `alt`, el pie; el texto plano dice lo mismo con la URL escrita; para **cada** evento importante del catálogo, el asunto en `es` no contiene "bautismo", "rechaz", "baja", ni placeholders de Persona (SC-006, FR-021); para una manual, el asunto es el título. Y en `apps/api/test/unit/catalogo-avisos-textos.spec.ts` (T015) sumar: cada evento importante tiene `avisos.<nombre>.asunto|titulo|parrafos|boton` en `apps/api/src/email/mensajes/es.json`. (FR-021, FR-040)
- [x] T039 [P] [US3] Test de integración del envío en `apps/api/test/integration/envio-emails.integration-spec.ts` con `EmailServiceFalso`: (a) una Entrega pendiente → `enviada` con `enviadaEn` y un mensaje al email vigente (cambiar el email antes de procesar, FR-025, US3-6); (b) `EmailServiceFalso` que lanza → `intentos = 1`, `proximoIntentoEn ≈ now + 1 min`, `ultimoError = 'ENVIO_FALLIDO'`; al quinto fallo → `fallida` (FR-022, US3-4); (c) Persona sin email o inactiva al momento de enviar → `fallida` con `SIN_EMAIL` / `PERSONA_INACTIVA` sin llamar al servicio (FR-025); (d) dos `procesarPendientes()` concurrentes sobre las mismas 10 Entregas → 10 mails, no 20 (FR-023); (e) un aviso normal no crea Entrega email (US3-2); (f) Persona sin email no tiene Entrega email y sí `app` (US3-3); (g) el log del fallo tiene solo `entregaId`, `intento`, `tipo` (FR-024); (h) toda Entrega email termina `enviada` o `fallida` después de procesar con el reloj adelantado más allá de la última espera (SC-002).
- [x] T040 [P] [US3] E2E en `apps/web/e2e/avisos-email.spec.ts`: rechazar por API la Solicitud de Vida Nueva de una Persona `e2e-` con email; en menos de 2 minutos (polling de Mailpit con el helper generalizado `leerMailsDeMailpit(para)`) llega **un** mail con asunto "Hay novedades sobre tu pedido", versión de texto, y su botón lleva a `http://localhost:3011/mi-camino` (puerto de e2e, D124); la acción de rechazar respondió sin esperar al mail (tiempo de respuesta < 1 s con un `EmailService` lento simulado en la integración, US3-5). (SC-001, US3-1, US3-5)

### Implementation

- [x] T041 [US3] Crear `apps/api/src/email/plantillas/aviso.ts` con `plantillaAviso({ asunto, titulo, parrafos, textoBoton, url, idioma })` según contracts/email-aviso.md (tabla de una columna, estilos en línea, `COLORES_EMAIL` de la 007, ancho máximo 480 px, botón ≥ 44 px, logo `${WEB_URL}/marca/logo-email.png` con `alt`, pie "Te escribimos porque es un aviso importante sobre tu camino en la iglesia" + dirección, texto plano equivalente). Agregar `avisos.<nombre>.{asunto,titulo,parrafos,boton}` a `apps/api/src/email/mensajes/es.json` para cada evento importante del catálogo y `avisos.manual.{boton,pie}`. Agregar `apps/web/public/marca/logo-email.png` (PNG ≤ 20 KB, generado desde `docs/marca` / `logo-oscuro`). (FR-021)
- [x] T042 [US3] Crear `apps/api/src/notificaciones/envio-emails.service.ts` según research #5 y contracts/email-aviso.md: `procesarPendientes(lote = 20)` (reserva con `SELECT … FOR UPDATE SKIP LOCKED` + `proximoIntentoEn = now() + 10 min` en una transacción corta; por cada una lee email, `estado`, `activo` e `idiomaPreferido` vigentes; arma con `plantillaAviso` — automática desde `mensajes/<idioma>.json` con fallback a `es`, manual con título/mensaje; `EmailService.enviar`; actualiza `enviada` / reintento con `ESPERAS_REINTENTO_EMAIL_MS[intentos-1]` / `fallida` al llegar a `MAX_INTENTOS_EMAIL`) y `empujar()` (`setImmediate`, sin propagar errores). Conectar la interfaz opcional de T031 a este servicio. (FR-020, FR-022, FR-023, FR-024, FR-025)
- [x] T043 [US3] Crear `apps/api/src/tareas-programadas/tareas-programadas.module.ts`: `ScheduleModule.forRoot()` solo si `TAREAS_PROGRAMADAS !== 'false'`; una tarea `@Interval(30_000)` que llama a `EnvioEmailsService.procesarPendientes()`. Crear `apps/api/scripts/correr-tarea.ts` + script `tareas:correr` en `apps/api/package.json` (`emails`, y `recordatorios` en T056). Registrar en `app.module.ts`. (FR-022, FR-038, research #7)
- [x] T044 **[Ya generalizado por la 007 en `scripts/e2e-mailpit.ts` (`mensajesPara`, `esperarMensaje`): se usa tal cual]** [US3] Generalizar el helper de Mailpit de la 007 en `apps/web/e2e/helpers.ts` (y el de `apps/backoffice/e2e/helpers.ts` si existe aparte) a `leerMailsDeMailpit(para, { desde })` sin duplicarlo (Principio XI: si hay que compartirlo entre las dos apps, moverlo a `scripts/` como `e2e-base-datos.cjs`).

**Checkpoint**: US3 se prueba sola con cualquier aviso importante (la 004 o uno manual por API).

---

## Phase 6: User Story 4 — Mandar un aviso de la iglesia desde el backoffice (P2) — lote D

**Goal**: el Admin manda avisos manuales con conteo previo; el Admin y el Pastor ven historial,
detalle y mails que no salieron.

**Independent Test**: como Admin, aviso importante a un Grupo con 3 inscriptos (2 con email):
conteo, confirmación, historial, 3 avisos, 2 mails.

### Tests

- [x] T045 [P] [US4] Test de integración de la API en `apps/api/test/integration/notificaciones-manuales.integration-spec.ts`: `POST /notificaciones/destinatarios` cuenta `{ personas, conEmail }` igual que lo que después crea el envío (mismo grupo); `POST /notificaciones` crea la manual con `creadoPorId` de la sesión, Entregas `app` para todos y `email` para los que tienen email si es importante (US4-1, US4-2); título vacío / 81 caracteres / mensaje de 1001 caracteres / grupo sin `alcanceId` → `400 VALIDACION` con cada código de campo (US4-3, FR-027, FR-034); Grupo sin Inscripciones activas → `409 NOTIFICACION_SIN_DESTINATARIOS` (US4-5); Grupo finalizado o inexistente → `409 ALCANCE_NO_DISPONIBLE`; `ministerio` sin la 009 → `409 ALCANCE_NO_DISPONIBLE`; Pastor → `GET` 200 y `POST` 403; Discipulador y Líder de curso → `POST` 403 (US4-7, US4-8, FR-032); `GET /notificaciones` lista solo manuales con `destinatarios` y `leidas`; `GET /notificaciones/:id` trae `emails` con `personasFallidas` (US4-6, FR-030); `GET /notificaciones/mails-fallidos` lista solo automáticas `fallida` de los últimos 30 días y nunca el email (FR-031); no existen `PATCH`/`DELETE` (404/405, FR-033).
- [x] T046 [P] [US4] E2E en `apps/backoffice/e2e/notificaciones.spec.ts`: como Admin, "Enviar un aviso" → "A un grupo" → elegir el Grupo fixture → ver "Le va a llegar a 3 personas"; marcar importante → advertencia y "2 lo reciben también por mail" (US4-1, US4-2); enviar vacío → errores por campo + resumen con foco (US4-3); confirmar → botón "Enviando…" bloqueado, doble clic no duplica, el aviso aparece primero en la tabla con toast (US4-4, H-57); abrir el detalle → 3 destinatarios, mails enviados según Mailpit (US4-6); el aviso aparece en `/avisos` de una de las inscriptas (en `apps/web`, o por API); todo en menos de 1 minuto de punta a punta (SC-004); como Pastora, sin "Enviar un aviso" (US4-7); `axe` claro y oscuro en listado, diálogo abierto y detalle (SC-008). Sumar `/notificaciones` y `/notificaciones/[id]` a `axe-todas-las-rutas.spec.ts` si esa lista es explícita.

### Implementation

- [x] T047 [US4] Crear `apps/api/src/notificaciones/notificaciones.controller.ts` + DTOs (`class-validator` con `TITULO_AVISO_MAX`/`MENSAJE_AVISO_MAX`, `trim`) y `NotificacionesService.crearManual(autorId, datos)` según contracts/notificaciones-api.md: `GET /notificaciones`, `GET /notificaciones/:id`, `POST /notificaciones/destinatarios`, `GET /notificaciones/opciones-alcance` (Grupos `en_curso` con Inscripciones activas; Ministerios activos o `[]` sin la 009), `POST /notificaciones` (una transacción: valida alcance, `resolverDestinatarios`, 0 → `NOTIFICACION_SIN_DESTINATARIOS`, crea Notificación manual + Entregas en una sentencia por canal; después, `empujar()` si es importante), `GET /notificaciones/mails-fallidos`. Estadísticas con `groupBy` sobre `entregas_notificacion` (`notificacionId, canal, estado` y `leidaEn IS NOT NULL`), sin traer filas. `@RequierePermiso('notificaciones.ver' | 'notificaciones.enviar')`. Swagger. (FR-026–FR-033)
- [x] T048 [US4] Reescribir `apps/backoffice/src/app/notificaciones/page.tsx` (+ `loading.tsx`, `error.tsx`, `notificaciones-cliente.tsx`): `TablaDatos` con columnas Título (identifica la fila, siempre visible), A quién le llegó, Importante (ícono `Mail` + texto), Leído por ("{leidas} de {destinatarios}"), Fecha, Quién la mandó — con las prioridades de colapso de `docs/15` §Backoffice (sin scroll horizontal a 320 px); `Paginacion` por URL; filas que llevan al detalle; botón "Enviar un aviso" solo si `puede('notificaciones.enviar')`; estado vacío "Todavía no mandaste ningún aviso" + acción; debajo, sección "Mails que no salieron" (últimos 30 días, Persona con enlace a su perfil, aviso, fecha, motivo en palabras) o un texto "Todos los mails salieron bien". (FR-026, FR-031, FR-032)
- [x] T049 [US4] Diálogo "Enviar un aviso" en `apps/backoffice/src/app/notificaciones/enviar-aviso-dialogo.tsx` con el patrón de alta de Sedes (`AlertDialog` de `packages/ui`): campos Título (con contador y ayuda "Va como asunto del mail si es importante: no pongas datos personales"), Mensaje (`textarea`, contador hasta 1000), "A quién le llega" (radios: A todas las personas / A un grupo / A un ministerio — este deshabilitado con explicación si `ministerios` viene vacío), selector de Grupo o Ministerio según corresponda, casilla "Importante — también se manda por mail" con la advertencia de moderación; conteo en vivo (`POST /notificaciones/destinatarios` con debounce de 300 ms y región `aria-live`); "Enviar" pasa a un paso de confirmación dentro del mismo diálogo ("¿Mandar este aviso a {n} personas?" + "{m} por mail") con "Mandar aviso" (`Button` + `useEnvio`, "Enviando…") y "Volver"; errores por campo con `useValidacionCampos` + `ResumenErrores` (foco al resumen); 409 de alcance sin personas mostrado junto al selector; al terminar, cerrar, `router.refresh()` y toast. Confirmación neutra, no roja (D151). (FR-027, FR-028, FR-029, FR-034)
- [x] T050 [US4] Crear `apps/backoffice/src/app/notificaciones/[id]/page.tsx` (+ `loading.tsx`, `error.tsx`, `notFound()`): miga de pan, título, mensaje completo (`pre-line`, texto plano), autor, fecha, a quién le llegó, "{leidas} de {destinatarios} lo leyeron", y si fue importante: enviados / por salir / no se pudieron enviar con la lista de Personas (enlace a su perfil) y la sugerencia "Avisales por otro medio". Sin acciones de edición (FR-033). `requerirPermiso('notificaciones.ver')`. (FR-030, FR-032, FR-033)
- [ ] T051 [US4] Checklist de `docs/15` (D114) para **Notificaciones — listado** (`/notificaciones`): acción principal "Enviar un aviso"; orden de botones; cuatro estados; tabla sin scroll horizontal a 320 px; Pastora en solo lectura; teclado y lector de pantalla; contraste claro/oscuro con `hover` (H-56).
- [ ] T052 [US4] Checklist de `docs/15` (D114) para el **diálogo Enviar un aviso**: una acción principal con verbo concreto ("Mandar aviso"); confirmación con qué pasa después; `useEnvio` y reentrada (H-57); errores por campo + resumen (H-50); feedback según `docs/16` ("Acción del Admin" → toast + cambio en la lista); foco atrapado y Escape; contraste.
- [ ] T053 [US4] Checklist de `docs/15` (D114) para **Notificaciones — detalle** (`/notificaciones/[id]`): cuatro estados; la lista de mails no enviados dice qué hacer; miga de pan; teclado, lector de pantalla y contraste.

**Checkpoint**: US4 se prueba sola (la Persona destinataria ve el aviso si US1 ya está; si no, por API).

---

## Phase 7: User Story 5 — Recordatorios de Eventos (P2) — lote E (requiere la 011 en `main`)

**Goal**: `evento.proximo` y `evento.recordatorio_inscripcion` salen solos, una vez por Evento.

**Independent Test**: Evento mañana con 2 confirmados y 1 pendiente; correr la tarea dos veces; un
aviso por confirmado.

### Tests

- [x] T054 [P] [US5] Test de integración en `apps/api/test/integration/recordatorios-eventos.integration-spec.ts` (con `hoy` inyectado): Evento mañana → aviso normal a cada `confirmada`, ninguno a `pendiente`, `lista_espera` ni `cancelada` (US5-1, FR-035); Evento con `dias_anticipacion_recordatorio = 3` a 3 días → aviso a las Personas activas sin inscripción vigente, ninguno a las inscriptas (US5-2, FR-036); correr dos veces el mismo día → mismos avisos, sin duplicados (US5-3, FR-037, SC-007); sin `requiere_inscripcion` o sin días → nada (US5-4); Evento eliminado/inactivo o lleno sin lista de espera → nada (US5-5); "hoy" a las 23:30 de Argentina usa la fecha civil de Argentina (`hoyEnArgentina`).

### Implementation

- [x] T055 **[Ya en el lote 0 global: los dos destinatarios leen el modelo de la 011]** [US5] Completar en `apps/api/src/notificaciones/destinatarios.ts` los destinatarios `evento_confirmados` y `todas_sin_inscripcion` con el modelo de la 011 (nombres de campos y estados de la 011; research #8), y su caso en T010. (FR-035, FR-036)
- [x] T056 [US5] Crear `apps/api/src/tareas-programadas/recordatorios-eventos.service.ts` con `correr(hoy = hoyEnArgentina())`: busca los Eventos de FR-035 (fecha = hoy + `DIAS_ANTES_EVENTO_PROXIMO`) y FR-036 (fecha − hoy = `dias_anticipacion_recordatorio`, `requiere_inscripcion`, activo, acepta inscripciones), y por cada uno `emitir(tx, …)` con `evento.proximo` / `evento.recordatorio_inscripcion` y `datos` `{ eventoId, evento (nombre), slug, dias }`, una transacción por Evento (si uno falla, los demás siguen; se loguea solo el `eventoId`). Registrarla con `@Cron('0 8 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })` en `tareas-programadas.module.ts` y como `recordatorios` en `tareas:correr`. (FR-035, FR-036, FR-037, FR-038)

---

## Phase 8: User Story 6 — Catálogo de 008, 009, 010 y 011 (P3) — lote F

**Goal**: cada transición de las specs ya mergeadas emite su evento del catálogo.

**Independent Test**: por cada evento conectado, un test de la transición que afirma la emisión, y el
aviso con su destino.

**Regla (research #13)**: hacer solo las tareas de las specs que estén en `main` al implementar este
lote; las de las que no estén, las hace la spec dueña contra el catálogo (y esta tarea se marca como
"pasada a la spec NNN" en el PR).

- [ ] T057 **[Pasada a la spec 008: no está en `main`; su emisión la hace la 008 contra el catálogo. El test `catalogo-avisos-emisores.spec.ts` la empieza a exigir al sacar `008` de la lista]** [P] [US6] **008** (si está en `main`): emitir `vida_servicio.inscripcion_aprobada` / `inscripcion_rechazada` desde la resolución de la Solicitud de Vida de Servicio, `vida_servicio.inscripcion_dada_de_baja` desde la baja, `vida_servicio.completada` por cada Inscripción completada al confirmar la finalización, y `vida_servicio.contenido_liberado` desde la carga de contenido de una semana ya vencida **y** desde una tarea diaria de liberación en `apps/api/src/tareas-programadas/` (FR-038; clave por `cronogramaItemId`). Ajustar `destino` del contenido a la ruta real de la 008. Tests de integración de cada transición en el archivo de tests de la 008 (US6-4, FR-039).
- [x] T058 **[La 009 ya emite sus eventos (verificado por `catalogo-avisos-emisores.spec.ts`); el destinatario `ministerio` y "A un ministerio" del diálogo están conectados. `ministerio.apto_habilitado` no existe en el catálogo del lote 0: ver Preguntas]** [P] [US6] **009** (si está en `main`): emitir `ministerio.postulacion_aprobada` / `postulacion_rechazada` desde la resolución de la Postulación y `ministerio.apto_habilitado` desde la habilitación manual del flag (Flujo 5 paso 3); completar el destinatario `ministerio` (miembros vigentes) en `destinatarios.ts` y habilitar "A un ministerio" en el diálogo (T049) con su test en T045/T046. Tests de cada transición (US6-1, FR-039).
- [ ] T059 **[Pasada a la spec 010: ídem]** [P] [US6] **010** (si está en `main`): emitir `bautismo.solicitud_aceptada` / `solicitud_rechazada` y `bautismo.fecha_asignada` (al sumar a la Persona a un Evento de bautismo, D147; clave `solicitudId:eventoId`). Tests de cada transición (US6-5, FR-039).
- [x] T060 **[La 011 ya emite los suyos: verificado por `catalogo-avisos-emisores.spec.ts`]** [P] [US6] **011** (si está en `main`): emitir `evento.inscripcion_confirmada` (solo pendiente → confirmada por el Admin), `evento.inscripcion_rechazada`, `evento.inscripcion_cancelada_por_admin` (solo si cancela el Admin, D69), `evento.lista_espera_promovida` (Flujo 8 paso 9, con `estadoNuevo`), `evento.pago_verificado` y `evento.pago_rechazado` (D148; si el rechazo libera lugar y promueve, la otra Persona recibe su `lista_espera_promovida` en la misma transacción). Tests de cada transición, incluido que la inscripción confirmada sola no avisa (US6-2, US6-3, FR-039).
- [x] T061 **[Ya en el lote 0 global: `/mis-discipulados`]** [US6] Si la **006** está en `main`: cambiar `destino` de `discipulado.propuesta_nueva` en `CATALOGO_AVISOS` a `/mis-discipulados` de la web app y su caso en T004.

---

## Phase 9: Polish & cierre

- [ ] T062 [P] Revisar con `grep` que ningún texto de interfaz nuevo quedó fijo en el código (`apps/web/src/app/(app)/avisos`, `apps/backoffice/src/app/notificaciones`, `nav-app-bar.tsx`) y que no hay clases de color crudas de Tailwind (D84, D118, H-54).
- [ ] T063 [P] Actualizar `specs/revision-manual/COMO-ARRANCAR.md` con `WEB_URL`, `TAREAS_PROGRAMADAS`, `pnpm --filter api run tareas:correr <emails|recordatorios>` y cómo ver los mails en Mailpit (plan, Cambios a docs al mergear).
- [ ] T064 Aplicar los **Cambios a docs al mergear** de `plan.md` (`docs/04`, `diagrama-er.mermaid`, `docs/16` §1, `docs/07` Flujo 10, `docs/15` glosario, `docs/10`, nota en `specs/004-vida-nueva-discipulado/contracts/eventos.md`) y numerar las **Decisiones nuevas** en `docs/05-decisiones.md` mirando el último número usado (D89, D103), con las respuestas de Echu a las Preguntas si ya las dio.
- [ ] T065 Correr las tres suites en verde: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice` (Constitución, Definición de terminado). Un test roto por un cambio de modelo se arregla en el mismo commit (CLAUDE.md).
- [ ] T066 Recorrer `quickstart.md` de punta a punta (escenarios 1–12; el 10 solo con la 011) en claro y oscuro y a 360 px, y dejar el resultado en el PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)** → **Lote 0 (T003–T017)** → lotes A, B, C, D en paralelo → E (con 011) → F
  (con las specs que estén) → cierre (T062–T066).
- **Lote C** además depende de la **007** en `main`. **Lote E** de la **011**. **Lote F** de cada
  spec por separado; T061 de la **006**.

### User Story Dependencies

- **US1** (lote A): solo lote 0. Se demuestra con el seed.
- **US2** (lote B): solo lote 0. Los mails de sus avisos importantes quedan `pendiente` hasta el
  lote C (T031 deja el `empujar()` detrás de una interfaz opcional).
- **US3** (lote C): lote 0 + 007. Se prueba con cualquier aviso importante (de US2 o de US4).
- **US4** (lote D): lote 0. La Persona destinataria lo ve en la web si US1 está; si no, se verifica
  por API.
- **US5** (lote E): lote 0 + 011.
- **US6** (lote F): lote 0 + cada spec dueña.

### Within Each User Story

- Tests y su implementación en el mismo commit cuando el test cambia por un cambio de modelo
  (CLAUDE.md); si no, test primero.
- API antes que pantalla; checklist de `docs/15` al final de cada pantalla.

## Lotes (sesiones paralelas que no se pisan)

| Lote | Tareas | Toca | Depende de |
|---|---|---|---|
| **0 — compartido** | T001–T017 | `packages/shared-types`, `schema.prisma` + migración, `src/notificaciones/{module,service,destinatarios}`, mensajes de las dos apps, `limpiar-e2e`, `seed-demo` | — |
| **A — Avisos (web)** | T018–T028 | `src/notificaciones/avisos.*`, `apps/web/src/app/(app)/avisos/**`, `layout.tsx`, `nav-app-bar.tsx` | 0 |
| **B — Conexión 004 + activar** | T029–T037 | `src/discipulado/**`, `src/solicitud-discipulado/**`, `src/persona/persona.service.ts` y sus tests | 0 |
| **C — Mail** | T038–T044 | `src/email/plantillas/aviso.ts`, `src/email/mensajes/es.json`, `src/notificaciones/envio-emails.service.ts`, `src/tareas-programadas/**`, `scripts/correr-tarea.ts`, helpers e2e de Mailpit, `apps/web/public/marca/logo-email.png` | 0, 007 |
| **D — Backoffice** | T045–T053 | `src/notificaciones/notificaciones.controller.ts`, `apps/backoffice/src/app/notificaciones/**` | 0 |
| **E — Recordatorios** | T054–T056 | `src/tareas-programadas/recordatorios-eventos.service.ts`, `destinatarios.ts` (dos casos) | 0, C (módulo de tareas), 011 |
| **F — Otras specs** | T057–T061 | archivos de 006/008/009/010/011 + entradas del catálogo | 0 y cada spec |
| **Cierre** | T062–T066 | docs, suites | todos los anteriores que se hayan hecho |

Choques posibles y cómo se evitan: B y C tocan la llamada a `empujar()` (T031 deja la interfaz,
T042 la conecta: C después de B o en el mismo PR); A y D agregan controladores distintos dentro de
`src/notificaciones/` (archivos separados, `notificaciones.module.ts` lo crea el lote 0 con los dos
controladores ya declarados vacíos).

## Parallel Example: lote 0 y US1

```bash
# Lote 0, después de T003 y T007/T008:
T004 (test catálogo) · T010 (test destinatarios) · T012 (test emitir) · T014 (mensajes) · T015 (test textos)
# US1:
T018 (integración /avisos) · T019 (e2e Avisos) · T020 (unit extracto)  →  T021 → T022/T023/T024/T025
```

## Cobertura de requisitos y criterios

| Req / criterio | Tareas (implementación → test) |
|---|---|
| FR-001 | T021, T023 → T018, T019 |
| FR-002 | T014, T023 → T019, T020 |
| FR-003 | T021, T024, T025 → T018, T019 |
| FR-004 | T021, T023 → T018, T019 |
| FR-005 | T022 → T019 |
| FR-006 | T014, T023, T025 → T019 |
| FR-007 | T021 → T018 |
| FR-008 | T021 → T018 |
| FR-009 | T023, T025 → T019, T026, T027 |
| FR-010 | T003, T011 → T012, T037 |
| FR-011 | T011, T031–T035 → T013, T029 |
| FR-012 | T003, T011 → T004 |
| FR-013 | T003, T011 → T012, T015, T029 |
| FR-014 | T011 → T013, T036, T054 |
| FR-015 | T009, T011 → T010, T012, T029 |
| FR-016 | T009 → T010 |
| FR-017 | T011 → T012, T045 |
| FR-018 | T030–T035 → T029 |
| FR-019 | T036 → T036 |
| FR-020 | T042 → T039 |
| FR-021 | T041 → T038, T040 |
| FR-022 | T042, T043 → T039 |
| FR-023 | T042 → T039 |
| FR-024 | T011, T042 → T012, T039 |
| FR-025 | T042 → T039 |
| FR-026 | T047, T048 → T045, T046 |
| FR-027 | T047, T049 → T045 |
| FR-028 | T049 → T046 |
| FR-029 | T047, T049 → T045, T046 |
| FR-030 | T047, T050 → T045, T046 |
| FR-031 | T047, T048 → T045 |
| FR-032 | T006, T047, T048 → T045, T046 |
| FR-033 | T047, T050 → T045 |
| FR-034 | T005, T049 → T045, T046 |
| FR-035 | T055, T056 → T054 |
| FR-036 | T055, T056 → T054 |
| FR-037 | T043, T056 → T054 |
| FR-038 | T043, T056, T057 → T054 |
| FR-039 | T003, T057–T060 → T004, tests de cada transición en T057–T060 |
| FR-040 | T014, T041 → T015, T038 |
| FR-041 | T017 → T066 (revisión a mano con el seed, D120) |
| SC-001 | T011, T042 → T013, T040 |
| SC-002 | T042 → T039 |
| SC-003 | T024 → T019 |
| SC-004 | T049 → T046 |
| SC-005 | T011 → T013 |
| SC-006 | T014, T041 → T015, T038 |
| SC-007 | T056 → T054 |
| SC-008 | T023, T025, T048–T050 → T019, T046 |
| SC-009 | T003 → T015 |

## Implementation Strategy

### MVP

Lote 0 + lote A (US1) + lote B (US2): la Persona ve en la app los avisos reales de la 004 y de la
activación, con texto y destino. Es demostrable sin mail y sin backoffice.

### Entrega incremental

1. MVP (0 + A + B).
2. Lote C apenas la 007 esté en `main` (los importantes ya emitidos en el MVP quedaron `pendiente` y
   salen solos cuando arranca el proceso).
3. Lote D (manuales).
4. Lote E con la 011; lote F a medida que se mergean 006, 008, 009, 010 y 011.
5. Cierre: tres suites, docs, revisión manual (D152).

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- Commits en español, uno por cambio coherente; terminar con las líneas de `CLAUDE.md`. No pushear
  salvo pedido.
