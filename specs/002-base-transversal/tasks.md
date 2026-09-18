# Tasks: Base Transversal de la App

**Input**: Design documents from `/specs/002-base-transversal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluidos donde agregan valor real (Constitución Principio VI: lógica con ramas → unit;
lo que depende de la base de datos → integración; flujos críticos → e2e con axe) — no hay tarea de
test por cada página estática o de estado vacío.

**Organization**: Fase 1 (Setup) y Fase 2 (Foundational) son compartidas por las 8 historias de
`spec.md`. Desde la Fase 3 en adelante, cada fase es una historia de usuario, en su orden de
prioridad (P1, P1, P2, P2, P2, P3, P3, P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: US1–US8, mapeadas a las historias de `spec.md`
- Cada tarea incluye la ruta de archivo exacta

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Crear el paquete de workspace `packages/ui` (`packages/ui/package.json`, `"name": "@vida-sobrenatural/ui"`, mismo patrón que `packages/shared-types/package.json`)
- [X] T002 [P] Agregar `next-intl` y `next-themes` a `apps/web/package.json` y `apps/backoffice/package.json`
- [X] T003 [P] Agregar `eslint-plugin-jsx-a11y` a las `devDependencies` de `apps/web/package.json` y `apps/backoffice/package.json`
- [X] T004 [P] Agregar `@axe-core/playwright` a `apps/web/package.json` (devDependencies)
- [X] T005 [P] Agregar `nestjs-pino` (+ `pino-http`) a `apps/api/package.json`
- [X] T006 [P] Agregar `@sentry/nextjs` a `apps/web/package.json` y `apps/backoffice/package.json`
- [X] T007 [P] Agregar `@sentry/nestjs` a `apps/api/package.json`
- [X] T008 Correr `pnpm install` en la raíz del monorepo para linkear `packages/ui` y las dependencias nuevas de T002-T007

**Checkpoint**: dependencias instaladas y `packages/ui` existe como workspace — listo para Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia de usuario puede empezar hasta terminar esta fase.

- [X] T009 Agregar `enum Idioma { es }`, `enum TemaPreferido { claro oscuro sistema }` y las columnas `idiomaPreferido Idioma @default(es)` / `temaPreferido TemaPreferido @default(sistema)` a `model Persona` en `apps/api/prisma/schema.prisma` (`data-model.md`)
- [X] T010 Generar y aplicar la migración de Prisma para T009 (`apps/api/prisma/migrations/<timestamp>_persona_idioma_tema/`) y correr `prisma generate`
- [X] T011 [P] Crear `packages/shared-types/src/error-code.ts` con el `type ErrorCode` de `data-model.md` (10 valores) y exportarlo desde `packages/shared-types/src/index.ts`
- [X] T012 Extraer el bloque de tokens (`@theme inline`, `:root`, `.dark`) de `apps/web/src/app/globals.css` a `packages/ui/src/styles/theme.css`, agregando los tokens semánticos `success`/`warning` con la paleta neutra provisoria (`research.md` Decisión 2), verificados en contraste 4.5:1/3:1 en ambos modos
- [X] T013 Mover `apps/web/src/lib/utils.ts` y `apps/web/src/components/ui/button.tsx` a `packages/ui/src/lib/utils.ts` y `packages/ui/src/components/ui/button.tsx`, exportados desde `packages/ui/src/index.ts`; borrar las copias duplicadas de `apps/backoffice`
- [X] T014 Actualizar `apps/web/src/app/globals.css` y `apps/backoffice/src/app/globals.css`: reemplazar el bloque de tokens duplicado por `@import "@vida-sobrenatural/ui/theme.css";` + `@source "../../../packages/ui/src/**/*.{ts,tsx}";`
- [X] T015 [P] Agregar `transpilePackages: ['@vida-sobrenatural/ui']` a `apps/web/next.config.ts` y `apps/backoffice/next.config.ts`
- [X] T016 Agregar a `packages/ui/src/components/ui/` los componentes shadcn que van a necesitar las historias siguientes: `sheet`, `navigation-menu`, `dropdown-menu`, `sidebar`, `skeleton`, `sonner` (toasts), `alert-dialog`
- [X] T017 Crear `packages/ui/src/components/estado-vacio.tsx` (mensaje amable + acción sugerida opcional, FR-005), exportado desde `packages/ui/src/index.ts`
- [X] T018 Crear `apps/api/src/common/errors/app-exception.ts` (`AppException extends HttpException`, agrega `code` y `errors?`) — `research.md` Decisión 5
- [X] T019 Crear `apps/api/src/common/errors/all-exceptions.filter.ts` (`@Catch()` global: normaliza `AppException`, errores de `class-validator`, errores de Prisma reconocidos y cualquier otro a Problem Details con `code`/`requestId`) — `contracts/errores.md`
- [X] T020 En `apps/api/src/main.ts`: registrar `nestjs-pino` (`genReqId`, `redact` de `authorization`/`email`/`telefono`/`direccion`) y `app.useGlobalFilters(new AllExceptionsFilter())`
- [X] T021 [P] Test unitario de `AllExceptionsFilter` en `apps/api/test/unit/all-exceptions-filter.spec.ts`: verifica que `AppException`, un error de validación y un error no reconocido producen la forma Problem Details correcta con el `code` esperado
- [X] T022 Agregar `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`) a `apps/web/src/app/providers.tsx` y `apps/backoffice/src/app/providers.tsx`
- [X] T023 Corregir `apps/web/src/app/layout.tsx` y `apps/backoffice/src/app/layout.tsx`: `lang="es"` (hoy `"en"`), agregar el enlace "Saltar al contenido" como primer elemento del `<body>`, y reemplazar el `metadata` genérico ("Create Next App") por uno propio del proyecto
- [X] T024 [P] Crear `apps/web/src/messages/es.json` y `apps/backoffice/src/messages/es.json` con el namespace `errors` prellenado a partir de `ErrorCode` (T011) y un namespace `nav` vacío para los labels de menú
- [X] T025 Configurar `next-intl` (`i18n/request.ts` + `NextIntlClientProvider` de locale fijo `"es"`) en `apps/web/src/app/providers.tsx` y `apps/backoffice/src/app/providers.tsx`

**Checkpoint**: base lista — `packages/ui`, tokens, catálogo de errores, filtro global, providers de tema/idioma. Las 8 historias pueden empezar.

---

## Phase 3: User Story 1 - Navegar la app según quién soy (Priority: P1) 🎯 MVP

**Goal**: los tres menús (web pública, app con sesión, backoffice) existen, filtran por rol donde corresponde, y ninguna sección sin funcionalidad rompe la navegación.

**Independent Test**: ver `spec.md` Historia 1 — entrar sin sesión, con sesión, y al backoffice con distintos roles, verificando menú y estados vacíos.

- [X] T026 [P] [US1] Crear `apps/web/src/config/nav-publica.ts` (array tipado `ItemNavPublica`, `contracts/nav-config.md`) con Nosotros/Primeros pasos/Ministerios/Eventos/Visitanos + Dar/Ingresar
- [X] T027 [P] [US1] Crear `apps/web/src/config/nav-app.ts` (array tipado `ItemNavApp`) con Inicio/Mi camino/Eventos/Avisos/Perfil
- [X] T028 [P] [US1] Crear `apps/backoffice/src/config/nav.ts` (array tipado `ItemNavBackoffice` con `roles`) con los ítems de Admin/Discipulador/Líder de curso/Pastor de `docs/14-navegacion.md`
- [X] T029 [US1] Crear `apps/web/src/app/(publica)/layout.tsx`: header con menú de `nav-publica.ts` (desktop) + menú hamburguesa (celular, T049 lo hace accesible), botones Dar/Ingresar, footer con las mismas secciones + dirección/horarios/teléfono/redes, `aria-current="page"` en el ítem activo (FR-001, FR-002, FR-006, FR-009)
- [X] T030 [US1] Crear `apps/web/src/app/(publica)/page.tsx` (Inicio público)
- [X] T031 [US1] Crear `apps/web/src/app/(publica)/nosotros/page.tsx`
- [X] T032 [US1] Crear `apps/web/src/app/(publica)/primeros-pasos/page.tsx` reutilizando el contenido de `apps/web/src/app/bienvenida/page.tsx`; borrar `apps/web/src/app/bienvenida/` (FR-007 — sin redirección, ver Clarifications del spec)
- [X] T033 [US1] Crear `apps/web/src/app/(publica)/visitanos/page.tsx` reutilizando la lógica de `apps/web/src/app/sede/page.tsx`; borrar `apps/web/src/app/sede/` (FR-008 — sin redirección)
- [X] T034 [P] [US1] Crear `apps/web/src/app/(publica)/ministerios/page.tsx` usando `<EstadoVacio />`
- [X] T035 [P] [US1] Crear `apps/web/src/app/(publica)/eventos/page.tsx` usando `<EstadoVacio />`
- [X] T036 [P] [US1] Crear `apps/web/src/app/(publica)/dar/page.tsx` usando `<EstadoVacio />`
- [X] T037 [US1] Crear `apps/web/src/app/(app)/layout.tsx`: barra de navegación (inferior en celular) con `nav-app.ts`, protegida por sesión (sin sesión → redirige a Ingresar) (FR-003)
- [X] T038 [US1] Crear `apps/web/src/app/(app)/inicio/page.tsx`
- [X] T039 [P] [US1] Crear `apps/web/src/app/(app)/mi-camino/page.tsx` usando `<EstadoVacio />`
- [X] T040 [P] [US1] Crear `apps/web/src/app/(app)/avisos/page.tsx` usando `<EstadoVacio />`
- [X] T041 [US1] Crear `apps/web/src/app/(app)/perfil/page.tsx` (esqueleto — el contenido de datos/tema se completa en US5)
- [X] T042 [US1] Actualizar `apps/backoffice/src/app/layout.tsx`: sidebar a partir de `nav.ts` filtrado/unido por `session.user.rol` (FR-004)
- [X] T043 [P] [US1] Crear páginas de estado vacío del rol Admin en `apps/backoffice/src/app/{personas,solicitudes,grupos,eventos,notificaciones,catalogos}/page.tsx`
- [X] T044 [P] [US1] Crear páginas de estado vacío del rol Discipulador en `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad}/page.tsx`
- [X] T045 [P] [US1] Crear página de estado vacío del rol Líder de curso en `apps/backoffice/src/app/mis-grupos/page.tsx`
- [X] T046 [US1] Registrar en `nav.ts` (T028) las páginas ya existentes del spec 001 (`apps/backoffice/src/app/sedes/`, `apps/backoffice/src/app/pendientes-tutor/`) dentro del sidebar
- [X] T047 [US1] Test e2e `apps/web/e2e/primeros-pasos-visitanos.spec.ts`: verifica menú público, traslado de contenido a Primeros pasos/Visitanos, `/bienvenida` y `/sede` devuelven "no encontrado", y estados vacíos de Ministerios/Eventos

**Checkpoint**: Historia 1 completa y testeable de forma independiente.

---

## Phase 4: User Story 2 - Usar la app con teclado o lector de pantalla (Priority: P1)

**Goal**: los tres menús y las pantallas existentes cumplen WCAG 2.2 AA.

**Independent Test**: ver `spec.md` Historia 2 — navegación completa por teclado, lector de pantalla, contraste en ambos modos.

- [X] T048 [US2] Verificar que el enlace "Saltar al contenido" (T023) mueve el foco al `<main>` en `apps/web/src/app/(publica)/layout.tsx`, `apps/web/src/app/(app)/layout.tsx` y `apps/backoffice/src/app/layout.tsx` (FR-010)
- [X] T049 [US2] Implementar el menú hamburguesa de `apps/web/src/app/(publica)/layout.tsx` con el componente `sheet` de `packages/ui` (T016): `aria-expanded`, cierre con Escape, foco atrapado mientras está abierto (FR-014)
- [X] T050 [US2] Revisar y corregir `aria-current="page"` en los tres menús (T029, T037, T042) contra la ruta activa real (FR-009)
- [X] T051 [P] [US2] Activar `jsx-a11y.flatConfigs.recommended` como `error` en `apps/web/eslint.config.mjs` y `apps/backoffice/eslint.config.mjs`; corregir las violaciones que reporte sobre el código de este spec
- [X] T052 [US2] Verificar objetivos táctiles ≥44×44px e ícono+texto en la barra de `apps/web/src/app/(app)/layout.tsx` (FR-015)
- [X] T053 [US2] Agregar `@axe-core/playwright` a `apps/web/e2e/registro-bienvenida.spec.ts`, corriendo el flujo en modo claro y en modo oscuro (FR-013)
- [X] T054 [US2] Agregar `@axe-core/playwright` a `apps/web/e2e/primeros-pasos-visitanos.spec.ts` (T047), en ambos modos
- [ ] T055 [US2] Completar `specs/002-base-transversal/checklists/accesibilidad-manual.md` (color, orden de tabulación/foco en las tres superficies, saltar al contenido, lector de pantalla en ambos temas) — cubre lo que `@axe-core/playwright` (T053/T054) no detecta automáticamente
  - **PENDIENTE**: requiere una pasada manual humana con lector de pantalla (VoiceOver/TalkBack) y navegación solo por teclado en las tres superficies, en modo claro y oscuro. No es automatizable; queda a cargo de una persona revisora sobre `accesibilidad-manual.md`.

**Checkpoint**: Historia 2 completa — automatizable 100% verde; T055 (manual) queda abierta a propósito.

---

## Phase 5: User Story 3 - Recibir feedback claro de cada acción (Priority: P2)

**Goal**: las pantallas existentes tienen sus cuatro estados y los avisos son accesibles.

**Independent Test**: ver `spec.md` Historia 3 — cortar la API y verificar carga/vacío/error/éxito.

- [X] T056 [P] [US3] Agregar estado de carga (`skeleton` de `packages/ui`) a `apps/web/src/app/(publica)/visitanos/page.tsx` mientras se pide la Sede (FR-016)
- [X] T057 [P] [US3] Revisar `apps/web/src/app/(publica)/primeros-pasos/page.tsx` y aplicar el mismo patrón de estados si corresponde
- [X] T058 [US3] Verificar/corregir que el botón de envío de `apps/web/src/app/registro/page.tsx` quede en estado de carga y bloqueado mientras se procesa (FR-017)
- [X] T059 [US3] Agregar el `Toaster` (`sonner`, de `packages/ui`) a `apps/web/src/app/providers.tsx` y `apps/backoffice/src/app/providers.tsx`, con `aria-live` (FR-018)
- [X] T060 [US3] Crear `packages/ui/src/components/confirm-destructive-dialog.tsx` (basado en `alert-dialog`): nombra lo que se va a afectar y ofrece deshacer cuando es posible (FR-019, para reutilizar en features futuras)

**Checkpoint**: Historia 3 completa.

---

## Phase 6: User Story 4 - Entender un error sin quedar trabado (Priority: P2)

**Goal**: toda la app responde a errores con el formato único y mensajes amables.

**Independent Test**: ver `spec.md` Historia 4 — apagar la API, visitar una URL inexistente, provocar un error de validación.

- [X] T061 [US4] Migrar los `throw` de `apps/api/src/persona/persona.service.ts` a `AppException` con los códigos `EMAIL_DUPLICADO`, `SEDE_INVALIDA`, `CONSENTIMIENTO_REQUERIDO`, `PERSONA_NO_PENDIENTE_TUTOR` (`data-model.md`)
- [X] T062 [US4] Migrar los `throw` de `apps/api/src/sede/sede.service.ts` a `AppException` con los códigos correspondientes (`NO_ENCONTRADO`, `VALIDACION`)
- [X] T063 [P] [US4] Ampliar `apps/api/test/unit/persona-estado.spec.ts` (o un nuevo spec unitario) para verificar que cada regla de negocio migrada en T061 lanza el `code` correcto
- [X] T064 [US4] Verificar en `apps/api/test/integration/personas.integration-spec.ts` y `sedes.integration-spec.ts` que las respuestas de error siguen la forma de `contracts/errores.md` (sin romper las aserciones de `status` ya existentes)
- [X] T065 [US4] Crear `apps/web/src/lib/api-client.ts`: parsea Problem Details, traduce `code` con `next-intl` (namespace `errors` de T024), expone `errors` por campo
- [X] T066 [P] [US4] Crear `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx` y `apps/web/src/app/not-found.tsx` (FR-022, FR-023)
- [X] T067 [P] [US4] Crear `apps/backoffice/src/app/error.tsx` y `apps/backoffice/src/app/not-found.tsx`
- [X] T068 [US4] Agregar página `/_offline` y manejo de `fetch` fallido en el service worker de `apps/web` (FR-024)
- [X] T069 [US4] Confirmar en `apps/api/src/main.ts` (T020) que el `redact` de `nestjs-pino` cubre todos los campos personales del body de `POST /personas` (FR-025)
- [X] T070 [P] [US4] Configurar `@sentry/nextjs` en `apps/web` y `apps/backoffice` (`sendDefaultPii: false`, `beforeSend` que elimina email/teléfono/dirección, gateado por `SENTRY_DSN`)
- [X] T071 [P] [US4] Configurar `@sentry/nestjs` en `apps/api` (`instrument.ts`, mismas reglas de scrubbing, gateado por `SENTRY_DSN`)
- [X] T072 [US4] Actualizar `apps/web/src/app/registro/page.tsx` para usar `api-client.ts` (T065) y mostrar los errores `VALIDACION` junto a cada campo

**Checkpoint**: Historia 4 completa.

---

## Phase 7: User Story 5 - Elegir tema claro, oscuro o del sistema (Priority: P2)

**Goal**: la Persona elige su tema y se mantiene entre sesiones y dispositivos.

**Independent Test**: ver `spec.md` Historia 5 — cambiar el tema en Perfil, cerrar sesión, volver a entrar.

- [X] T073 [US5] Sumar `temaPreferido` a la respuesta de `GET /personas/by-email` en `apps/api/src/persona/persona.service.ts` / `persona.controller.ts` (`contracts/personas-api.md`)
- [X] T074 [US5] Crear `GET /personas/me` en `apps/api/src/persona/persona.controller.ts` + `persona.service.ts`, resuelto por `request.user.personaId` (nunca por `:id` de la URL)
- [X] T075 [US5] Crear `apps/api/src/persona/dto/actualizar-preferencias.dto.ts` (`@IsEnum` sobre `temaPreferido`) y el endpoint `PATCH /personas/me/preferencias`
- [X] T076 [P] [US5] Test de integración `apps/api/test/integration/personas-me.integration-spec.ts` (`GET`/`PATCH /personas/me`, caso 404 sin `personaId`)
- [X] T077 [US5] Extender los callbacks `jwt`/`session` de `apps/web/src/auth.ts` **y de `apps/backoffice/src/auth.ts`** (ambos ya existen, cada uno con su propia instancia de NextAuth) para propagar `temaPreferido` a `session.user.temaPreferido`
- [X] T078 [US5] En `apps/web/src/app/layout.tsx` (Server Component): setear la clase `dark`/`light` inicial de `<html>` a partir de `session.user.temaPreferido` antes de que `next-themes` tome el control (evita flash)
- [X] T079 [US5] Implementar el selector Claro/Oscuro/Sistema en `apps/web/src/app/(app)/perfil/page.tsx`, llamando a `PATCH /personas/me/preferencias` de forma optimista
- [X] T080 [US5] Implementar el mismo selector en el menú de usuario de `apps/backoffice/src/app/layout.tsx`
- [X] T081 [US5] Test e2e: cambiar el tema en Perfil y verificar que persiste tras recargar/reloguear, en `apps/web/e2e/perfil-tema.spec.ts`

**Checkpoint**: Historia 5 completa.

---

## Phase 8: User Story 6 - Interfaz preparada para más de un idioma (Priority: P3)

**Goal**: ningún texto de interfaz queda hardcodeado.

**Independent Test**: ver `spec.md` Historia 6 — revisar el código, agregar una clave de prueba a `es.json`.

- [X] T082 [US6] Migrar los textos de interfaz hardcodeados de `apps/web` (registro, primeros-pasos, visitanos, nav, páginas de error) a `apps/web/src/messages/es.json` (T024), reemplazando por `useTranslations`/`getTranslations`
  - **PARCIAL**: nav, primeros-pasos, visitanos, páginas de error y las listas de opciones de registro (T084) quedaron migradas. Las etiquetas de campo individuales de `apps/web/src/app/registro/page.tsx` (ej. "Apellido", "Nombre", "Género" — archivo propio del spec 001) siguen hardcodeadas en el componente. **Se migran en la próxima actualización del spec 001**, no en este spec, para no tocar ese archivo dos veces.
- [X] T083 [US6] Migrar los textos de interfaz hardcodeados de `apps/backoffice` a `apps/backoffice/src/messages/es.json`
- [X] T084 [P] [US6] En `apps/web/src/app/registro/page.tsx`: las etiquetas de las listas (`estadoCivil`, `profesion`, `tiempoCongregacion`) pasan a salir de `es.json` en vez de estar escritas en el componente (FR-032)

**Checkpoint**: Historia 6 completa (con la excepción parcial de T082 documentada arriba, diferida al spec 001).

---

## Phase 9: User Story 7 - Encontrar la iglesia y compartir bien un link (Priority: P3)

**Goal**: SEO base en páginas públicas, `noindex` en el resto.

**Independent Test**: ver `spec.md` Historia 7 — compartir un link público, revisar `sitemap.xml`/`robots.txt`.

- [X] T085 [P] [US7] Agregar `metadata`/`generateMetadata` (título + descripción propios) a cada página de `apps/web/src/app/(publica)/` (Inicio, Nosotros, Primeros pasos, Ministerios, Eventos, Visitanos, Dar)
- [X] T086 [US7] Crear la imagen por defecto de vista previa en `apps/web/public/og-default.png` (1200×630, logo + texto "Iglesia Vida Sobrenatural", placeholder reemplazable cuando se defina la identidad visual de `docs/09-notas-identidad-visual.md`) con su texto alternativo; agregar `openGraph.images` y `twitter.card`/`twitter.images` a la `metadata`/`generateMetadata` de cada página de `apps/web/src/app/(publica)/` (T085) — usando `og-default.png` salvo que la página ya tenga una imagen propia, en cuyo caso se usa esa (FR-035, SC-007)
- [X] T087 [US7] Crear `apps/web/src/app/sitemap.ts` y `apps/web/src/app/robots.ts` (solo rutas públicas; `disallow` del prefijo de `(app)`)
- [X] T088 [US7] Crear `apps/backoffice/src/app/robots.ts` (`disallow: '/'`) y reforzar con `metadata.robots = { index: false, follow: false }` en `apps/backoffice/src/app/layout.tsx`
- [X] T089 [US7] Agregar `metadata.robots = { index: false, follow: false }` a `apps/web/src/app/(app)/layout.tsx`
- [X] T090 [US7] Crear el componente `ChurchJsonLd` (Server Component, JSON-LD `schema.org/Church`) y agregarlo a `apps/web/src/app/(publica)/visitanos/page.tsx`

**Checkpoint**: Historia 7 completa.

---

## Phase 10: User Story 8 - Ver una demo realista sin datos reales (Priority: P3)

**Goal**: datos de ejemplo mínimos viables para Sede y Persona.

**Independent Test**: ver `spec.md` Historia 8 — correr el seed en un ambiente limpio.

- [X] T091 [US8] Extender `apps/api/prisma/seed.ts`: crear (si no existen) 1-2 Personas ficticias por estado ya definido — activa mayor de edad, pendiente_tutor, inactiva (pendiente_tutor + `activo: false`) — con nombres genéricos en español, de forma idempotente (`research.md` Decisión 13)

**Checkpoint**: Historia 8 completa — las 8 historias del spec están implementadas.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T092 Correr `pnpm --filter api test`, `pnpm --filter api test:e2e` y `pnpm --filter web test:e2e` completos y confirmar que siguen en verde sin haber modificado sus aserciones (`research.md` Decisión 14)
- [X] T093 Recorrer manualmente los escenarios de `quickstart.md` (las 8 historias + regresión del spec 001)
- [X] T094 [P] Confirmar que `docs/04-dominio-entidades.md` ya documenta `idioma_preferido`/`tema_preferido` (ya lo hace) — sin cambios si coincide con `data-model.md`
- [X] T095 Correr `pnpm --filter web lint` y `pnpm --filter backoffice lint` y confirmar cero errores de `eslint-plugin-jsx-a11y`

---

## Phase 12: Correcciones de la revisión manual — Lote 1 (sesión y navegación)

**Purpose**: aplicar el Lote 1 del plan de corrección de
`specs/revision-manual/2026-09-17-001-002.md` (hallazgos H-05, H-11, H-14 — los que bloquean el
resto de la revisión). No modifica ninguna tarea de las Fases 1–11, ya completadas.

**Contexto**: H-19, H-15 y H-16 del mismo Lote 1 son hallazgos de **specs/001-fase-bienvenida**
(Historia 2 de esa spec) — ver su `tasks.md`, Phase 9. Esta fase cubre solo los hallazgos que son
de 002-base-transversal. **T100/T101 (H-05, mover archivos a `(publica)/`) deben completarse antes
que 001/Phase 9**, porque esa fase edita `registro/page.tsx` y `registro/listo/page.tsx` en su
ubicación nueva.

- [X] T096 [H-11] Agregar la acción "Cerrar sesión" en `apps/web/src/app/(app)/perfil/page.tsx`: nuevo componente cliente `apps/web/src/components/cerrar-sesion-boton.tsx` que usa `ConfirmDestructiveDialog` de `packages/ui` (título/botones con verbo concreto: "¿Cerrar sesión?" / "Sí, cerrar sesión" / "Volver", D94) y llama a `signOut({ callbackUrl: '/?sesion=cerrada' })` de `next-auth/react` al confirmar.
- [X] T097 [P] [H-11] Mismo patrón en `apps/backoffice/src/components/selector-tema.tsx` (`MenuUsuario`): botón "Cerrar sesión" (mismo `ConfirmDestructiveDialog`) junto al selector de tema — no anidado dentro del `DropdownMenu` de tema, para evitar el conflicto conocido entre overlays anidados de Base UI (diálogo dentro de un menú); `signOut({ callbackUrl: '/?sesion=cerrada' })`.
- [X] T098 [P] [H-11] Crear `apps/web/src/components/aviso-por-query.tsx` (componente cliente reutilizable: lee un parámetro de la URL, muestra un `toast` de `sonner` una sola vez y limpia el parámetro con `router.replace`, envuelto en `Suspense` por `useSearchParams`) y usarlo en `apps/web/src/app/(publica)/page.tsx` (Inicio) para el aviso "Cerrsaste sesión" cuando `?sesion=cerrada`; equivalente en `apps/backoffice/src/app/page.tsx` (matriz de feedback, `docs/16-sistemas-transversales.md`).
- [X] T099 [H-14] Configurar `pages: { signIn, signOut, error }` en el `NextAuth(...)` de `apps/web/src/auth.ts` (`signIn: '/registro'`, `signOut: '/'`, `error: '/error-verificacion'`) y de `apps/backoffice/src/auth.ts` (`signIn: '/'`, `signOut: '/'`, `error: '/'` — el backoffice no tiene página de error propia todavía) para que ninguna de las dos apps dependa de las pantallas por defecto de NextAuth (en inglés, sin el diseño de la app).
- [X] T100 [H-05] Mover `apps/web/src/app/registro/` (con `listo/`), `apps/web/src/app/pendiente-tutor/`, `apps/web/src/app/email-no-verificado/` y `apps/web/src/app/error-verificacion/` a `apps/web/src/app/(publica)/` (mismas URLs — un grupo de rutas no agrega segmento — ahora heredan `NavPublicaHeader`/`FooterPublico` del layout de `(publica)`).
- [X] T101 [P] [H-05] Actualizar `apps/web/src/app/not-found.tsx` y `apps/web/src/app/error.tsx` (quedan en la raíz de `app/`, fuera de `(publica)`, porque un 404 de una URL que no matchea ninguna ruta no hereda el layout de ningún grupo) para que rendericen `<NavPublicaHeader />`/`<FooterPublico />` directamente — los providers de la raíz (`NextIntlClientProvider`, `SessionProvider`) siguen montados en ese punto, así que es seguro.
- [X] T102 [P] [H-05] En `apps/web/src/app/(publica)/registro/listo/page.tsx` (ruta nueva de T100), agregar un enlace "Ir a Inicio" junto al que ya vuelve a Primeros pasos.
- [X] T103 [H-11, H-14, H-05] Tests afectados: e2e nuevo o extendido para cerrar sesión (Perfil y backoffice) con `@axe-core/playwright` en modo claro y oscuro; verificar en los e2e existentes que `/registro`, `/registro/listo`, `/pendiente-tutor`, `/email-no-verificado`, `/error-verificacion`, el 404 y la pantalla de error muestran el menú y el pie de página.

**Checkpoint**: Lote 1 de la revisión manual completo en 002 — sesión visible en el menú, cierre de
sesión disponible, layout público consistente. Lote 2 y Lote 3 (`specs/revision-manual/`) quedan
para una corrección posterior, fuera de esta fase.

## Phase 13: Correcciones de la revisión manual — Lote 2 (diseño y errores)

**Purpose**: aplicar el Lote 2 del plan de corrección de
`specs/revision-manual/2026-09-17-001-002.md` (hallazgos H-07, H-01, H-04 — los que son de esta
spec). No modifica ninguna tarea de las Fases 1–12, ya completadas.

**Contexto**: H-03 del mismo Lote 2 es un hallazgo de **specs/001-fase-bienvenida** (Escenario 1,
`/visitanos`) — ver su `tasks.md`, Phase 10.

- [X] T104 [H-07] En `packages/ui/src/styles/theme.css`: `--font-sans` dentro de `@theme inline` estaba autorreferenciado (`var(--font-sans)`, nunca resolvía a nada) en vez de apuntar a la variable real que define `next/font` en cada `layout.tsx` — cambiar a `--font-sans: var(--font-geist-sans)`, igual que ya hacía `--font-mono` con `--font-geist-mono`. Corrige la tipografía en `apps/web` y `apps/backoffice` a la vez, al ser un token compartido.
- [X] T105 [P] [H-07] En `docs/15-guia-ux-ui.md`, reemplazar la mención suelta de "escala fija de tamaños y pesos" por una tabla concreta (h1/h2/h3/texto/texto secundario/etiquetas → clase `text-*` de Tailwind + peso) y aclarar que el proyecto usa una sola familia (`--font-sans`, Geist) para títulos y texto, dentro del máximo de dos familias de D94.
- [X] T106 [H-01] En `apps/web/src/components/nav-publica-header.tsx`: las acciones "Dar"/"Ingresar"/"Ir a la app" dejan de pasar por `<Button render={<Link>}>` — Base UI expone `role="button"` en cualquier caso (con o sin `nativeButton`), lo que le quita el rol de enlace a un `<a>` real. Se reemplaza por un `<Link>` con las clases de `buttonVariants` (exportado ya de `@vida-sobrenatural/ui`), que se ve igual pero conserva su semántica de enlace.
- [X] T107 [H-04] En `apps/web/src/app/error.tsx` y `apps/backoffice/src/app/error.tsx`: agregar `router.refresh()` (de `next/navigation`) antes de `reset()` en el handler de "Reintentar" — `reset()` solo remonta el segmento, no revalida el fetch del Server Component que lanzó el error.
- [X] T108 [H-01, H-04, H-07] Tests afectados: verificado con Playwright contra una instancia aislada — cero advertencias de Base UI en consola al abrir la home, `font-family` computado del `<body>` resuelve a Geist, y "Reintentar" en `apps/web/src/app/error.tsx` recupera el contenido después de que la API vuelve a responder. No se agregó un e2e nuevo en el repo porque son verificaciones de una condición de infraestructura (consola del navegador, API caída) más frágiles de automatizar de forma estable que de volver a probar a mano — quedan en la sección "Verificación manual" de abajo.

**Checkpoint**: Lote 2 de la revisión manual completo en 002 — tipografía aplicada, semántica de
botones/enlaces correcta, "Reintentar" revalida de verdad. Lote 3 queda para una corrección
posterior.

---

## Dependencies & Execution Order

- **Setup (Fase 1)** → sin dependencias, se puede empezar de inmediato.
- **Foundational (Fase 2)** → depende de Setup. Bloquea todas las historias (packages/ui, catálogo de errores, filtro global, providers de tema/idioma son compartidos por las 8).
- **US1 y US2 (P1)** → pueden avanzar en paralelo entre sí una vez terminada Foundational, pero T048-T054 (US2) tocan los mismos layouts que crea US1 (T029, T037, T042), así que en la práctica conviene terminar la navegación (US1) antes de pulir su accesibilidad (US2) sobre esos mismos archivos.
- **US3, US4, US5 (P2)** → cada una depende solo de Foundational, no entre sí, salvo que US5 (T077-T078) reutiliza el mismo `auth.ts`/`layout.tsx` que T023 (Foundational) ya tocó.
- **US6, US7, US8 (P3)** → independientes entre sí; US6 conviene hacerla después de que US1/US3/US4 ya crearon las pantallas cuyo texto hay que migrar a `es.json`.
- **Polish (Fase 11)** → depende de que todas las historias que se vayan a entregar estén completas.

## Parallel Example: Foundational (Fase 2)

```bash
Task: "Crear packages/shared-types/src/error-code.ts con el type ErrorCode"
Task: "Agregar transpilePackages: ['@vida-sobrenatural/ui'] a apps/web/next.config.ts y apps/backoffice/next.config.ts"
Task: "Crear apps/web/src/messages/es.json y apps/backoffice/src/messages/es.json"
```

## Implementation Strategy

### MVP primero (US1 + US2)

1. Setup + Foundational.
2. US1 (Navegación) — sin esto, ninguna otra historia tiene dónde vivir.
3. US2 (Accesibilidad) sobre lo que construyó US1.
4. **Parar y validar**: recorrer `quickstart.md` Historias 1 y 2 antes de seguir.

### Entrega incremental

Setup + Foundational → US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → Polish. Cada historia deja
la app en un estado íntegro (ninguna rompe lo ya entregado por la anterior), siguiendo el orden de
prioridad de `spec.md`.
