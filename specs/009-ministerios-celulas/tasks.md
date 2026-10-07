# Tasks: Ministerios y Células (postulación)

**Input**: Design documents from `/specs/009-ministerios-celulas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la Constitución los exige (Principio VI): unit para toda regla con ramas, integración para lo
que cambia estado contra la base (y la concurrencia, SC-003), e2e con axe en claro y oscuro para el flujo
crítico (Principio VII). Cada criterio de éxito tiene su test (tabla al final).

**Organización**: por historia, en orden de prioridad (US1, US2, US3 son P1; US4 P2; US5, US6, US7 P3).
Cada pantalla nueva o modificada lleva su tarea de checklist de `docs/15-guia-ux-ui.md` (D114). Al final,
**Lotes** agrupa las tareas en sesiones paralelas que no se pisan.

**Convenciones que valen para todas las tareas** (no se repiten):
- Permisos solo con `@RequierePermiso` / `requerirPermiso` contra `CATALOGO_PERMISOS` (D132). Nunca un rol literal.
- Errores con Problem Details y `code` de `error-code.ts`; los de campo bajo `VALIDACION` con `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito; listados que crecen, paginados con `Pagina<T>` (H-42, docs/15 H-101).
- Textos por `next-intl`, rioplatense con voseo; colores solo de tokens (D118, H-54); estados con texto + ícono (D81, H-55).
- Botones de acción con `Button` + `useEnvio` (H-57); validación con `useValidacionCampos` + `ResumenErrores` + `MensajeErrorCampo` (H-50).
- En Next, "cargando" = `loading.tsx`, "error" = `error.tsx`; miga de pan según docs/15.
- Pantallas de `apps/web`: diseñadas a 360 px primero, letra de 16 px y `Button` de 44 px (D150); sus e2e con etiqueta `@celular` (360×740).
- Cada transición llama a `emitirEventoMinisterio()` **después** del commit (`contracts/eventos.md`).
- Confirmaciones de lo reversible (retirar, dar de baja, inactivar) neutras; rojo + ícono solo para eliminar (D151).

---

## Phase 1: Setup

- [ ] T001 Verificar en `main` actualizado: si la spec 008 ya agregó `apto_ministerio` a `RolDeEstado` (`packages/shared-types/src/permisos.ts`), si otra spec ya creó `apps/api/src/bandeja/` o `AvisoEstado` en `packages/ui`, y el último número de decisión en `docs/05-decisiones.md`. Anotar en el PR lo que ya exista para reusarlo en vez de crearlo (plan.md → Dependencias). `.specify/feature.json` apunta a `specs/009-ministerios-celulas`.

---

## Phase 2: Foundational — **lote 0** (secuencial, bloquea todo)

- [ ] T002 [P] Crear `packages/shared-types/src/ministerios.ts` según `data-model.md`: `EstadoPostulacion`, `MotivoInactivacionPostulacion`, límites (`MINISTERIO_NOMBRE_MAX`, `MINISTERIO_DESCRIPCION_MAX`, `CELULA_NOMBRE_MAX`, `POSTULACION_TEXTO_MAX`), `esAptaParaMinisterio(roles)`, `MinisterioPublico`, `MinisterioCatalogo`, `CelulaCatalogo`, `MiembroMinisterio`, `PostulacionDetalle`, `PostulacionHistorial`, `EstadoMiMinisterio` (`contracts/postulaciones-api.md`). Si no existe, `normalizarNombre()` (research #11). Exportar desde `index.ts`. (FR-001, FR-002, FR-011, FR-026, FR-027)
- [ ] T003 [P] Crear `packages/shared-types/src/solicitudes.ts` con `TipoSolicitud = 'discipulado' | 'postulacion'` y `resumenTipo` opcional en `SolicitudResumen`; re-exportar desde `discipulado.ts` para no romper imports de la 004. (FR-015)
- [ ] T004 [P] Crear `packages/shared-types/src/eventos-ministerio.ts` con `EventoMinisterio` tal cual `contracts/eventos.md`. (FR-035)
- [ ] T005 Extender `packages/shared-types/src/permisos.ts`: `ministerios.ver` [admin, pastor], `ministerios.gestionar` [admin], `ministerios.papelera.ver` [admin], `postulaciones.crear_en_nombre` [admin]; `RolDeEstado` suma `miembro_ministerio` (y `apto_ministerio` si la 008 no lo trajo, T001). (FR-018, FR-023, FR-024, FR-030)
- [ ] T006 Extender `packages/shared-types/src/error-code.ts` con los códigos de `contracts/ministerios-api.md` y `contracts/postulaciones-api.md` (reusar los genéricos de campo y de confirmación de nombre si ya existen), cada uno con el FR en un comentario; traducciones en `errors` de `apps/web/src/messages/es.json` y `apps/backoffice/src/messages/es.json`, diciendo cómo seguir. (FR-038)
- [ ] T007 [P] Unit test `apps/api/test/unit/ministerios-compartidos.spec.ts`: `esAptaParaMinisterio` (con y sin el rol, con roles de cargo), `normalizarNombre` ("Vida en Acción" ≡ " vida en accion "), y que `CATALOGO_PERMISOS` da `ministerios.gestionar` solo a admin y `ministerios.ver` a pastor. (FR-002, FR-023, FR-026)
- [ ] T008 Extender `apps/api/prisma/schema.prisma` según `data-model.md`: `Ministerio`, `Celula`, `Postulacion`, enums `EstadoPostulacion` y `MotivoInactivacionPostulacion`, índices. Migración `pnpm --filter api exec prisma migrate dev --create-only --name ministerios` + SQL a mano: índices únicos parciales `postulaciones_una_pendiente` y `postulaciones_una_aprobada`, y los CHECK de `data-model.md`. (FR-003, FR-020, FR-039)
- [ ] T009 [P] Crear `apps/api/src/ministerio/` con `ministerio.module.ts` (registrado en `app.module.ts`), `reglas-postulacion.ts` (función pura `validarNuevaPostulacion(contexto)` con las reglas en el orden de `data-model.md`, devuelve el primer código), `miembros.ts` (`miembrosActivosDe` y su versión paginada, research #12) y `eventos.ts` (`emitirEventoMinisterio`, log estructurado solo con ids). (FR-001–FR-005, FR-035, FR-036)
- [ ] T010 [P] Unit tests: `apps/api/test/unit/reglas-postulacion.spec.ts` (cada regla falla sola y el orden de precedencia: no apta gana a todo; Célula de otro Ministerio; Célula inactiva; Ministerio inactivo; ya miembro; ya pendiente; texto de 501) y `apps/api/test/unit/eventos-ministerio.spec.ts` (ningún campo fuera de ids viaja al log). (FR-002–FR-007, FR-035)
- [ ] T011 [P] Extraer `Aviso` de `apps/web/src/app/(app)/mi-camino/mi-camino-cliente.tsx` a `packages/ui/src/components/aviso-estado.tsx` (`AvisoEstado`: ícono decorativo `aria-hidden`, título, texto), exportarlo, y hacer que la card de Vida Nueva lo use (sin cambio visual: el e2e `mi-camino-vida-nueva.spec.ts` sigue verde). Si T001 encontró uno equivalente, usar ese. (FR-011, Principio XI)
- [ ] T012 [P] Namespaces nuevos en `apps/web/src/messages/es.json` (`miCamino.ministerio`, `ministerios`) y `apps/backoffice/src/messages/es.json` (`ministerios`, `postulaciones`, `nav.ministerios`, `solicitudes.tipos`), con las claves vacías de estructura; cada lote completa las suyas. Textos de estado según docs/15 "¿Y ahora qué?". (FR-037)
- [ ] T013 Nav y rutas: `apps/backoffice/src/config/nav.ts` suma `/ministerios` (`ministerios.ver`, no en menú lateral: se entra por Catálogos, D91), `/ministerios/[id]`, `/ministerios/papelera` (`ministerios.papelera.ver`) y `/solicitudes/postulacion/[id]` (`enMenu: false`), para que el smoke de axe/320 px las recorra (H-61). En `apps/web`, sumar `/mi-camino/ministerios` y su detalle a la lista de rutas del smoke `axe-todas-las-rutas.spec.ts`. (FR-031, FR-037, SC-006)
- [ ] T014 Fixtures e2e: `apps/api/scripts/sembrar-e2e-admin.ts` siembra dos Ministerios (uno con dos Células, otro sin Células), una Persona `e2e-apta@…` con `apto_ministerio`, una `e2e-no-apta@…` y una `e2e-miembro@…` con Postulación aprobada; `limpiar-e2e.ts` borra Postulaciones → Células → Ministerios de prueba antes de las Personas `e2e-` (única excepción al soft delete, datos de test). Helpers en `apps/web/e2e/helpers.ts` y `apps/backoffice/e2e/helpers.ts`: `postularComo(email, ministerio, celula?)` por API. (soporte de todos los e2e)
- [ ] T015 Extender `apps/api/prisma/seed-demo.ts` (D120): Ministerios con textos provisorios en el tono real marcados como provisorios (D98) — al menos "Vida en Acción" (Células "Comedor", "Familia") y "Bienvenida" —, uno inactivo, uno eliminado, una Célula inactiva; Postulaciones en los cinco estados, una Persona que cambió de Ministerio (inactiva por cambio + aprobada), una dada de baja, una creada en nombre de; nombre de Ministerio y de Célula al máximo con tildes y ñ, motivación de 500 caracteres. Personas `demo-` de `quickstart.md`. (FR-040)

**Checkpoint**: `pnpm --filter api run test` en verde; migración aplicada; las tres apps compilan.

---

## Phase 3: User Story 1 — Postularme a un Ministerio, eligiendo la Célula (P1) 🎯 MVP — lote A

- [ ] T016 [US1] `apps/api/src/ministerio/postulacion-persona.service.ts`: `crearPropia(personaId, ministerioId, dto)` usando `validarNuevaPostulacion`; traduce la violación de `postulaciones_una_pendiente` a `POSTULACION_YA_PENDIENTE`; `retirarPropia(personaId, id)`; `detalleParaPersona(personaId, ministerioId)` con `situacion`. Emite `postulacion_creada` / `postulacion_retirada`. (FR-001–FR-006, FR-010)
- [ ] T017 [US1] `apps/api/src/ministerio/postulacion-persona.controller.ts`: `GET /ministerios/me/:ministerioId`, `POST /ministerios/:ministerioId/postulaciones/me`, `POST /postulaciones/me/:id/retirar` (sesión `activa`, sin permiso del catálogo; recorte por identidad, D134: una ajena → 404). DTOs con los límites de shared-types. (FR-001, FR-006, FR-007, FR-010)
- [ ] T018 [P] [US1] Integración `apps/api/test/integration/postulaciones-persona.integration-spec.ts`: crea pendiente con y sin Célula; no apta → 409; Ministerio inactivo → 409; Célula de otro Ministerio → `VALIDACION` en `celulaId`; ya miembro → 409; **dos POST simultáneos → una sola pendiente y un 409, nunca 500** (SC-003); retirar propia → `retirada`; retirar ajena → 404; retirar resuelta → 409; después de retirada/rechazada puede postularse de nuevo (FR-005); `creadoPorId` null. (FR-001–FR-007, SC-003, SC-004)
- [ ] T019 [US1] `apps/web/src/app/(app)/mi-camino/ministerios/page.tsx` + `loading.tsx` + `error.tsx`: lista de Ministerios activos (de `GET /ministerios/publicos`) con descripción y Células como texto; miga "Mi camino › Ministerios"; vacío: "Todavía no hay Ministerios cargados" + volver a Mi camino. (FR-009, FR-037)
- [ ] T020 [US1] `apps/web/src/app/(app)/mi-camino/ministerios/[id]/page.tsx` + `loading.tsx` + `error.tsx` + `not-found.tsx` y `formulario-postulacion.tsx`: según `situacion`, el formulario (radio de Células + "No tengo preferencia", motivación y disponibilidad marcadas como opcionales con ayuda debajo de la etiqueta, contador de caracteres), "Ya estás sirviendo en este Ministerio", "Ya tenés una postulación en revisión a {Ministerio}" con enlace, o la explicación de no apta con enlace a Mi camino. Una sola acción principal "Postularme"; al éxito, vuelve a Mi camino con la card en `pendiente` y toast `aria-live`. (FR-001, FR-007, FR-008, FR-010, FR-037)
- [ ] T021 [P] [US1] Checklist de docs/15 sobre `/mi-camino/ministerios` (D114): acción principal, botones, cuatro estados, H-57, feedback según docs/16, qué pasa después, tono, celular 360 px + teclado + lector, contraste claro/oscuro. Anotar el resultado en el PR. (FR-037)
- [ ] T022 [P] [US1] Checklist de docs/15 sobre `/mi-camino/ministerios/[id]` (formulario: resumen de errores con foco, campos opcionales marcados, botón no tapado por el teclado). (FR-037)

---

## Phase 4: User Story 2 — Revisar Postulaciones desde la bandeja (P1) — lote B

- [ ] T023 [US2] Crear `apps/api/src/bandeja/` (research #7): `FuenteBandeja`, fuente `discipulado` (mueve la lógica de `listar` de `SolicitudDiscipuladoService` sin cambiar su resultado) y fuente `postulacion`; `GET /solicitudes` sale de `SolicitudDiscipuladoController` a `bandeja.controller.ts` con `tipo` (lista), traducción de `estado` por fuente, `UNION ALL` con orden y paginado en SQL, `buscar` por nombre/apellido. Si T001 encontró `bandeja/` ya creada, solo agregar la fuente. (FR-015)
- [ ] T024 [P] [US2] Integración `apps/api/test/integration/bandeja.integration-spec.ts`: con Solicitudes de Discipulado y Postulaciones mezcladas, el total y el orden por fecha son correctos **a través de dos páginas**; filtro `tipo=postulacion`; filtro abiertas/resueltas por fuente; `buscar`. Los tests de bandeja de la 004 (`solicitud-discipulado.integration-spec.ts`, `apps/backoffice/e2e/solicitudes.spec.ts`) siguen verdes sin cambios de expectativa. (FR-015)
- [ ] T025 [US2] `apps/api/src/ministerio/postulacion-admin.service.ts` + `postulacion-admin.controller.ts`: `GET /postulaciones/:id` (motivos internos solo con `solicitudes.aprobar`), `POST /postulaciones/:id/aprobar` (transacción con `FOR UPDATE` sobre la Persona, `confirmarCambio`, inactivación por cambio con `reemplazadaPorId`, `otorgarRolDeEstado(…, 'miembro_ministerio', tx)`, Ministerio/Célula disponibles, violación de índice → 409), `POST /postulaciones/:id/rechazar`. Emite `postulacion_aprobada` (con `reemplazaA`) / `postulacion_rechazada`. (FR-016–FR-022)
- [ ] T026 [P] [US2] Integración `apps/api/test/integration/postulaciones-admin.integration-spec.ts`: aprobar sin membresía; aprobar con membresía sin `confirmarCambio` → 409 con `ministerioActual`, con confirmación → vieja `inactiva (cambio_de_ministerio)` + nueva `aprobada` en la misma transacción; **concurrencia: la misma Postulación aprobada dos veces a la vez, y aprobada mientras otro Admin la rechaza → un solo resultado, el otro 409, nunca dos `aprobada` para la Persona** (SC-003); Ministerio o Célula inactivos → 409; rechazar con motivo; el rol `miembro_ministerio` se agrega sin borrar roles de cargo (H-139); Pastor → 403 en aprobar/rechazar y no ve motivos. (FR-016–FR-023, SC-003)
- [ ] T027 [US2] Backoffice `apps/backoffice/src/app/solicitudes/`: filtro por tipo en `ControlesTabla` (URL `tipo=`), columna Tipo (texto) y Detalle (`resumenTipo`: "Vida en Acción · Comedor"), cada fila enlaza a `/solicitudes/[id]` o `/solicitudes/postulacion/[id]` según tipo; columnas con su clase responsive (docs/15, sin scroll horizontal a 320 px). (FR-015)
- [ ] T028 [US2] `apps/backoffice/src/app/solicitudes/postulacion/[id]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `postulacion-detalle-cliente.tsx`): miga "Solicitudes › {Persona}", datos de FR-016, aviso destacado (texto + ícono) "Ya pertenece a {Ministerio}" cuando corresponde, historial; acciones "Aprobar" (principal) y "Rechazar" (secundaria, diálogo con motivo opcional); al recibir `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO`, diálogo "Esta persona ya pertenece al Ministerio X. ¿Confirmás el cambio?" y reintento con `confirmarCambio`; estado actualizado sin recargar + toast. Pastor: sin acciones. (FR-016, FR-017, FR-019, FR-021, FR-023)
- [ ] T029 [US2] Tarjeta de pendientes del Inicio (`apps/backoffice/src/app/tarjeta-pendientes.tsx` y su endpoint): "Postulaciones pendientes: N" con enlace a `/solicitudes?tipo=postulacion`; con 0, no se muestra la línea. (FR-041)
- [ ] T030 [P] [US2] Checklist de docs/15 sobre `/solicitudes` modificada (filtro por tipo, colapso en celular). (FR-037)
- [ ] T031 [P] [US2] Checklist de docs/15 sobre `/solicitudes/postulacion/[id]` (una acción principal, advertencia legible antes de actuar, feedback "acción del Admin sobre otra persona" de docs/16). (FR-037)
- [ ] T032 [P] [US2] Checklist de docs/15 sobre la tarjeta de pendientes del Inicio. (FR-041)

---

## Phase 5: User Story 3 — La card de Ministerio en Mi camino (P1) — lote A

- [ ] T033 [US3] `apps/api/src/ministerio/postulacion-persona.service.ts` → `estadoMiMinisterio(personaId)` con la precedencia de `contracts/postulaciones-api.md` (un solo query con `select` explícito), sin motivos; `GET /ministerios/me`. (FR-011, FR-012, FR-014)
- [ ] T034 [P] [US3] Unit test `apps/api/test/unit/estado-mi-ministerio.spec.ts` sobre la función pura de precedencia: `no_apta`; `puede_postularse` sin y con último desenlace (rechazada, retirada, baja; una inactiva por cambio no cuenta); `pendiente`; `miembro` sin y con pendiente a otro; Ministerio/Célula inactivos marcados; nunca aparece un motivo. (FR-011, FR-012, FR-014, SC-005)
- [ ] T035 [US3] `apps/web/src/app/(app)/mi-camino/card-ministerio.tsx` y `page.tsx` (pide `GET /ministerios/me` junto con la de Vida Nueva; el texto `proximosPasos` deja de nombrar Ministerio): un `AvisoEstado` por estado con su ícono y "¿y ahora qué?"; acciones: "Elegí un Ministerio" (principal), "Conocé los Ministerios" (no apta), "Retirar postulación" (secundaria, diálogo neutro D151), "Quiero cambiar de Ministerio" (terciaria); aviso de Ministerio/Célula inactivos con a quién consultar. Actualiza sin recargar. (FR-011–FR-014)
- [ ] T036 [P] [US3] Checklist de docs/15 sobre `/mi-camino` modificada (card de Ministerio en todos sus estados; claro/oscuro; 360 px). (FR-037)
- [ ] T037 [US3] e2e `apps/web/e2e/ministerios-postulacion.spec.ts` (`@celular` + escritorio, axe claro y oscuro en cada pantalla): no apta ve la explicación y la lista sin formulario; apta se postula con Célula, error de largo con resumen y foco (H-50), doble toque crea una sola (H-57), la card muestra pendiente, retira con diálogo neutro y vuelve a "Elegí un Ministerio"; miembro ve "Estás sirviendo en…". (US1, US3; FR-001, FR-006–FR-011, FR-013; SC-001, SC-005, SC-006)

---

## Phase 6: User Story 4 — Gestionar Ministerios y Células (P2) — lote C

- [ ] T038 [US4] `apps/api/src/ministerio/ministerio.service.ts` + `ministerio.controller.ts`: `GET /ministerios/publicos`, `GET /ministerios` (activos/todos, buscar; `papelera` → 400), `GET /ministerios/papelera`, `GET /ministerios/:id`, `GET /ministerios/:id/miembros` (paginado, usa `miembros.ts`), `POST`, `PATCH` (confirmación por nombre con miembros o pendientes, D38), `DELETE` (D119, 409 con datos relacionados), `POST :id/restaurar`. Unicidad con `normalizarNombre`. (FR-026, FR-028, FR-030–FR-032, FR-034)
- [ ] T039 [US4] `apps/api/src/ministerio/celula.service.ts` + `celula.controller.ts`: crear, editar, inactivar/reactivar (bloqueado con Ministerio inactivo, FR-029), eliminar, papelera y restaurar. (FR-027–FR-030)
- [ ] T040 [P] [US4] Integración `apps/api/test/integration/ministerios-catalogo.integration-spec.ts`: nombre duplicado (normalizado) en Ministerio y en Célula del mismo Ministerio (pero no entre Ministerios distintos); inactivar con miembros sin `confirmacionNombre` → 409 con conteos, con nombre exacto → ok, y las Postulaciones `aprobada` quedan intactas; reactivar Célula con Ministerio inactivo → 409; eliminar con Postulación o Célula → 409; eliminar sin datos → sale de `GET /ministerios` y aparece en papelera; restaurar; **ninguna fila desaparece de la base** en todo el recorrido (SC-004); `publicos` no trae inactivos ni eliminados; Pastor → 403 en escrituras y papelera. (FR-026–FR-031, FR-034, SC-004, SC-007)
- [ ] T041 [US4] Backoffice `apps/backoffice/src/app/ministerios/` (`page.tsx`, `loading.tsx`, `error.tsx`, `ministerios-cliente.tsx`): `TablaDatos` + `ControlesTabla` (búsqueda, filtro activos/todos en la URL), columnas nombre / Células activas / miembros / estado (texto + ícono, `EstadoActivoBadge`), "Crear un Ministerio" en diálogo con la confirmación que ofrece "Agregar Células" (lleva al detalle con el diálogo de Célula abierto); enlace a la papelera (solo Admin). Pastor sin acciones. (FR-026, FR-031, FR-033)
- [ ] T042 [US4] `apps/backoffice/src/app/ministerios/[id]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, detalle cliente): miga "Ministerios › {nombre}"; datos editables; Células (tabla con estado, alta en diálogo, editar, inactivar/reactivar, eliminar con botón deshabilitado + motivo + oferta de inactivar); papelera de Células colapsable (solo Admin); miembros paginados con Célula y "desde"; Inactivar/Reactivar y Eliminar del Ministerio con `ConfirmDestructiveDialog` en modo nombre exacto cuando hay miembros o pendientes (el diálogo dice cuántos), simple si no (D38). (FR-027–FR-030, FR-032)
- [ ] T043 [US4] `apps/backoffice/src/app/ministerios/papelera/` (`page.tsx`, `loading.tsx`, `error.tsx`): eliminados con fecha y quién, "Restaurar"; miga "Ministerios › Papelera". `apps/backoffice/src/app/catalogos/page.tsx`: enlace a Ministerios y el texto vacío deja de nombrarlos. (FR-030)
- [ ] T044 [P] [US4] Checklist de docs/15 sobre `/ministerios` (backoffice). (FR-037)
- [ ] T045 [P] [US4] Checklist de docs/15 sobre `/ministerios/[id]`. (FR-037)
- [ ] T046 [P] [US4] Checklist de docs/15 sobre `/ministerios/papelera` y `/catalogos` modificada. (FR-037)
- [ ] T047 [US4] e2e `apps/backoffice/e2e/ministerios-catalogo.spec.ts` (axe claro y oscuro): crear Ministerio → "Agregar Células" → dos Células; duplicado muestra el error en el campo; inactivar con miembros exige el nombre; aparece como inactivo con filtro "todos" y se reactiva (SC-007); eliminar deshabilitado con datos; eliminar uno vacío y restaurarlo desde la papelera; Pastor ve sin acciones. (US4; FR-026–FR-033; SC-006, SC-007)

---

## Phase 7: User Story 5 — Postular en nombre de una Persona sin acceso a la app (P3) — lote B

- [ ] T048 [US5] `POST /postulaciones` en `postulacion-admin.controller.ts` (`postulaciones.crear_en_nombre`), mismas reglas con `creadoPorId`. (FR-024)
- [ ] T049 [P] [US5] Integración en `postulaciones-admin.integration-spec.ts`: en nombre de una apta → `creadoPorId` del Admin; de una no apta → 409; la Persona la ve como propia en `GET /ministerios/me`. (FR-024)
- [ ] T050 [US5] Backoffice: acción "Postular en nombre de…" en `/solicitudes` (buscador de Persona con `GET /personas/buscar`, luego Ministerio, Célula y textos) con el nombre de la Persona visible durante toda la acción (docs/15); reusar el patrón de `pedir-en-nombre-de.tsx` de la 004 — si hace falta generalizarlo, extraer la parte común en vez de copiarla (Principio XI). (FR-024)
- [ ] T051 [P] [US5] Checklist de docs/15 sobre el diálogo "Postular en nombre de…". (FR-037)

---

## Phase 8: User Story 6 — Dar de baja a alguien de su Ministerio (P3) — lote C

- [ ] T052 [US6] `POST /postulaciones/:id/dar-de-baja` en `ministerio.controller.ts` (`ministerios.gestionar`): exige `aprobada`, pasa a `inactiva (baja)` con motivo opcional; emite `miembro_dado_de_baja`. Y `GET /personas/:id/ministerio` (`ministerios.ver`) para la vista unificada futura. (FR-025, FR-016)
- [ ] T053 [P] [US6] Integración en `ministerios-catalogo.integration-spec.ts`: baja de un miembro; baja de una no aprobada → 409; después puede postularse de nuevo al mismo Ministerio; `miembrosActivosDe` ya no la incluye; el rol `miembro_ministerio` sigue. (FR-005, FR-025, FR-036)
- [ ] T054 [US6] En `/ministerios/[id]`, acción "Dar de baja del Ministerio" por miembro, con diálogo neutro y motivo opcional; la fila sale de la lista con toast. (FR-025, FR-032)

---

## Phase 9: User Story 7 — La página pública muestra los Ministerios reales (P3) — lote C

- [ ] T055 [US7] `apps/web/src/app/(publica)/ministerios/page.tsx`: lee `GET /ministerios/publicos` con `revalidate` como las demás públicas con datos de catálogo; tarjetas con nombre, descripción y Células activas; llamado a la acción a Primeros pasos (sin sesión) o Mi camino (con sesión); mantiene miga, metadata y el `EstadoVacio` actual cuando no hay ninguno; `loading.tsx`/`error.tsx` si la ruta no los tiene. (FR-034)
- [ ] T056 [P] [US7] Checklist de docs/15 sobre `/ministerios` pública. (FR-037)
- [ ] T057 [P] [US7] e2e en `apps/web/e2e/ministerios-postulacion.spec.ts` (sección pública): muestra los activos, no el inactivo; axe claro y oscuro; sin scroll horizontal a 320 px. (FR-034, SC-006)

---

## Phase 10: Cierre — **lote D** (una sesión, después de A, B y C)

- [ ] T058 e2e de punta a punta `apps/backoffice/e2e/postulaciones.spec.ts` (necesita la instancia auxiliar de `apps/web` de D124): una Persona apta se postula en la web → el Admin la ve en la bandeja con filtro de tipo → aprueba → Mi camino dice "Estás sirviendo en…"; la misma Persona se postula a otro → el Admin ve la advertencia con el nombre del Ministerio actual y confirma → la vieja queda inactiva; rechazo con motivo → la Persona ve el texto amable sin motivo; Pastor sin acciones; la tarjeta de pendientes del Inicio cuenta la Postulación y su enlace abre la bandeja filtrada (FR-041). Mide el tiempo del recorrido del Admin como referencia de SC-002. (US2, US3; FR-014–FR-019, FR-023, FR-041; SC-002)
- [ ] T059 Verificar que el log de eventos de un recorrido completo trae exactamente los eventos de `contracts/eventos.md` (test unitario por transición, ampliando T010 con los servicios reales mockeados). (FR-035)
- [ ] T060 Revisar contraste de los estados nuevos (íconos y textos de la card, badges) en los dos temas, incluido `hover`, contra `docs/17-paleta-y-tokens.md` (H-56); ninguna clase de color cruda (H-54). (FR-037, SC-006)
- [ ] T061 Correr las tres suites en verde: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice` (incluido el smoke de axe/320 px de todas las rutas). (Definición de terminado)
- [ ] T062 Recorrer `quickstart.md` entero contra seed-demo y anotar en el PR lo que no coincida. (todas)

---

## Dependencies & Execution Order

- Lote 0 (T001–T015) antes que todo.
- US1 y US3 (lote A) comparten `postulacion-persona.*`: T016 → T017 → T033; las pantallas después de sus endpoints.
- US2 y US5 (lote B): T023 antes de T027; T025 antes de T028; T048 después de T025.
- US4, US6, US7 (lote C): T038 antes de T041–T043, T052, T055; T039 antes de T042.
- Lote D después de A, B y C.

## Lotes (sesiones en paralelo que no se pisan)

**Lote 0 — primero y solo:** T001–T015. Todo lo que toca `packages/shared-types`, `packages/ui`
(`AvisoEstado`), `schema.prisma` y su migración, `app.module.ts`, el esqueleto de
`apps/api/src/ministerio/` (`ministerio.module.ts`, `reglas-postulacion.ts`, `miembros.ts`, `eventos.ts`),
`nav.ts`, la lista de rutas del smoke, fixtures e2e, `seed-demo.ts` y la estructura de los `es.json`.

Después, tres sesiones en paralelo, cada una en sus archivos y su namespace de `es.json`:

| Lote | Tareas | Archivos propios |
|---|---|---|
| **A — Persona** | T016–T022, T033–T037 | `ministerio/postulacion-persona.*`, `apps/web/src/app/(app)/mi-camino/` (card + `ministerios/`), sus tests, namespaces `miCamino.ministerio` y `ministerios` (web) |
| **B — Revisión** | T023–T032, T048–T051 | `apps/api/src/bandeja/`, `ministerio/postulacion-admin.*`, `apps/backoffice/src/app/solicitudes/`, `tarjeta-pendientes.tsx`, sus tests, namespaces `postulaciones`, `solicitudes.tipos` |
| **C — Catálogo y pública** | T038–T047, T052–T057 | `ministerio/ministerio.*`, `ministerio/celula.*`, `apps/backoffice/src/app/ministerios/`, `catalogos/page.tsx`, `apps/web/src/app/(publica)/ministerios/`, sus tests, namespace `ministerios` (backoffice) |

- **Cruces resueltos**: `GET /ministerios/publicos` es de C pero lo usan A (T019) y la pública: hasta que
  C lo mergee, A lo consume con el contrato y sus e2e esperan al lote D si hace falta. `dar-de-baja` (C)
  produce el desenlace `baja` que muestra la card (A): A lo prueba en unit con datos sembrados.
- **Lote D:** T058–T062, en una sola sesión.

## Cobertura: cada criterio con su test

| Criterio | Test |
|---|---|
| SC-001 (postularse en < 2 min a 360 px) | T037 `@celular` (recorrido completo; el tiempo se anota) |
| SC-002 (resolver en < 1 min, advertencia 100%) | T058, T026 (la API exige `confirmarCambio`) |
| SC-003 (nunca dos pendientes ni dos aprobadas) | T018, T026 (concurrencia contra los índices) |
| SC-004 (ninguna fila desaparece) | T018, T040 |
| SC-005 (todos los estados con texto + ícono) | T034, T037 |
| SC-006 (axe claro/oscuro, sin scroll a 320 px) | T013 (smoke), T037, T047, T057, T060 |
| SC-007 (inactivar exige nombre, todo reversible) | T040, T047 |

## Implementation Strategy

- **MVP = lote 0 + US1 + US2 + US3**: postularse, revisar y enterarse. Con el seed-demo cargando
  Ministerios, se puede demostrar sin el catálogo.
- Después US4 (operar de verdad), y US5–US7 (excepciones y la pública).
- Cada lote cierra con sus tests en verde y un commit por cambio coherente, en español. Sin push salvo pedido.
