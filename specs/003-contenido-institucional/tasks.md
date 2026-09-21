# Tasks: Contenido institucional

**Input**: Design documents from `/specs/003-contenido-institucional/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: Este spec no pide TDD estricto ("test primero, falla, después implementa") — sigue el
criterio ya establecido en el proyecto (Constitución, Principio VI: testing pragmático por capas).
Las tareas de test están intercaladas junto a la implementación que cubren, no en una sección aparte.

**Organización**: Tareas agrupadas por historia de usuario (spec.md), en orden de prioridad
(P1 → P5). Cada historia es un incremento entregable e independientemente verificable según su
propio "Independent Test".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1-US5)
- Cada descripción incluye la ruta de archivo exacta

---

## Phase 1: Setup

**Purpose**: dependencias y configuración que ninguna historia necesita en el arranque mismo, pero
que hace falta declarar antes de escribir el código que las usa.

- [x] T001 [P] Agregar `sharp`, `multer` y `@types/multer` a `apps/api/package.json` e instalar (research.md Decisión 1 y 2 — usados por US4)
- [x] T002 [P] Agregar `"./assets/marca/*": "./src/assets/marca/*"` a `exports` en `packages/ui/package.json` (research.md Decisión 7 — usado por US5; hoy `exports` sólo declara `.` y `./theme.css`)
- [x] T003 [P] Agregar `STORAGE_DIR` a `apps/api/.env.example` (default `apps/api/storage/portadas/`) y esa carpeta a `apps/api/.gitignore` (research.md Decisión 3 — usado por US4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el modelo de datos que las Historias 2, 3 y 4 necesitan para existir. Las Historias 1 y
5 no dependen de esta fase (contenido estático y archivos de marca, respectivamente) y podrían
avanzar en paralelo con ella.

**⚠️ CRITICAL**: US2, US3 y US4 no pueden empezar hasta que esta fase esté completa.

- [x] T004 [P] Agregar `model PalabraProfetica` a `apps/api/prisma/schema.prisma` — campos y `@@index([vigente])` según `data-model.md` § PalabraProfetica
- [x] T005 [P] Agregar `model Libro` a `apps/api/prisma/schema.prisma` — campos y `@@index([orden])` según `data-model.md` § Libro (mismo criterio de `eliminadoEn`/`eliminadoPor` que `Sede`, D119)
- [x] T006 Generar y aplicar la migración (`pnpm --filter api exec prisma migrate dev --name palabra_profetica_libro`) (depende de T004, T005)

**Checkpoint**: esquema listo — US2, US3 y US4 pueden empezar.

---

## Phase 3: User Story 1 - Conocer a la iglesia en Nosotros (Priority: P1) 🎯 MVP

**Goal**: el contenido institucional real (identidad, historia, visión, misión, valores, sistema de
trabajo, llamado, congregación local) visible en Nosotros, sin backend nuevo.

**Independent Test**: entrar a Nosotros sin sesión y leer todo el contenido, en los dos temas, sin
errores de accesibilidad — sin depender de ningún dato cargado desde el backoffice.

### Implementation for User Story 1

- [x] T007 [P] [US1] Agregar el contenido de Nosotros (identidad, historia, visión, misión, valores, sistema de trabajo, llamado con Isaías 61:1-4/Lucas 4:16-21, congregación local) al namespace `nosotros` de `apps/web/src/messages/es.json`, tomado de `docs/12-contenido-bienvenida.md` § "Contenido institucional del sitio actual" (FR-001, D84)
- [x] T008 [US1] Actualizar `apps/web/src/app/(publica)/nosotros/page.tsx`: renderizar las secciones nuevas en orden, preservando sin cambios "Somos Familia", el placeholder del equipo pastoral y "En qué creemos" pendiente (FR-001, FR-002); el sistema de trabajo enlaza a Primeros pasos para el detalle en vez de repetir el texto completo (Acceptance Scenario 3) (depende de T007)
- [x] T009 [P] [US1] Ampliar `apps/web/e2e/nosotros.spec.ts`: contenido nuevo visible, sin scroll horizontal a 320/375px (ya cubierto por `axe-todas-las-rutas.spec.ts`, H-62), `auditar()` en los dos temas (H-76)
- [x] T009a [US1] Verificar Nosotros contra el checklist de `docs/15-guia-ux-ui.md` (cuatro estados, una sola acción principal, orden de botones, tono, teclado y lector de pantalla, contraste en los dos temas) — D114

**Checkpoint**: US1 funcional y verificable de forma independiente.

---

## Phase 3b: D122 — Nosotros pasa a entrada con tarjetas (previa a US5)

**Goal**: reestructurar Nosotros (T007-T009, ya entregados) de una sola página larga a una entrada
corta ("Somos Familia") más una grilla de seis tarjetas hacia sus subpáginas — cuatro nuevas
(Quiénes somos, Visión/misión/valores, Liderazgo, En qué creemos) y dos que ya existían sin cambio
de URL (Palabra Profética, Ediciones VS). Va antes de la Historia 5 (D122): la marca define Open
Graph, sitemap y navegación, y si fuera después las cuatro subpáginas nuevas nacerían sin esa
metadata (ver D122 en `docs/05-decisiones.md` y H-77 en `specs/revision-manual/2026-09-17-001-002.md`).

**Independent Test**: entrar a Nosotros sin sesión, ver la entrada corta y la grilla de seis
tarjetas, y desde cada una llegar a su subpágina con contenido completo — en los dos temas y sin
errores de accesibilidad.

### Implementation for D122

- [x] T009b [US1] Reestructurar el namespace `nosotros` de `apps/web/src/messages/es.json` (entrada + textos de las seis tarjetas) y crear los namespaces `quienesSomos`, `visionMisionValores`, `liderazgo`, `enQueCreemos` con el contenido movido de `nosotros` (FR-001, FR-002, D84, D122)
- [x] T009c [US1] Reescribir `apps/web/src/app/(publica)/nosotros/page.tsx`: entrada corta ("Somos Familia") + grilla de seis tarjetas, cada una con `PlaceholderImagen aspecto="equipo"` como espacio de imagen reservado (FR-001, FR-003, FR-003a, D122) (depende de T009b)
- [x] T009d [P] [US1] Crear `apps/web/src/app/(publica)/nosotros/quienes-somos/page.tsx`: identidad, historia y congregación local, con fondo alternado por sección (`bg-background`/`bg-secondary`, FR-003b) (D122) (depende de T009b)
- [x] T009e [P] [US1] Crear `apps/web/src/app/(publica)/nosotros/vision-mision-valores/page.tsx`: visión, misión, valores, sistema de trabajo (enlaza a Primeros pasos) y el llamado de Isaías 61, con fondo alternado por sección (FR-003b) (D122) (depende de T009b)
- [x] T009f [P] [US1] Crear `apps/web/src/app/(publica)/nosotros/liderazgo/page.tsx`: listado del equipo pastoral movido sin cambios de contenido (FR-002), con fondo alternado por sección (FR-003b) (D122) (depende de T009b)
- [x] T009g [P] [US1] Crear `apps/web/src/app/(publica)/nosotros/en-que-creemos/page.tsx`: "En qué creemos" pendiente movido sin cambios de contenido (FR-002) (D122) (depende de T009b)
- [x] T009h [US1] Agregar `/nosotros/quienes-somos`, `/nosotros/vision-mision-valores`, `/nosotros/liderazgo` y `/nosotros/en-que-creemos` a `RUTAS_PUBLICAS` en `apps/web/src/app/sitemap.ts` (FR-009, D82, D122) (depende de T009c-T009g)
- [x] T009i [US1] Reescribir `apps/web/e2e/nosotros.spec.ts` (entrada + grilla de tarjetas) y agregar la cobertura e2e de las cuatro subpáginas nuevas, `auditar()` en los dos temas (H-76) (depende de T009c-T009h)
- [x] T009j [US1] Verificar la entrada de Nosotros y las subpáginas Quiénes somos, Visión/misión/valores, Liderazgo y En qué creemos contra el checklist de `docs/15-guia-ux-ui.md` (cuatro estados, contraste en los dos temas, teclado y lector de pantalla) — D114 (depende de T009i)

**Checkpoint**: Nosotros reestructurado y verificable de forma independiente; las cuatro
subpáginas nuevas ya tienen URL, entrada de sitemap y tarea de checklist antes de que la Historia 5
agregue la marca a la navegación.

---

## Phase 4: User Story 2 - Leer la Palabra Profética y conocer Ediciones VS (Priority: P2)

**Goal**: subpáginas públicas de sólo lectura para ambas entidades, cada una con su URL propia.

**Independent Test**: con una Palabra Profética vigente y al menos un Libro activo ya cargados
(seed), leer ambas subpáginas desde Nosotros sin sesión — sin que el backoffice tenga la edición
implementada todavía.

### Implementation for User Story 2

- [x] T010 [P] [US2] Crear `apps/api/src/palabra-profetica/{palabra-profetica.module.ts,palabra-profetica.controller.ts,palabra-profetica.service.ts}` con `GET /palabra-profetica` (`?vigente=true` → una o `204`; sin filtro → historial paginado) según `contracts/palabra-profetica-api.md`, `select` explícito (H-42)
- [x] T011 [P] [US2] Crear `apps/api/src/libro/{libro.module.ts,libro.controller.ts,libro.service.ts}` con `GET /libros` (`?estado=activas|todas|papelera`, default `activas`, ordenado por `orden`) y `GET /libros/:id` según `contracts/libros-api.md`, paginado + `select` explícito (H-42)
- [x] T012 [US2] Registrar `PalabraProfeticaModule` y `LibroModule` en `apps/api/src/app.module.ts` (depende de T010, T011)
- [x] T013 [P] [US2] Test unitario del comportamiento "una vigente o 204" de `palabra-profetica.service.ts` en `apps/api/test/unit/`
- [x] T014 [P] [US2] Tests de integración de las variantes `GET` en `apps/api/test/integration/palabra-profetica.integration-spec.ts` y `apps/api/test/integration/libros.integration-spec.ts`
- [x] T015 [US2] Cargar en `apps/api/prisma/seed.ts` la Palabra Profética vigente ("Palabra Profética 2026 — Fidelidad y crecimiento", `docs/12-contenido-bienvenida.md` § "Palabra Profética 2026") y los 8 libros reales del catálogo (`docs/12-contenido-bienvenida.md` § Ediciones VS) — sólo datos, `portadaUrl`/`portadaDescripcion` quedan en `null` en los 8; ningún archivo de imagen entra por este seed, el placeholder hace su trabajo (FR-031) (depende de T006, T010, T011; no depende de T032-T040, la parte de subida de portada de US4)
- [x] T016 [US2] Crear `apps/web/src/app/(publica)/nosotros/palabra-profetica/page.tsx`: título/año/texto, y sólo si hay video (D121: opcional) miniatura + carga al clic desde `youtube-nocookie.com` (D93); estado vacío únicamente si no hay ninguna vigente (204), no cuando la vigente no tiene video (FR-004, FR-005, FR-006)
- [x] T017 [US2] Crear `apps/web/src/app/(publica)/nosotros/ediciones-vs/page.tsx`: introducción y "cómo se consiguen" (`docs/12-contenido-bienvenida.md` § Ediciones VS) + listado de libros activos (portada o `PlaceholderImagen aspecto="portada"`, título, autor/a, año, orden por `orden`), estado vacío si no hay ninguno activo (FR-007, FR-008)
- [x] T018 [US2] Agregar en `apps/web/src/app/(publica)/nosotros/page.tsx` los enlaces a ambas subpáginas, sin sumar ítems al menú principal (FR-003, D115) (depende de T008, T016, T017)
- [x] T019 [P] [US2] Agregar ambas subpáginas a `apps/web/src/app/(publica)/sitemap.ts` (FR-009)
- [x] T020 [P] [US2] Crear `apps/web/e2e/palabra-profetica.spec.ts` y `apps/web/e2e/ediciones-vs.spec.ts`: contenido, estados vacíos, video con clic para cargar, `auditar()` en los dos temas (H-76)
- [x] T020a [US2] Verificar la subpágina de Palabra Profética contra el checklist de `docs/15-guia-ux-ui.md` — D114
- [x] T020b [US2] Verificar la subpágina de Ediciones VS contra el checklist de `docs/15-guia-ux-ui.md` — D114

**Checkpoint**: US1 + US2 funcionales de forma independiente; la web pública ya muestra contenido real de ambas secciones (vía seed).

---

## Phase 5: User Story 3 - Admin edita la Palabra Profética del año (Priority: P3)

**Goal**: CRUD de Palabra Profética en el backoffice, Admin edita / Pastor lee.

**Independent Test**: con sesión de Admin, cargar una Palabra Profética nueva marcándola vigente y
verificar que se publica de inmediato mientras la anterior queda "no vigente" en el historial — sin
tocar el CRUD de Libro.

### Implementation for User Story 3

- [x] T021 [US3] Agregar `'YOUTUBE_URL_INVALIDA'` a la unión `ErrorCode` en `packages/shared-types/src/error-code.ts` (data-model.md)
- [x] T022 [US3] Crear el helper de validación/extracción de id de YouTube (reconoce `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`; 11 caracteres o `null`) en `apps/api/src/palabra-profetica/youtube-url.ts` (research.md Decisión 4)
- [x] T023 [P] [US3] Test unitario `apps/api/test/unit/youtube-url.spec.ts` para las tres formas reconocidas y los casos de rechazo (depende de T022)
- [x] T024 [US3] Crear `apps/api/src/palabra-profetica/dto/{crear-palabra-profetica.dto.ts,actualizar-palabra-profetica.dto.ts}` (`anio` `Min(2010)`/`Max(añoActual+1)`, `titulo`/`texto` no vacíos, `youtubeUrl` opcional — D121)
- [x] T025 [US3] Agregar `POST /palabra-profetica`, `PATCH /palabra-profetica/:id` y `PATCH /palabra-profetica/:id/marcar-vigente` a `palabra-profetica.controller.ts`/`.service.ts` — guard Admin; si llega `youtubeUrl`, deriva `youtubeVideoId` con T022 o rechaza `YOUTUBE_URL_INVALIDA` (400); si no llega, `youtubeVideoId` queda `null` sin error (D121); `marcar-vigente` como una sola transacción de Prisma que desmarca la anterior (FR-010 a FR-013, `contracts/palabra-profetica-api.md`) (depende de T010, T021, T022, T024)
- [x] T026 [US3] Agregar `TITULOS['YOUTUBE_URL_INVALIDA']` en `apps/api/src/common/errors/all-exceptions.filter.ts`
- [x] T027 [US3] Agregar `errors.YOUTUBE_URL_INVALIDA` a `apps/backoffice/src/messages/es.json`
- [x] T028 [P] [US3] Tests de integración en `apps/api/test/integration/palabra-profetica.integration-spec.ts`: alta/edición/marcar-vigente, URL de YouTube inválida rechazada, la vigente anterior se desmarca sola, Pastor recibe 403 en escrituras, otro rol recibe 403 (depende de T025)
- [x] T029 [US3] Crear `apps/backoffice/src/app/palabra-profetica/{page.tsx,loading.tsx,error.tsx,palabra-profetica-cliente.tsx}`: formulario (año/título/texto/URL) + historial + botón marcar vigente, validación por campo con limpieza al escribir y revalidación al salir (H-50/H-72), envío protegido con `useEnvio` (H-57), Admin edita/Pastor lee (D64) (depende de T025)
- [x] T030 [P] [US3] Agregar la entrada "Palabra Profética" (Admin y Pastor) a `apps/backoffice/src/config/nav.ts` (FR-028, FR-029)
- [x] T031 [P] [US3] Crear `apps/backoffice/e2e/palabra-profetica.spec.ts`: alta, marcar vigente desmarca la anterior, errores de validación por campo, Pastor solo lectura, otro rol bloqueado por menú y por URL directa, `auditar()` en los dos temas
- [x] T031a [US3] Verificar la pantalla de Palabra Profética del backoffice contra el checklist de `docs/15-guia-ux-ui.md` — D114

**Checkpoint**: US1 + US2 + US3 funcionales de forma independiente; la web pública refleja las ediciones del Admin.

---

## Phase 6: User Story 4 - Admin gestiona el catálogo de libros de Ediciones VS (Priority: P4)

**Goal**: CRUD completo de Libro con portada (primera implementación real de `StorageService`) y
papelera, Admin edita / Pastor lee.

**Independent Test**: con sesión de Admin, dar de alta un libro con portada, verlo en la lista y en
la web pública, inactivarlo/reactivarlo, eliminarlo a la papelera y restaurarlo — sin tocar la
Palabra Profética.

### Implementation for User Story 4

- [x] T032 [US4] Crear `packages/shared-types/src/portada.ts` (`MIME_TIPOS_PORTADA_PERMITIDOS`, `PORTADA_TAMANO_MAXIMO_BYTES`, `PORTADA_ASPECTO`) según `data-model.md`
- [x] T033 [US4] Agregar `'PORTADA_TIPO_INVALIDO'`, `'PORTADA_TAMANO_EXCEDIDO'`, `'LIBRO_TEXTO_ALTERNATIVO_REQUERIDO'` a `packages/shared-types/src/error-code.ts`
- [x] T034 [US4] Crear `apps/api/src/storage/{storage.service.ts,storage.module.ts,local-storage.provider.ts}` — interfaz `subir/eliminar` (`contracts/portadas-storage.md`), nombre de archivo generado con `randomUUID()`, `STORAGE_DIR` de T003 (research.md Decisión 3)
- [x] T035 [US4] Crear `apps/api/src/storage/imagen-portada.service.ts` con `sharp`: `resize(..., { fit: 'cover', position: 'centre' })` a `PORTADA_ASPECTO` (2:3) + recompresión (research.md Decisión 1, FR-023/FR-024) (depende de T001, T032)
- [x] T036 [P] [US4] Test unitario `apps/api/test/unit/imagen-portada.spec.ts`: imagen vertical, apaisada y cuadrada quedan recortadas centradas a 2:3, salida recomprimida (depende de T035)
- [x] T037 [US4] Montar `STORAGE_DIR` como ruta estática pública en `apps/api/src/main.ts` (ej. `/archivos/portadas/`), distinta del endpoint de subida (D110, FR-026) (depende de T034)
- [x] T038 [US4] Crear `apps/api/src/libro/dto/{crear-libro.dto.ts,actualizar-libro.dto.ts}` (`titulo`/`autor` no vacíos, `anio`, `orden` entero `>=0`, `descripcion` opcional)
- [x] T039 [US4] Agregar `POST /libros`, `PATCH /libros/:id` (incluye toggle `activo`), `DELETE /libros/:id` (siempre permitido, sin chequeo de dependientes — FR-020) y `POST /libros/:id/restaurar` a `libro.controller.ts`/`.service.ts` — guard Admin, mismo patrón que `sede.service.ts` (`contracts/libros-api.md`) (depende de T011, T038)
- [x] T040 [US4] Agregar `POST /libros/:id/portada` (`FileInterceptor` con `multer` en memoria, valida MIME/tamaño contra T032, exige `portadaDescripcion` en el mismo request, procesa con T035, sube con T034, borra la portada anterior si existía) y `DELETE /libros/:id/portada` a `libro.controller.ts`/`.service.ts` (FR-021 a FR-026, `contracts/libros-api.md`) (depende de T033, T034, T035, T039)
- [x] T041 [US4] Agregar las tres entradas nuevas de `TITULOS` (T033) en `apps/api/src/common/errors/all-exceptions.filter.ts`
- [x] T042 [US4] Agregar `errors.PORTADA_TIPO_INVALIDO`, `errors.PORTADA_TAMANO_EXCEDIDO`, `errors.LIBRO_TEXTO_ALTERNATIVO_REQUERIDO` a `apps/backoffice/src/messages/es.json`
- [x] T043 [P] [US4] Tests de integración `apps/api/test/integration/libros.integration-spec.ts`: alta/edición/inactivar-reactivar/eliminar-siempre-permitido/restaurar, subida de portada (tipo inválido, tamaño excedido, sin texto alternativo, reemplazo borra la anterior, quitar), Pastor 403 en escrituras, otro rol 403 (depende de T039, T040)
- [x] T044 [US4] Cargar en `apps/api/prisma/seed-demo.ts` los tres casos hostiles: libro con título larguísimo, libro con autor con tildes/ñ, libro sin descripción (FR-032, D120), idempotente por `titulo` (mismo criterio que el resto del script — un dato único por registro) (depende de T015, no sólo de T006: seed-demo corre encima de seed.ts, no en su reemplazo, D120)
- [x] T045 [US4] Crear `apps/backoffice/src/app/libros/{page.tsx,loading.tsx,error.tsx,libros-cliente.tsx}`: `TablaDatos` con filtro activos/todos, columna de acciones, alta en modal, `PlaceholderImagen aspecto="portada"` cuando `portadaUrl` es null (FR-018, FR-027), Pastor lee sin ninguna acción habilitada (FR-029, D64) (depende de T039)
- [x] T046 [US4] Crear `apps/backoffice/src/app/libros/papelera/{page.tsx,loading.tsx,error.tsx,papelera-cliente.tsx}`: listado de papelera + restaurar (mismo patrón que `sedes/papelera/`), Pastor lee sin restaurar habilitado (FR-029, D64) (depende de T039)
- [x] T047 [US4] Crear `apps/backoffice/src/app/libros/[id]/{page.tsx,loading.tsx,error.tsx,not-found.tsx,libro-detalle-cliente.tsx}`: detalle editable + subir/reemplazar/quitar portada (validación de UI contra T032 antes de subir), `PlaceholderImagen aspecto="portada"` cuando no hay portada (FR-027), texto alternativo obligatorio en cuanto hay portada, inactivar/reactivar/eliminar, Pastor lee sin ninguna acción habilitada (FR-029, D64) (depende de T040)
- [x] T048 [P] [US4] Agregar la entrada "Libros" (Admin y Pastor) a `apps/backoffice/src/config/nav.ts` (FR-028, FR-029)
- [x] T049 [P] [US4] Crear `apps/backoffice/e2e/libros.spec.ts`: alta con portada, error de tipo/tamaño inválido, texto alternativo obligatorio, reemplazo/quitar portada, inactivar/reactivar, eliminar siempre permitido a papelera, restaurar, Pastor solo lectura, otro rol bloqueado, `auditar()` en los dos temas (mismo patrón que `sedes.spec.ts`)
- [x] T049a [US4] Verificar el listado de Libros del backoffice contra el checklist de `docs/15-guia-ux-ui.md` — D114
- [x] T049b [US4] Verificar la papelera de Libros del backoffice contra el checklist de `docs/15-guia-ux-ui.md` — D114
- [x] T049c [US4] Verificar el detalle de Libro del backoffice contra el checklist de `docs/15-guia-ux-ui.md` — D114

**Checkpoint**: US1-US4 funcionales de forma independiente; CRUD completo de ambas entidades.

---

## Phase 7: User Story 5 - La marca real reemplaza al texto y al ícono por defecto (Priority: P5)

**Goal**: aplicar los archivos de `packages/ui/src/assets/marca/` (ver `docs/marca/README.md`) en
favicon, ícono de PWA, marca de agua, navegación, pie de página y Open Graph.

**Independent Test**: verificar en las dos apps, en los dos temas y sin scroll horizontal a 320px,
que favicon/ícono/navegación/pie de página/Open Graph muestran la marca real — sin depender de
ninguna otra historia de esta spec.

### Implementation for User Story 5

- [ ] T050 [P] [US5] Agregar la marca de agua del isotipo al 20% de opacidad (dos `<Image>` por tema, alternadas por CSS `dark:hidden`/`hidden dark:block`, decorativa respecto al `aria-label` ya existente) a `packages/ui/src/components/placeholder-imagen.tsx` (FR-034) (depende de T002)
- [ ] T051 [US5] Crear `scripts/generar-iconos-marca.mjs` (`sharp`): deriva `apps/web/src/app/icon.png` (512×512), `apps/web/src/app/apple-icon.png` (180×180), `apps/web/public/icons/{icon-192.png,icon-512.png}` y `apps/backoffice/src/app/icon.png`, todos desde `packages/ui/src/assets/marca/logo-oscuro-1024.png` (research.md Decisión 8) (depende de T001)
- [ ] T052 [US5] Correr `node scripts/generar-iconos-marca.mjs` una vez y eliminar `apps/web/src/app/favicon.ico` y `apps/backoffice/src/app/favicon.ico` (reemplazados por la convención `icon.png`, FR-035) (depende de T051)
- [ ] T053 [US5] Crear `apps/web/src/app/manifest.ts` (nombre, `icons` 192/512 desde `public/icons/`, sin service worker ni offline — D47 fuera de alcance) (FR-036) (depende de T051)
- [ ] T054 [US5] Actualizar `apps/web/src/components/nav-publica-header.tsx`: reemplazar el enlace de texto "Vida Sobrenatural" (desktop y título del `Sheet` en celular) por el logotipo importado de `packages/ui` (dos `<Image>` por tema); en celular, isotipo solo o logotipo con alto 24-32px (FR-037, FR-040) (depende de T002)
- [ ] T055 [US5] Actualizar `apps/web/src/components/footer-publico.tsx`: agregar el logotipo (FR-039) (depende de T002)
- [ ] T056 [US5] Actualizar `apps/backoffice/src/components/backoffice-shell.tsx`: agregar el logotipo a la cabecera del sidebar, hoy sin ninguna marca (FR-038) (depende de T002)
- [ ] T057 [US5] Actualizar `apps/web/src/app/(publica)/opengraph-image.tsx`: leer el PNG origen con `fs.readFileSync` desde `packages/ui/src/assets/marca/` e incorporarlo al layout 1200×630 ya existente (research.md Decisión 9, FR-041)
- [ ] T058 [US5] Pasada de texto alternativo: cada uso del logotipo/isotipo de T054-T057 lleva `alt="Vida Sobrenatural"` salvo que un título vecino ya lo diga, en cuyo caso queda decorativo (FR-042) (depende de T054, T055, T056)
- [ ] T059 [P] [US5] Crear `apps/web/e2e/marca.spec.ts`: favicon, nav, pie de página, Open Graph, sin scroll horizontal a 320px con el logotipo/isotipo (reutiliza el smoke de H-62), alt vs. decorativo, `auditar()` en los dos temas
- [ ] T060 [P] [US5] Crear `apps/backoffice/e2e/marca.spec.ts`: favicon, cabecera del sidebar, alt vs. decorativo, `auditar()` en los dos temas
- [ ] T060a [US5] Verificar la barra de navegación y el pie de página de `apps/web`, y la cabecera del sidebar de `apps/backoffice`, contra el checklist de `docs/15-guia-ux-ui.md` — D114

**Checkpoint**: las 5 historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Correr Lighthouse (celular) sobre Nosotros, Palabra Profética y Ediciones VS; anotar LCP/INP/CLS contra las metas de la Constitución y dejar los números documentados en `specs/003-contenido-institucional/` (H-45, SC-005)
- [ ] T062 Correr las cuatro suites antes de cerrar la fase: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, e2e de `apps/web`, e2e de `apps/backoffice` (convención de `docs/00-README.md`, CLAUDE.md)
- [ ] T063 Recorrer `quickstart.md` escenario por escenario (los 5 más "Datos hostiles") y confirmar cada resultado esperado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato.
- **Foundational (Phase 2)**: depende de Setup sólo en que T001 debe existir antes de que Phase 6 use `sharp`; el propio esquema (T004-T006) no depende de Setup. **Bloquea** US2, US3 y US4.
- **US1 (Phase 3)** y **US5 (Phase 7)**: no dependen de Foundational — pueden arrancar en paralelo con ella.
- **US2 (Phase 4)**: depende de Foundational (T004-T006) y, para T018, de US1 (T008) ya existente.
- **US3 (Phase 5)**: depende de Foundational y de US2 (T010, el módulo de Palabra Profética que extiende).
- **US4 (Phase 6)**: depende de Foundational, de Setup (T001, T002/T003 vía Decisión 3) y de US2 (T011, el módulo de Libro que extiende).
- **Polish (Phase 8)**: depende de que las historias que se vayan a cerrar en esta fase ya estén completas.

### User Story Dependencies

- **US1 (P1)**: independiente — ninguna otra historia la bloquea ni la necesita.
- **US2 (P2)**: depende del esquema (Foundational) y reutiliza la página de Nosotros de US1 para enlazar sus subpáginas (T018) — si US1 no está, sus subpáginas igual funcionan por URL directa, sólo falta el enlace.
- **US3 (P3)**: extiende el módulo de Palabra Profética que crea US2 (mismos archivos `palabra-profetica.controller.ts`/`.service.ts`) — secuencial con US2, no en paralelo.
- **US4 (P4)**: extiende el módulo de Libro que crea US2 (mismos archivos `libro.controller.ts`/`.service.ts`) — secuencial con US2; independiente de US3 (no comparten archivos).
- **US5 (P5)**: independiente de todas las demás — ni las necesita ni ellas la necesitan.

### Parallel Opportunities

- Todas las tareas [P] de Setup (T001-T003) en paralelo.
- T004 y T005 (Foundational) en paralelo (mismo archivo `schema.prisma`, pero ediciones independientes antes de generar la migración en T006).
- **US1 completa puede avanzar en paralelo con Foundational** (no la necesita).
- **US5 completa puede avanzar en paralelo con Foundational, US1, US2, US3 y US4** (no depende de ninguna).
- Dentro de US2: T010 y T011 en paralelo (módulos distintos); T019, T020 en paralelo entre sí una vez que T016-T018 están listos.
- Dentro de US4: T032 y T033 en paralelo; T043, T048, T049 en paralelo una vez que T039-T042 están listos.
- US3 y US4 pueden avanzar en paralelo entre sí una vez que US2 está completa (no comparten archivos).

---

## Parallel Example: Setup + US1 + US5 en paralelo

```bash
# Con Foundational todavía sin arrancar, tres frentes pueden avanzar a la vez:
Task: "T001 Agregar sharp/multer a apps/api/package.json"
Task: "T007 Contenido de Nosotros en apps/web/src/messages/es.json"
Task: "T050 Marca de agua en packages/ui/src/components/placeholder-imagen.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup (o saltear T001/T003 si no se toca US4 todavía).
2. Completar Phase 3: User Story 1.
3. **PARAR y VALIDAR**: probar Nosotros de forma independiente (T009a).
4. Mostrar/demo si está listo — es el contenido institucional que ya faltaba (H-32).

### Entrega incremental

1. Setup + Foundational → esquema listo.
2. + US1 → Nosotros completo (MVP de contenido).
3. + US2 → lectura pública de Palabra Profética y Ediciones VS (con datos del seed).
4. + US3 → el Admin ya puede editar la Palabra Profética sin tocar código.
5. + US4 → el Admin ya puede gestionar el catálogo de Libros completo, con portada.
6. + US5 → la marca real reemplaza al texto/ícono por defecto en toda la superficie visible.
7. Phase 8 (Polish): Lighthouse, las cuatro suites en verde, `quickstart.md` recorrido — cierre de fase.

### Estrategia con más de una persona

- Persona A: Setup + Foundational, después US2 → US3 → US4 (secuencial, comparten archivos).
- Persona B: US1 en paralelo con Foundational (no la necesita).
- Persona C: US5 en paralelo con Foundational y las otras historias (T001/T002 de Setup sí son su único prerrequisito real — sin ellos, T051 y T050/T054-T056 no pueden arrancar).

---

## Notes

- **Definición de terminado (D114)**: cada pantalla nueva o modificada tiene su propia tarea de
  checklist (`docs/15-guia-ux-ui.md`) dentro de la historia que la agrega — T009a, T009j, T020a,
  T020b, T031a, T049a-c, T060a. Ninguna es opcional ni se resume en otra tarea.
- Phase 8 (T062) es la tarea que corre las cuatro suites (unitarios + integración de `apps/api`, e2e
  de `apps/web` y `apps/backoffice`) — tampoco es opcional; ninguna fase se cierra sin ella
  (CLAUDE.md).
- `[P]` = archivos distintos, sin dependencia entre sí. La ausencia de `[P]` en una tarea de una
  historia con tareas `[P]` alrededor no siempre significa "bloqueada por todas las anteriores" —
  revisar la dependencia explícita entre paréntesis cuando la haya.
- Evitar: tareas vagas, dos tareas tocando el mismo archivo al mismo tiempo, dependencias entre
  historias que rompan su independencia salvo las ya documentadas arriba (US3/US4 extienden los
  módulos que crea US2 — es la única dependencia real entre historias de esta spec, más allá del
  esquema de Foundational).
