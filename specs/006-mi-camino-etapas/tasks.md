# Tasks: Mi camino por etapas, historial previo, el Discipulador en la web app y alta de adultos por el Admin

**Input**: Design documents from `/specs/006-mi-camino-etapas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la spec los pide (FR-042, SC-002/004/006/007/008) y la Constitución también (Principios
VI y VII). Cada criterio de aceptación tiene un test que lo cubre (ver **Cobertura** al final):
unit para toda regla con ramas, integración para lo que cambia estado contra la base, e2e con
`axe` en claro y oscuro para los flujos críticos, en `@celular` para la web app.

**Organización**: por historia, en orden de prioridad (US1, US2 y US3 son P1; US4 y US5 son P2).
Cada tarea cita el requisito o criterio que cubre. Cada pantalla nueva, movida o modificada lleva
su tarea de **checklist de `docs/15`** (D114). Al final, **Lotes** agrupa las tareas en sesiones
paralelas que no se pisan; el **lote 0** es lo compartido y va primero.

**Convenciones que valen para todas las tareas** (no se repiten en cada una):
- Permisos solo con `@RequierePermiso` (API) y `requerirPermiso` (las dos apps), contra
  `CATALOGO_PERMISOS` (D132). Nunca un rol literal.
- Errores en Problem Details con un `code` de `error-code.ts`; los de campo, bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito; listados paginados (H-42). Operaciones que tocan pedido,
  declaración o Completitud de una Persona empiezan con `SELECT … FROM personas … FOR UPDATE`
  (research #5).
- Textos por `next-intl`, rioplatense con voseo, sin nombres del modelo en pantalla (FR-040).
  Colores solo de tokens (D118); estados con texto + ícono (D81); enlaces subrayados (H-55).
- Botones de acción con `Button` + `useEnvio` (H-57); validación con `useValidacionCampos` +
  `ResumenErrores` + `MensajeErrorCampo` (H-50).
- "Cargando" es `loading.tsx` y "error" es `error.tsx`.
- **D150 en `apps/web`**: 16 px en etiquetas, botones y ayudas (14 px solo metadatos), botones de
  44 px. **D151**: confirmaciones de acciones reversibles en estilo neutro; rojo + ícono solo para
  lo irreversible.
- Transiciones de historial emiten su evento de `contracts/eventos.md` **después** del commit.
- Commits en español, uno por tarea o por cambio coherente; un test que rompe por un cambio de
  modelo se arregla en el mismo commit (CLAUDE.md).

---

## Phase 0: Gate (antes de todo)

- [x] T000 **[Lote 0 global: D153–D157 numeradas y cambios a docs aplicados]** Echu aprueba el spec (PR) y responde las "Preguntas para Echu"; se aplican sus respuestas a spec/plan/tasks y, en el mismo PR de implementación y **antes** del lote 0, los "Cambios a docs al mergear" de `plan.md` con las cinco decisiones numeradas en `docs/05` (mirando el último número usado, D89/D103) — Principio I

## Phase 1: Setup (lote 0)

- [x] T001 **[Lote 0 global: hecho]** Agregar `NEXT_PUBLIC_WEB_APP_URL` a `apps/backoffice/.env.local.example`, al `env` del `webServer` de `apps/backoffice/playwright.config.ts` (y del CI) y a `specs/revision-manual/COMO-ARRANCAR.md` (`http://localhost:3001`, D104) — research #14, FR-025
- [x] T002 **[Lote 0 global: hecho]** [P] Agregar el proyecto `celular` (`grep: /@celular/`, `devices['Pixel 7']`) a `apps/web/playwright.config.ts`, y un helper `sinScrollHorizontal(page, ancho = 375)` en `apps/web/e2e/helpers.ts` — research #13, FR-027, SC-005
- [x] T003 **[Lote 0 global: hecho]** [P] Crear los namespaces vacíos `etapas` (`etapas.<etapa>.descripcion`, la única fuente de las descripciones), `miCamino.estados`, `miCamino.selector`, `misDiscipulados`, `miDisponibilidad`, `inicio.pendientesDiscipulador` en `apps/web/src/messages/es.json`, y `personasAlta`, `historialPrevio`, `etapasPersona`, `loTuyoEnLaApp` en `apps/backoffice/src/messages/es.json` (cada lote los llena sin pisarse) — FR-040

---

## Phase 2: Foundational (lote 0 — bloquea todas las historias)

**Shared types y reglas puras**

- [x] T004 **[Lote 0 global: hecho]** Crear `packages/shared-types/src/camino.ts` con `EtapaCamino`, `ETAPAS_CAMINO`, `ETAPAS_CONSTRUIDAS`, `Completas`, `Requisito`, `requisitoDeEtapa`, `reglaDeEtapa`, `EstadoEtapa`, `HechosCamino`, `CaminoDeLaPersona`, `estadoDeEtapa` y `puedeDeclarar` según `data-model.md`, y exportarlo en `index.ts` — FR-002, FR-003, FR-004, FR-008, FR-016
- [x] T005 **[Lote A: hecho en `apps/api/test/unit/camino.spec.ts`; no fija la lista de `ETAPAS_CONSTRUIDAS` (solo que incluye `vida_nueva`) para que 008/009/010 se sumen sin romperlo]** **[Lote 0 global: casos base en `test/unit/lote-0-global.spec.ts`; el resto de las ramas → lote A]** Test unitario `apps/api/test/unit/camino.spec.ts` (ni `shared-types` ni `apps/web` tienen runner de unit; el repo testea `shared-types` desde acá): cada rama de `estadoDeEtapa` (orden de data-model, incluido `buscando` ≠ "en curso" para Bautismo), `reglaDeEtapa` para las cuatro etapas (VN siempre; Bautismo con VN `en_curso` o completa por sistema/historial; VS con VN completa; Ministerio con VS completa), `puedeDeclarar` (edad < 12, completa, pendiente, VN con pedido o Grupo, VN `baja` sí), y que `ETAPAS_CONSTRUIDAS` solo tenga `vida_nueva` — SC-002, FR-003, FR-008
- [ ] T006 **[Lote 0 global: `registro.ts` quedó como placeholder → lote D]** [P] Crear `packages/shared-types/src/registro.ts` con `DatosPersonales` y `erroresDeDatosPersonales` (extraídos de `apps/api/src/persona/dto/registro-persona.dto.ts`, `actualizar-perfil.dto.ts`, `apps/web/src/hooks/use-formulario-registro.ts` y `apps/web/src/components/perfil-formulario.tsx`, sin cambiar comportamiento; `TELEFONO_REGEX` ya está en shared-types y se reusa) y su test unitario en `apps/api/test/unit/registro-compartido.spec.ts` — FR-031, research #9
- [x] T007 **[Lote 0 global: hecho salvo `sinAccesoALaApp` y el test `duplicados.spec.ts` (normalizarTelefono ya testeado) → lote D]** [P] En `packages/shared-types/src/persona.ts`: `email: string | null` en los tipos de Persona que puede devolver la API, `sinAccesoALaApp`, `DatosAltaPersona`, `CoincidenciaDuplicado`, `normalizarTelefono`, `normalizarNombre`, `sonPosiblesDuplicados`; test unitario en `apps/api/test/unit/duplicados.spec.ts` con las tres formas del mismo teléfono, otro país, tildes/mayúsculas/espacios y homónimo con otra fecha — FR-030, FR-035, research #7, SC-007
- [x] T008 **[Lote 0 global: permisos hechos; la matriz completa de FR-028 en el test → lote A] [Lote A: matriz en `camino.spec.ts`]** [P] En `packages/shared-types/src/permisos.ts`: permisos `personas.alta`, `personas.editar_email`, `historial.resolver`, `completitud_manual.gestionar` (solo `admin`); actualizar el test del catálogo para afirmar la matriz de FR-028 (incluido que `discipulador` NO tiene `personas.alta` y sí `solicitudes.crear_en_nombre`, `personas.buscar`, `mis_discipulados.*`, `mi_disponibilidad.*`) — FR-028, FR-029
- [x] T009 **[Lote 0 global: hecho, con traducción en los dos es.json]** [P] En `packages/shared-types/src/error-code.ts`: los nueve códigos de `data-model.md`; los de campo (`ALTA_MENOR_DE_EDAD`, `COMENTARIO_DEMASIADO_LARGO`, `NOTA_DEMASIADO_LARGA`, y `MOTIVO_DEMASIADO_LARGO` reusado) **no** van ahí; todos con su traducción en los dos `es.json` (mensaje que dice cómo corregir) — FR-041
- [x] T010 **[Lote 0 global: reemplazado por `CATALOGO_AVISOS` (D197, `packages/shared-types/src/avisos.ts`): eventos `historial.*`]** [P] Crear `packages/shared-types/src/eventos-historial.ts` con los cuatro eventos de `contracts/eventos.md` — FR-018

**Base de datos**

- [x] T011 **[Lote 0 global: hecho, en la migración única `20261008120000_lote_0_global`]** En `apps/api/prisma/schema.prisma`: enums `EtapaCamino`, `EstadoDeclaracion`, `OrigenCompletitud`; modelos `DeclaracionHistorial` y `CompletitudManual`; `Persona.email String? @unique`; `Persona.telefonoNormalizado` con `@@index`, y `@@index([fechaNacimiento])` — FR-030, Key Entities, data-model
- [x] T012 **[Lote 0 global: `telefonoNormalizado` lo calcula un trigger (`normalizar_telefono`), no `PersonaService`]** Migración `apps/api/prisma/migrations/<fecha>_camino_historial_email_opcional/` generada por Prisma + el SQL a mano de `data-model.md` (índices únicos parciales, CHECK, backfill de `telefonoNormalizado`); registro (`PersonaService.create`) y edición de perfil escriben `telefonoNormalizado` con `normalizarTelefono` — FR-010, FR-015
- [x] T013 **[Lote A: hecho (índices parciales, CHECK y emails NULL); el teléfono ya lo cubre `lote-0-global.integration-spec.ts`]** **[Lote 0 global: el teléfono normalizado vs TS ya está en `lote-0-global.integration-spec.ts`; índices parciales y CHECK → lote A]** Test de integración `apps/api/test/integration/camino-esquema.integration-spec.ts`: el índice parcial rechaza dos `pendiente` de la misma etapa y dos Completitudes vigentes; los CHECK rechazan estados incoherentes; dos Personas con `email = NULL` conviven; el backfill SQL de `telefonoNormalizado` coincide con `normalizarTelefono` en todos los teléfonos del seed — FR-010, FR-015, FR-030
- [x] T014 **[Lote 0 global: hecho]** Corregir en el mismo commit que T011 todo lo que deja de compilar por `email` opcional (tipos de `apps/api`, selects, fixtures de tests) — FR-038 (la auditoría de pantallas es T072)

**Módulo `camino` y servicios compartidos**

- [x] T015 **[Lote 0 global: hecho; `cursaOCompletoVidaNueva` aplica la misma regla en una consulta (filtra por categoría)]** Crear `apps/api/src/camino/camino.module.ts` (registrado en `app.module.ts`) y `apps/api/src/camino/consultas.ts` con `completoEtapa(tx, personaId, etapa): Promise<ComoSeCompleto | null>` (VN por sistema: Inscripción `completada` en un Curso de categoría `vida_nueva`; todas: Completitud vigente) y `bloquearPersona(tx, personaId)`, como funciones de transacción sin DI (sin ciclo de módulos con `solicitud-discipulado`, research #5); `cursaOCompletoVidaNueva` de `apps/api/src/discipulado/consultas.ts` pasa a usar `completoEtapa` para la parte "completó" (una sola consulta, Principio XI) — FR-016, research #5, D155
- [x] T016 **[Lote 0 global: en `lote-0-global.integration-spec.ts`]** Test de integración `apps/api/test/integration/completo-etapa.integration-spec.ts` de `completoEtapa`: sin nada; VN por Grupo finalizado; VN por Completitud; Completitud anulada no cuenta; Bautismo/VS/Ministerio solo por Completitud — FR-016, SC-004
- [x] T017 **[Lote 0 global: reemplazado por `NotificacionesService.emitir(tx, …)` (D197)]** [P] Crear `apps/api/src/camino/eventos.ts` (`emitirEventoHistorial`, mismo mecanismo no-op que `discipulado/eventos.ts`) y `apps/api/test/unit/eventos-historial.spec.ts` modelado en `eventos-discipulado.spec.ts` (cada evento con su destinatario y datos, sin datos personales) — FR-018

**Piezas de interfaz compartidas**

- [ ] T018 **[Lote 0 global: → lote C]** Mover (`git mv`) `apps/backoffice/src/components/pedir-en-nombre-de.tsx` a `packages/ui/src/components/pedir-en-nombre-de.tsx`, sin dependencias de Next ni de `apiFetch`: recibe `buscar(q)`, `enviar(personaId, franjas)` y las etiquetas por props; textos de "no la encontramos" que remiten al equipo, sin alta (FR-029); exportar en `packages/ui/src/index.ts`; adaptar el uso del Admin en `apps/backoffice/src/app/solicitudes/solicitudes-cliente.tsx` sin cambio de comportamiento — FR-026, FR-029, research #11
- [x] T019 **[Lote A: hecho; `CardEtapa` exportada en el bloque de la 006 de `packages/ui/src/index.ts`]** **[Lote 0 global: → lote A; el contrato de las acciones por etapa ya está (`mi-camino/acciones-etapa.ts` y `tarjeta-<etapa>.tsx`)]** [P] Crear `packages/ui/src/components/card-etapa.tsx`: título, descripción (con `first-letter:uppercase`), estado con ícono + texto, zona de acciones, y `render` del enlace por prop (sin Next); sin rol de enlace cuando no hay destino — FR-001, FR-002, FR-004, research #3
- [ ] T020 **[Lote 0 global: → lote C]** [P] Crear `requerirPermiso(permiso)` en `apps/web/src/auth.ts` sobre `tienePermiso(session.user.rol, permiso)` de `shared-types` (sin permiso → `redirect('/mi-camino')`); el backoffice conserva su `tienePermisoSesion` — FR-024, contracts/navegacion.md
- [ ] T021 **[Lote 0 global: D150 lo hace la sesión `ajustes-ux` para las dos apps (specs/IMPLEMENTACION.md)]** D150 en `apps/web` (research #12): si `main` todavía no lo tiene, tamaño por defecto de 44 px y `text-base` para el `Button` que usa la web app y para etiquetas/ayudas de formularios; actualizar `docs/15-guia-ux-ui.md` §Celular; si ya existe, cerrar la tarea anotando el commit que lo trajo — FR-027
- [ ] T022 **[Lote 0 global: → lote C] [Lote A: hecho `rutasRelacionadas` + `esItemActual` (en `camino.ts`) + `aria-current` por prefijo en `nav-app-bar.tsx`, con `test/unit/nav-app-actual.spec.ts`, porque `/mi-camino/vida-nueva` ya lo necesitaba; falta `SUBNAV_MI_CAMINO` → lote C]** [P] `apps/web/src/config/nav-app.ts`: `rutasRelacionadas` en Mi camino y `SUBNAV_MI_CAMINO` con permiso; `nav-app-bar.tsx` marca `aria-current` por prefijo (la función `esItemActual(item, pathname)` pura, en `shared-types`, con test en `apps/api/test/unit/nav-app-actual.spec.ts` para `/mi-camino/vida-nueva`, `/mis-discipulados/x`, `/mi-disponibilidad` y `/mis-eventos`) — FR-023
- [ ] T023 **[Lote 0 global: → lote C (y `/personas/nueva` → lote D); ver el bloque reservado en `nav.ts`]** [P] `apps/backoffice/src/config/nav.ts`: sacar `/mis-discipulados`, `/mis-discipulados/[id]`, `/mi-disponibilidad`, `/mis-grupos`; agregar `/personas/nueva` (`personas.alta`) y `/solicitudes/historial/[id]` (`solicitudes.ver`) con `enMenu: false`; borrar `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad,mis-grupos}/` del menú (las páginas se borran en T061; la regla `pantalla-declara-permiso` debe seguir pasando en este commit — si no, este cambio de `nav.ts` va junto con T061). `itemDeAterrizaje` para Discipulador solo → `null` lo cubre T053 — FR-025, contracts/navegacion.md

**Seed**

- [ ] T024 **[Lote 0 global: cada lote suma sus casos al seed demo y a los fixtures] [Lote A: declaraciones y Completitudes en `seed-demo/006-camino.ts`; Personas sin email y duplicados → lote D]** Fixtures de test y `apps/api/prisma/seed-demo.ts` con los casos de `data-model.md` §Seed demo (declaraciones en cada estado, Completitudes vigentes y anuladas, Personas sin email, pares duplicados, datos hostiles) — FR-043

**Checkpoint**: shared-types, esquema, `completoEtapa` (`apps/api/src/camino/consultas.ts`), piezas de `packages/ui`, navegación y seed listos. Los lotes A–D pueden arrancar.

---

## Phase 3: User Story 1 — Mi camino por etapas (P1) 🎯 MVP · lote A

**Goal**: Mi camino muestra las cuatro etapas con su explicación y estado; Vida Nueva lleva a lo de la 004.

**Independent Test**: las Personas del seed muestran el estado correcto en las cuatro cards y la de Vida Nueva lleva a la pantalla correcta (spec, Historia 1).

### Tests

- [x] T025 **[Lote A: hecho]** [P] [US1] Test de integración `apps/api/test/integration/camino-me.integration-spec.ts` para `GET /camino/me`: siempre cuatro etapas en orden; Persona sin nada, con pedido (`buscando`), con Grupo en curso, finalizada, `baja`, menor de 12; `vidaNueva` igual a `GET /discipulado/me`; sin sesión 401; última declaración `rechazada` → `no_confirmada`, rechazada y después retirada → sin mensaje — FR-001, FR-005, FR-007, SC-002
- [x] T026 **[Lote A: hecho salvo el `error.tsx` con reintentar: la llamada la hace el Server Component desde el servidor y Playwright no la puede interceptar → revisión manual (T085)]** [P] [US1] E2E `apps/web/e2e/mi-camino-etapas.spec.ts` (`@celular` y escritorio, axe claro/oscuro): cuatro cards en orden; VN disponible → `/mi-camino/vida-nueva`; tres "Próximamente" cuya card no es enlace y cuya única acción es "Ya lo hice"; subtítulos iguales a los de `/primeros-pasos`; estados con texto visible (no solo color); menor de 12 sin botón; API caída (ruta interceptada) → `error.tsx` con reintentar que funciona — Historia 1 escenarios 1–6, SC-001 (apoyo), SC-008
- [x] T027 **[Lote A: hecho; los helpers compartidos pasaron a `e2e/helpers-006.ts`]** [P] [US1] Actualizar `apps/web/e2e/mi-camino-vida-nueva.spec.ts` (004) a la ruta `/mi-camino/vida-nueva`, sin cambiar lo que afirma — FR-005

### Implementation

- [x] T028 **[Lote A: hecho; la respuesta suma `sede` (contacto para T041)]** [US1] `CaminoService.estadoDeEtapas(personaId)`: junta `HechosCamino` (reusa `estadoPropio` de `solicitud-discipulado` para `vidaNueva`, declaraciones recientes y Completitudes, en paralelo) y aplica `estadoDeEtapa`; `GET /camino/me` en `apps/api/src/camino/camino.controller.ts` — FR-007, contracts/camino-api.md
- [x] T029 **[Lote A: hecho con un cambio: `mi-camino-cliente.tsx` es de la sesión ajustes-ux (IMPLEMENTACION §4), así que NO se movió — `vida-nueva/page.tsx` lo importa de `../mi-camino-cliente`]** [US1] Mover el contenido de `apps/web/src/app/(app)/mi-camino/{page.tsx,mi-camino-cliente.tsx}` a `apps/web/src/app/(app)/mi-camino/vida-nueva/` (`page.tsx`, `vida-nueva-cliente.tsx`, `loading.tsx`, `error.tsx`, miga "Mi camino › Vida Nueva"), sin cambio de comportamiento — FR-005
- [x] T030 **[Lote A: hecho con un cambio: `primeros-pasos/page.tsx` y `primerosPasos.*` son de ajustes-ux, así que Mi camino LEE `primerosPasos.paso2/3/4Descripcion` (una sola fuente, sin copia) y Bautismo va en `etapas.descripciones.bautismo` (provisorio D98)]** [US1] Mover los textos `primerosPasos.paso2Descripcion`…`paso4Descripcion` a `etapas.<etapa>.descripcion` (único namespace de descripciones) en `apps/web/src/messages/es.json` y hacer que `apps/web/src/app/(publica)/primeros-pasos/page.tsx` los lea de ahí; sumar `etapas.bautismo.descripcion` provisorio (marcado D98) — FR-001, research #3
- [x] T031 **[Lote A: hecho]** [US1] Rehacer `apps/web/src/app/(app)/mi-camino/page.tsx`: pide `GET /camino/me`, pinta una `CardEtapa` por etapa con el texto de su estado (para VN, el de la 004 según `vidaNueva`) y "¿Y ahora qué?"; `loading.tsx` con cuatro esqueletos; `error.tsx` con reintentar — FR-001, FR-002, FR-004, FR-005, FR-006
- [x] T032 **[Lote A: checklist pasada: una acción principal por card; carga/error/éxito; "¿y ahora qué?" en cada estado; tono; 375 px sin scroll horizontal y botones ≥ 44 px (e2e @celular); axe claro/oscuro]** [US1] Checklist `docs/15` para `/mi-camino` (rehecha): una acción principal por card, estados de carga/error/éxito, se entiende qué sigue en cada estado, tono, celular 375 px con teclado y lector de pantalla, contraste claro/oscuro — D114
- [x] T033 **[Lote A: checklist pasada: miga "Mi camino › Vida Nueva", `loading.tsx`/`error.tsx` propios, comportamiento de la 004 sin cambios (e2e de la 004 en la ruta nueva)]** [US1] Checklist `docs/15` para `/mi-camino/vida-nueva` (nueva ruta del contenido de la 004) — D114
- [x] T034 **[Lote A: sin cambios en `/primeros-pasos` (sus textos no se movieron, ver T030)]** [P] [US1] Checklist `docs/15` para `/primeros-pasos` (cambia la fuente de sus textos; verificar que se ve igual) — D114

**Checkpoint**: Mi camino por etapas funciona solo, con historial todavía sin conectar.

---

## Phase 4: User Story 2 — Historial previo y Completitud Manual (P1) · lotes A (Persona) y B (Admin)

**Goal**: "Ya lo hice" → declaración → el Admin confirma o rechaza → Completitud Manual; registro directo y anulación.

**Independent Test**: declarar Vida Nueva, confirmar desde la bandeja, ver "Registrado por la iglesia" y que el pedido de VN se rechace (spec, Historia 2).

### Tests

- [x] T035 **[Lote A: hecho]** [P] [US2] Integración `apps/api/test/integration/declaraciones.integration-spec.ts` (lote A): declarar (201); segunda pendiente de la misma etapa → `DECLARACION_YA_PENDIENTE`; con VN `buscando`/en curso → `ETAPA_EN_CURSO`; con Completitud → `ETAPA_YA_COMPLETADA`; menor de 12 → `EDAD_INSUFICIENTE_PARA_PEDIR_SOLO`; comentario de 501 → `VALIDACION`; retirar propia (204), ajena (404), no pendiente (409); `declaracion_historial_creada` se emite una sola vez y después del commit (no si la transacción falla) — FR-008 a FR-011, FR-018, Historia 2 escenarios 1, 4, 5
- [ ] T036 [P] [US2] Integración `apps/api/test/integration/historial-admin.integration-spec.ts` (lote B): confirmar crea exactamente una Completitud `origen: declaracion`, no cambia `Persona.rol` (FR-019) y emite `declaracion_historial_confirmada` una vez; rechazar emite `declaracion_historial_rechazada`; registro directo emite `completitud_manual_registrada` (y `…_confirmada` si había declaración); confirmar una ya retirada → `DECLARACION_NO_PENDIENTE`; registrar VN con VN completada por Grupo → `ETAPA_YA_COMPLETADA`; anular la de VN vuelve a ofrecer el pedido en `GET /camino/me`; doble confirmación concurrente → una gana; rechazar con motivo y verlo en `GET /camino/me`; confirmar con la etapa ya completa por sistema → `ETAPA_YA_COMPLETADA`; registro directo (con y sin declaración pendiente); registro con VN en curso → `ETAPA_EN_CURSO`; anular y volver a registrar; anular dos veces → `COMPLETITUD_NO_VIGENTE`; Pastor 403 en escrituras y 200 en lecturas; Discipulador 403 — FR-013 a FR-015, Historia 2 escenarios 2, 3, 7, 8, 9
- [ ] T037 [P] [US2] Integración `apps/api/test/integration/pedido-vs-historial.integration-spec.ts` (lote B): pedir VN (propio y en nombre) con declaración pendiente → `HISTORIAL_VIDA_NUEVA_EN_REVISION`; con Completitud → `VIDA_NUEVA_COMPLETADA_POR_HISTORIAL`; carrera pedir ∥ declarar → exactamente uno gana; después de confirmar, `completoEtapa` = `historial` — FR-017, Historia 2 escenario 6, SC-004
- [ ] T038 [P] [US2] Integración de la bandeja (`apps/api/test/integration/bandeja-tipos.integration-spec.ts`): `GET /solicitudes` devuelve los dos tipos con la forma base, filtra por `tipo`, aplica el mapeo de estado/orden/buscar por tipo de `contracts/historial-admin-api.md`, pagina sobre la unión, y las filas de Discipulado no cambian salvo `tipo`/`detalle`; `GET /discipulado/pendientes-admin` cuenta las declaraciones pendientes — FR-012
- [ ] T039 [US2] E2E `apps/web/e2e/historial-previo.spec.ts` + `apps/backoffice/e2e/historial-previo.spec.ts` (va al final, cruza A y B; axe claro/oscuro; web en `@celular`): declarar Bautismo con comentario → "en revisión" → Admin confirma → "Registrado por la iglesia"; declarar VS → Admin no confirma con motivo → mensaje amable con el motivo y "Ya lo hice" otra vez; diálogos neutros (no rojos); la tarjeta de pendientes del Inicio del backoffice muestra "Historial previo por revisar" — Historia 2 escenarios 1–3, SC-003, FR-009, FR-011, FR-012
- [ ] T039a [US2] Extender `apps/backoffice/e2e/pastor-solo-lectura.spec.ts`: el Pastor ve `/solicitudes/historial/[id]` y el panel "Etapas" de Personas sin "Confirmar", "No confirmar", "Registrar" ni "Anular" — Historia 2 escenario 9

### Implementation — lote A (Persona)

- [x] T040 **[Lote A: hecho; el aviso `historial.declaracion_creada` se emite DENTRO de la transacción (D197 reemplaza al "después del commit" de la convención de arriba)]** [US2] `POST /camino/me/declaraciones` y `DELETE /camino/me/declaraciones/:id` en `camino.controller.ts`/`camino.service.ts` (bloqueo de Persona, `puedeDeclarar`, traducción de la violación del índice a `DECLARACION_YA_PENDIENTE`, evento) — FR-008 a FR-011, contracts/camino-api.md
- [x] T041 **[Lote A: hecho (`acciones-historial.tsx`); confirmaciones con `tono="neutro"`]** [US2] En `apps/web/src/app/(app)/mi-camino/`: "Ya lo hice" en cada card con `puedeDeclarar` (diálogo neutro con comentario opcional ≤ 500 y contador), estado "La iglesia lo está revisando" con "Retirar" (confirmación neutra), "Registrado por la iglesia", y el mensaje de no confirmada con motivo y el contacto de la Sede de la Persona (`Sede.contactoTelefono`, como Visitanos; si no hay, "acercate a la Sede"); actualiza la card sin recargar — FR-002, FR-008, FR-009, FR-011, FR-040, D151
- [x] T042 **[Lote A: checklist pasada: foco al abrir (en el comentario) y al cerrar, Escape, resumen de errores con foco, contador, envío protegido con `useEnvio`; e2e con axe en los dos temas]** [US2] Checklist `docs/15` para el diálogo "Ya lo hice" y los estados de historial en `/mi-camino` (foco al abrir y al cerrar, Escape, lector de pantalla, envío protegido) — D114

### Implementation — lote B (Admin)

- [ ] T043 [US2] `apps/api/src/camino/historial-admin.service.ts` + `.controller.ts`: `GET /historial/declaraciones/:id`, `POST …/confirmar`, `POST …/rechazar`, `GET /personas/:id/camino`, `POST /personas/:id/completitudes`, `POST /personas/:id/completitudes/:id/anular`, cada transición con su `emitirEventoHistorial` después del commit — FR-013, FR-014, FR-015, FR-018, contracts/historial-admin-api.md
- [ ] T044 [US2] En `apps/api/src/solicitud-discipulado/solicitud-discipulado.service.ts`: `crear()` llama a `bloquearPersona` al principio y rechaza por historial (con `completoEtapa` y la declaración pendiente) antes de las reglas existentes; `GET /solicitudes` une los dos tipos con el mapeo de `contracts/historial-admin-api.md` (research #6) — FR-012, FR-017
- [ ] T045 [US2] `apps/backoffice/src/app/solicitudes/`: filtro por tipo visible; columna/insignia de etapa en las filas de historial; cada fila enlaza a su detalle — FR-012
- [ ] T045a [US2] Pendientes del Admin: `apps/api/src/discipulado/pendientes-admin.service.ts` suma la cantidad de declaraciones pendientes y `apps/backoffice/src/app/` (tarjeta de pendientes del Inicio) muestra "Historial previo por revisar" con enlace a la bandeja filtrada — FR-012
- [ ] T046 [US2] `apps/backoffice/src/app/solicitudes/historial/[id]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`): datos, comentario, contexto, "Confirmar" (principal) y "No confirmar" con motivo opcional que avisa que la Persona lo lee; Pastor sin acciones; recarga si la API responde `DECLARACION_NO_PENDIENTE` — FR-013, D151
- [ ] T047 [US2] `apps/backoffice/src/app/personas/acciones-etapas.tsx` (y su uso en `personas-cliente.tsx`): acción "Etapas" por fila → panel lateral con el estado de las cuatro etapas (`GET /personas/:id/camino`), "Registrar una etapa hecha" (etapa + nota opcional) y "Anular" (confirmación: es reversible registrando de nuevo, estilo neutro); solo lectura para el Pastor — FR-014, FR-015
- [ ] T048 [US2] Checklist `docs/15` para `/solicitudes` (modificada) — D114
- [ ] T049 [US2] Checklist `docs/15` para `/solicitudes/historial/[id]` (nueva) — D114
- [ ] T050 [US2] Checklist `docs/15` para el panel "Etapas" de `/personas` — D114
- [ ] T050a [US2] Checklist `docs/15` para `/` (Inicio del backoffice, tarjeta de pendientes con historial) — D114

**Checkpoint**: el historial previo funciona de punta a punta; `completoEtapa` queda listo para las specs de cada etapa.

---

## Phase 5: User Story 3 — El Discipulador en la web app (P1) · lote C

**Goal**: Mis discipulados, su detalle y Mi disponibilidad en `apps/web`, con la misma API; el backoffice ya no los tiene.

**Independent Test**: la Discipuladora del seed recorre el ciclo de la 004 solo desde la web app en 375 px; en el backoffice aterriza en "Lo tuyo está en la app" (spec, Historia 3).

### Tests

- [ ] T051 [P] [US3] Mover a `apps/web/e2e/` los e2e del lado del Discipulador (`mi-disponibilidad.spec.ts`, la parte del Discipulador de `discipulado-encuentros.spec.ts`, `propuestas.spec.ts`, `discipulado-baja.spec.ts`, `discipulado-finalizacion.spec.ts`), apuntando a las rutas de la web app y con `@celular`; lo del Admin queda en el backoffice. Partir `apps/backoffice/e2e/vida-nueva-flujo-completo.spec.ts` en un flujo que cruza las dos apps (Admin en 3002, Discipuladora en 3001) — vive en `apps/web/e2e/` con la URL del backoffice por variable; ajustar `pendientes-tutor.spec.ts` (la referencia a Mis discipulados) y sacar `/mi-disponibilidad` de `RUTAS_SIN_CHEQUEO_PROPIO_ANTES` en `sesion-requerida.spec.ts` — FR-020, SC-005
- [ ] T052 [P] [US3] E2E `apps/web/e2e/discipulador-web.spec.ts` (`@celular`, axe claro/oscuro): selector visible para la Discipuladora e invisible para otra Persona; pestaña Mi camino actual en las tres rutas; aviso de pendientes en Inicio con el número correcto y ausente sin pendientes; `/mis-discipulados` sin rol → Mi camino; ciclo aceptar → Encuentro con ausencia → proponer finalizar → franja → período sin scroll horizontal a 375 px y con objetivos ≥ 44 px — Historia 3 escenarios 1–6, FR-021 a FR-024, FR-027, SC-005
- [ ] T053 [P] [US3] E2E `apps/backoffice/e2e/lo-tuyo-en-la-app.spec.ts`: Discipuladora sin otros roles → pantalla terminal con "Ir a la app"; las cuatro rutas viejas redirigen a la web app (con el id); Líder de curso solo → misma pantalla; Admin y Pastor no ven los ítems; actualizar `aterrizaje.spec.ts`, `axe-todas-las-rutas.spec.ts`, `dev-entrar.spec.ts`, `pastor-solo-lectura.spec.ts`, `sesion-requerida.spec.ts` y `helpers.ts` — Historia 3 escenarios 7–8, FR-025, SC-006
- [ ] T054 [P] [US3] Test unitario `apps/api/test/unit/pendientes-discipulador.spec.ts` de `pendientesDelDiscipulador(respuestaMisDiscipulados)` (pura, en `packages/shared-types/src/discipulado.ts`): propuestas pendientes + finalizaciones/bajas rechazadas no vueltas a proponer — FR-021, FR-022

### Implementation

- [ ] T055 [US3] `git mv apps/backoffice/src/app/mis-discipulados apps/web/src/app/(app)/mis-discipulados` (con `[id]/`, `panel-motivo.tsx`, `formulario-encuentro.tsx`, `comun.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`) y adaptar a la web app: `requerirPermiso('mis_discipulados.ver')`, `auth()`/`apiToken` de la web, mensajes movidos al `es.json` de la web, migas de `contracts/navegacion.md`, sin menú lateral — FR-020, FR-024, research #11
- [ ] T056 [US3] `git mv apps/backoffice/src/app/mi-disponibilidad apps/web/src/app/(app)/mi-disponibilidad` (con `editar-periodo.tsx`) y adaptar igual (`mi_disponibilidad.ver`) — FR-020, FR-024
- [ ] T057 [US3] En Mis discipulados: sección "Pendientes" primero (propuestas + rechazos de finalización/baja con su motivo), después discipulados; enlace a Mi disponibilidad; `pendientesDelDiscipulador` en `packages/shared-types/src/discipulado.ts` — FR-021
- [ ] T058 [US3] `apps/web/src/app/(app)/mi-camino/selector-mi-camino.tsx` (desde `SUBNAV_MI_CAMINO`, visible con ≥ 2 ítems, `<nav>` con `aria-label`, enlaces reales, activo sin depender del color) en `/mi-camino`, `/mis-discipulados` y `/mi-disponibilidad` — FR-023, D156
- [ ] T059 [US3] `apps/web/src/app/(app)/inicio/page.tsx`: pasar sus textos fijos ("Hola,", "Este es tu Inicio…") a `next-intl` (D84), agregar `loading.tsx` y `error.tsx`, y el aviso de pendientes para quien tiene `mis_discipulados.ver` (plural por ICU; si la llamada de pendientes falla, el aviso no se muestra y el Inicio sigue) — FR-022, Principio VIII
- [ ] T060 [US3] Ajustar las pantallas movidas a D150/D151: tamaños, confirmaciones neutras para declinar, retirar y borrar franja/período; zona del pulgar — FR-027
- [ ] T061 [US3] Backoffice: borrar `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad,mis-grupos}/` (lo que no se movió en T055/T056) y agregar las cuatro redirecciones a `redirects()` de `apps/backoffice/next.config.ts`; la pantalla terminal de `itemDeAterrizaje === null` (`app/page.tsx`, `not-found.tsx` o `boton-aterrizaje.tsx`) elige su texto **por permiso** (`tienePermisoSesion(s, 'mis_discipulados.ver')` / `'mis_grupos.ver'`), nunca por rol literal (reglas `sin-rol-de-sesion-en-pantallas` y `pantalla-declara-permiso` en verde); borrar los mensajes del backoffice que quedaron sin uso — FR-025, research #14
- [ ] T062 [US3] Checklist `docs/15` para `/mis-discipulados` en la web app — D114
- [ ] T063 [US3] Checklist `docs/15` para `/mis-discipulados/[id]` en la web app — D114
- [ ] T064 [US3] Checklist `docs/15` para `/mi-disponibilidad` en la web app — D114
- [ ] T065 [US3] Checklist `docs/15` para `/inicio` (aviso de pendientes) — D114
- [ ] T066 [US3] Checklist `docs/15` para la pantalla terminal "Lo tuyo está en la app" del backoffice — D114

**Checkpoint**: el Discipulador trabaja solo desde la web app; el backoffice es del Admin y el Pastor.

---

## Phase 6: User Story 4 — Pedir Vida Nueva en nombre de alguien, desde la web (P2) · lote C

**Goal**: el Discipulador pide en nombre de alguien sin app desde la web; no puede dar de alta.

**Independent Test**: el pedido en nombre aparece en la bandeja con el Discipulador como creador; el alta le da 403 (spec, Historia 4).

- [ ] T067 [P] [US4] E2E en `apps/web/e2e/discipulador-web.spec.ts` (`@celular`, axe): pedir en nombre de una Persona sin email con dos franjas → "Listo, el equipo lo revisa"; Persona con pedido abierto o declaración pendiente → mensaje debajo del buscador; búsqueda sin resultados → texto que remite al equipo, sin botón de alta — Historia 4 escenarios 1–3
- [ ] T068 [P] [US4] Integración en `apps/api/test/integration/personas-alta.integration-spec.ts`: `POST /personas/alta` con token de Discipulador → 403 — Historia 4 escenario 4, FR-029
- [ ] T069 [US4] En `apps/web/src/app/(app)/mis-discipulados/`: "Pedir Vida Nueva en nombre de…" con `PedirEnNombreDe` de `packages/ui` (búsqueda `GET /personas/buscar`, envío `POST /discipulado/solicitudes`, solo con `solicitudes.crear_en_nombre`); mostrar los códigos de FR-017 y de la 004 debajo del buscador — FR-020, FR-026, FR-028, D143
- [ ] T070 [US4] Revisar textos de `apps/web` y `apps/backoffice` que sugieran que el Discipulador da de alta (ayudas, estados vacíos) y remitir al Admin — FR-029
- [ ] T071 [US4] Checklist `docs/15` para "Pedir Vida Nueva en nombre de…" en la web app (panel dentro de `/mis-discipulados`) — D114

---

## Phase 7: User Story 5 — Alta de adultos por el Admin (P2) · lote D

**Goal**: el Admin da de alta Personas adultas con email opcional y aviso de posible duplicado.

**Independent Test**: alta sin email → "Sin acceso a la app"; segunda alta con el mismo teléfono → aviso y "crear igual"; email usado → error en el campo (spec, Historia 5).

### Tests

- [ ] T072 [P] [US5] Auditoría de `email` (FR-038): `grep -rn "\.email" apps/ packages/` sin `!` ni `.toLowerCase()` sobre un posible `null`; `PersonasCliente`, panel de roles, `PedirEnNombreDe`, auditoría de cambios de rol y vista administrativa de discipulados con una Persona sin email del seed — test de componente o e2e por cada pantalla que lo muestre — FR-038
- [ ] T073 [P] [US5] Integración `apps/api/test/integration/personas-alta.integration-spec.ts`: alta sin email (activa, `origenAlta: admin`, `altaPor`, consentimiento presencial, `miembro_registrado`); con email (normalizado); email duplicado → `EMAIL_DUPLICADO` en el campo; menor → `ALTA_MENOR_DE_EDAD` en el campo; datos faltantes → todos los errores de campo juntos (incluido `ALTA_MENOR_DE_EDAD` si corresponde); aviso por teléfono escrito de tres formas; aviso por nombre+apellido+fecha con tildes; homónimo con otra fecha no avisa; aviso contra Persona inactiva; reintento con `confirmarPosibleDuplicado` crea; doble envío concurrente con el mismo email → una sola; Pastor 403; `PATCH /personas/:id/email` a quien no tiene (200), a quien tiene (`EMAIL_YA_CARGADO`), duplicado; login por `GET /personas/by-email` sigue igual — FR-030 a FR-037, Historia 5 escenarios 1, 3–9, SC-007
- [ ] T074 [P] [US5] E2E `apps/backoffice/e2e/personas-alta.spec.ts` (axe claro/oscuro, escritorio y `@celular`): envío vacío → errores por campo, resumen con enlaces y foco; alta sin email → éxito con "qué sigue" e insignia "Sin acceso a la app"; aviso de duplicado con enlace a la existente y "Es otra persona, crear igual" sin recargar datos; doble toque → una sola Persona; "Agregar email"; Pastor sin botones — Historia 5 escenarios 1–9, FR-039, SC-007

### Implementation

- [ ] T075 [US5] `apps/api/src/persona/dto/alta-persona.dto.ts` (usa `erroresDeDatosPersonales` + email opcional + consentimiento) y que `registro-persona.dto.ts` y `actualizar-perfil.dto.ts` usen la misma función compartida — FR-031, research #9
- [ ] T076 [US5] `PersonaService.alta(dto, autorId)`: validación, menor, email, búsqueda de duplicados (igualdad de `telefonoNormalizado` y candidatos por `fechaNacimiento`, comparación con `sonPosiblesDuplicados`), creación (con `telefonoNormalizado`) con `RolesDeEstadoService` en la misma transacción; `POST /personas/alta` con `@RequierePermiso('personas.alta')`; 409 con `coincidencias` — FR-032 a FR-035, contracts/personas-alta-api.md
- [ ] T077 [US5] `PATCH /personas/:id/email` (`personas.editar_email`) y `sinAccesoALaApp` en `GET /personas` y `GET /personas/buscar` — FR-037, FR-038
- [ ] T078 [US5] Bajar a `packages/ui` los campos del registro que el alta necesita y hoy viven en `apps/web` (selector de profesión con detalle, estado civil, año en que empezó a venir (D214, el selector lo deja el lote 0 en `packages/ui`), si son componentes propios) — FR-031, Principio XI
- [ ] T079 [US5] `apps/backoffice/src/app/personas/nueva/` (`page.tsx` con `requerirPermiso('personas.alta')`, `loading.tsx`, `error.tsx`): una página con secciones (datos personales, contacto, iglesia, email opcional con ayuda "Si no tiene, dejalo vacío: no va a poder entrar a la app", consentimiento), `useEnvio`, errores por campo, panel de posible duplicado y mensaje de éxito con qué sigue — FR-031, FR-035, FR-036, FR-039
- [ ] T080 [US5] `apps/backoffice/src/app/personas/` (`acciones-email.tsx` + `personas-cliente.tsx`): botón principal "Dar de alta una persona" (con `personas.alta`), insignia "Sin acceso a la app", acción "Agregar email" (con `personas.editar_email`) — FR-031, FR-037
- [ ] T081 [US5] Checklist `docs/15` para `/personas/nueva` — D114
- [ ] T082 [US5] Checklist `docs/15` para `/personas` (botón de alta, insignia, "Agregar email") — D114

---

## Phase 8: Polish & Cross-Cutting

- [ ] T083 Revisión de textos nuevos de los dos `es.json` contra el tono de `docs/15` y el glosario (ningún "Completitud Manual" ni "declaración" para la Persona) — FR-040
- [ ] T084 [P] Correr el recorrido de axe de todas las rutas en las dos apps (claro y oscuro) y el chequeo de contraste incluido `hover` de los componentes nuevos (`CardEtapa`, selector, insignia) contra `docs/17` — SC-008, H-56
- [ ] T085 Ejecutar `quickstart.md` completo a mano y anotar lo que falle como test + arreglo — SC-001, SC-003
- [ ] T086 Las tres suites en verde: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, `pnpm --filter web exec playwright test`, `pnpm --filter backoffice exec playwright test` — SC-008
- [ ] T087 Verificar que los cambios a `docs/` que hizo T000 siguen coincidiendo con lo implementado; si algo cambió durante la implementación, actualizar `docs/` en el mismo commit que el código (Principio I)

---

## Dependencies & Execution Order

- **T000** (gate): aprobación de Echu y docs, antes de todo.
- **Setup (T001–T003)** y **Foundational (T004–T024)**: lote 0, una sola sesión, primero. Bloquean todo.
- **US1 (lote A)**: depende del lote 0.
- **US2**: la parte de la Persona (T035, T040–T042) va en el lote A después de US1 (comparte `mi-camino/`); la del Admin (T036–T038, T043–T050) en el lote B, en paralelo con A. **T039** y **T039a** (e2e) van al final, cuando A y B están.
- **US3 y US4 (lote C)**: dependen del lote 0 (T018 `PedirEnNombreDe`, T020 `requerirPermiso`, T022 navegación, T002 proyecto `celular`). No comparten archivos con A, B ni D salvo `es.json` (namespaces separados).
- **US5 (lote D)**: depende del lote 0 (T006, T007, T011). Comparte `apps/backoffice/src/app/personas/personas-cliente.tsx` con T047 (lote B): **B va después de D en ese archivo**, o se coordinan agregando cada uno su acción en un componente propio (`acciones-etapas.tsx`, `acciones-email.tsx`).
- **Polish**: al final.

## Lotes (sesiones en paralelo que no se pisan)

| Lote | Tareas | Archivos principales |
|---|---|---|
| **0 — base** | T001–T024 | `packages/shared-types/src/{camino,registro,persona,permisos,error-code,eventos-historial}.ts`, `schema.prisma` + migración, `apps/api/src/camino/{camino.module,camino.service,eventos}.ts`, `packages/ui/src/components/{pedir-en-nombre-de,card-etapa}.tsx`, `apps/web/src/auth.ts`, `nav-app.ts`, `nav.ts`, `playwright.config.ts` (web), `seed-demo.ts`, `.env.example` |
| **A — Mi camino e historial (Persona)** | T025–T035, T040–T042 | `apps/api/src/camino/camino.controller.ts` (+ `estadoDeEtapas`), `apps/web/src/app/(app)/mi-camino/**`, `(publica)/primeros-pasos/page.tsx`, e2e de Mi camino |
| **B — historial (Admin)** | T036–T038, T043–T050a (incl. T045a) | `apps/api/src/camino/historial-admin.*`, `solicitud-discipulado.service.ts`, `apps/backoffice/src/app/solicitudes/**`, `pendientes-admin.service.ts`, tarjeta de pendientes del Inicio, `personas/acciones-etapas.tsx` |
| **C — Discipulador en la web** | T051–T067, T069–T071 | `apps/web/src/app/(app)/{mis-discipulados,mi-disponibilidad,inicio}/**`, `selector-mi-camino.tsx`, borrado de `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad,mis-grupos}/`, `apps/backoffice/next.config.ts`, pantalla terminal, e2e del Discipulador y los del backoffice que los nombran |
| **D — alta y email opcional** | T068, T072–T082 | `apps/api/src/persona/**` (alta, email), `apps/backoffice/src/app/personas/{nueva/**,acciones-email.tsx,personas-cliente.tsx}`, componentes de campo en `packages/ui` |
| **Cierre** | T039, T039a, T083–T087 | e2e de punta a punta del historial, revisión, suites, docs |

## Cobertura (criterio → test)

| Criterio | Test |
|---|---|
| Historia 1, escenarios 1–6 / FR-001–FR-007 | T005 (unit), T025 (integración), T026–T027 (e2e) |
| Historia 2, escenarios 1, 4, 5 / FR-008–FR-011 | T005, T035, T039 |
| Historia 2, escenarios 2, 3, 7, 8 / FR-012–FR-015 | T036, T038, T039 |
| Historia 2, escenario 9 (Pastor) | T036 (API), T039a (pantalla) |
| Historia 2, escenario 6 / FR-017 | T037 |
| FR-016 | T016, T037 |
| FR-018 | T017 (unit), T035, T036 (cada evento una vez, después del commit) |
| FR-019 | T036 (después de confirmar, `Persona.rol` no cambia) |
| Historia 3, escenarios 1–6 / FR-020–FR-024, FR-027 | T051, T052, T054, T022 (unit de `esItemActual`) |
| Historia 3, escenarios 7–8 / FR-025 | T053, T023 |
| FR-026 | T018 (bandeja del Admin sigue pasando en `solicitudes.spec.ts`), T067 |
| Historia 4 / FR-028, FR-029 | T008, T067, T068 |
| Historia 5 / FR-030–FR-037, FR-039 | T007, T013, T073, T074 |
| FR-038 | T072, T073 (login sin cambios) |
| FR-006 (estados de Mi camino) | T026 (error + reintentar) |
| FR-040–FR-042 | T009, T083, checklists por pantalla, T084 |
| FR-043 | T024 (el seed corre en `db:reset-demo` del CI) |
| SC-001, SC-003 | T085 (revisión manual), T039 (cantidad de toques) |
| SC-002 | T005, T026 |
| SC-004 | T016, T037 |
| SC-005 | T052 (375 px, 44 px) |
| SC-006 | T053 |
| SC-007 | T007, T073, T074 |
| SC-008 | T084, T086 |

## Implementation Strategy

0. **T000**: aprobación del spec por Echu, respuestas a las Preguntas y docs actualizados.
1. **Lote 0** completo y en verde (unit de shared-types desde `apps/api/test/unit/`, integración del esquema).
2. **MVP = US1** (lote A): Mi camino por etapas ya mejora la pantalla para todos.
3. En paralelo: **B** (historial del Admin), **C** (Discipulador a la web), **D** (alta). A sigue con la parte de la Persona de US2.
4. **Cierre**: T039, revisión manual (`quickstart.md`), tres suites, docs al mergear.
