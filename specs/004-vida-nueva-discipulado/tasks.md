# Tasks: Vida Nueva / Discipulado

**Input**: Design documents from `/specs/004-vida-nueva-discipulado/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: el spec no los pide explícitamente, pero la Constitución sí (Principio VI): unit para
toda regla con ramas, integración para lo que cambia estado en cascada contra la base, y e2e con
axe en los dos temas para el flujo crítico (Principio VII). Se incluyen con ese criterio, no
exhaustivos.

**Organización**: por historia de usuario, en orden de prioridad (US1 y US3 son P1; US2, US4, US5
y US6 son P2). Cada pantalla nueva o modificada lleva su tarea de checklist de
`docs/15-guia-ux-ui.md` (D114). Al final, **Lotes** agrupa las tareas en sesiones paralelas que no
se pisan.

**Convenciones que valen para todas las tareas** (para no repetirlas en cada una):
- Permisos solo con `@RequierePermiso` y `requerirPermiso`, contra `CATALOGO_PERMISOS` (D132).
  Nunca un rol literal.
- Errores con Problem Details y un `code` de `error-code.ts`. Los de campo van bajo `VALIDACION`
  con `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito. Los listados que crecen se paginan con `Pagina<T>` (H-42).
- Textos de interfaz por `next-intl`, en rioplatense con voseo. Colores solo de tokens (D118).
- Botones de acción con `Button` y `useEnvio` de `packages/ui` (H-57). Validación con
  `useValidacionCampos` + `ResumenErrores` (H-50, H-72).
- En Next, "cargando" es `loading.tsx` y "error" es `error.tsx`.

---

## Phase 1: Setup

- [ ] T001 Verificar antes de arrancar que `main` tiene el plan de la 004 (`4a02c02` o posterior) y D137 en `docs/05-decisiones.md`, y que `.specify/feature.json` apunta a `specs/004-vida-nueva-discipulado`. Si hay decisiones nuevas en `docs/05-decisiones.md`, mirar el último número antes de agregar ninguna (D89, D103).

---

## Phase 2: Foundational (bloquea todas las historias — es el **lote 0**, secuencial)

- [ ] T002 [P] Crear `packages/shared-types/src/discipulado.ts` con los tipos de `contracts/solicitudes-api.md` y `contracts/discipulado-api.md`: `EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada'`, `TipoSolicitud = 'discipulado'`, `SolicitudResumen`, `EstadoMiDiscipulado` (unión discriminada `puede_pedir` / `pendiente` / `rechazada` / `en_curso` / `finalizado`, sin notas ni capítulos, FR-029), `EstadoGrupo = 'en_curso' | 'finalizado'`, `DiscipuladoResumen`, `EncuentroAdministrativo` (sin `notas`), `EncuentroDelDiscipulador` (con `notas: string | null`), `MiDiscipulado`, `DiscipuladoActivo = { grupoId, persona: { nombre, apellido } }`, y los límites como constantes: `CAPITULOS_MAX = 200`, `NOTAS_ENCUENTRO_MAX = 2000`, `MOTIVO_RECHAZO_FINALIZACION_MAX = 500`. Exportar desde `packages/shared-types/src/index.ts`.
- [ ] T003 [P] Crear `packages/shared-types/src/disponibilidad.ts`: `MiDisponibilidad`, `BloqueoDisponibilidad` (`contracts/disponibilidad-api.md`) y `hoyEnArgentina(): string` (`YYYY-MM-DD`, fecha civil en `America/Argentina/Buenos_Aires`, la **única** implementación, research #7) más `bloqueoVigente(bloqueo, hoy): boolean` (`desde <= hoy <= hasta`, los dos días inclusive). Exportar desde `index.ts`.
- [ ] T004 [P] Unit test de `hoyEnArgentina()` y `bloqueoVigente()` en `apps/api/test/unit/disponibilidad-hoy.spec.ts`: 23:30 de Argentina (02:30 UTC del día siguiente) sigue siendo "hoy" en Argentina; `desde == hoy`, `hasta == hoy`, un día antes y un día después.
- [ ] T005 Extender `packages/shared-types/src/error-code.ts`: agregar `SOLICITUD_DISCIPULADO_YA_PENDIENTE`, `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`, `SOLICITUD_NO_PENDIENTE`, `DISCIPULADOR_NO_DISPONIBLE`, `DISCIPULADO_NO_EN_CURSO`, `FINALIZACION_NO_PROPUESTA`, `FINALIZACION_YA_PROPUESTA` y `REASIGNACION_AL_MISMO_DISCIPULADOR`, con un comentario que cite el FR de cada uno; **eliminar** `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`; `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS` ya existe y queda. Los códigos de campo (`FECHA_FUTURA`, `CAPITULOS_REQUERIDO`, `BLOQUEO_FIN_ANTERIOR_AL_INICIO`, `BLOQUEO_YA_VENCIDO`, `MOTIVO_DEMASIADO_LARGO`) van bajo `VALIDACION`, no acá. Actualizar las traducciones de `errors` en `apps/backoffice/src/messages/es.json` y `apps/web/src/messages/es.json` (sacar la del código eliminado y agregar las nuevas).
- [ ] T006 Extender `packages/shared-types/src/permisos.ts` (research #9): agregar a `Permiso` y `CATALOGO_PERMISOS` `'solicitudes.aprobar': ['admin']`, `'solicitudes.crear_en_nombre': ['admin', 'discipulador']`, `'grupos.gestionar': ['admin']`, `'mis_discipulados.gestionar': ['discipulador']` y `'mi_disponibilidad.gestionar': ['discipulador']`. Cambiar `puedeQuitarRol`: `persona` pasa a `{ id, adminSembrado, discipuladosActivos: readonly DiscipuladoActivo[] }`; la rama `discipulador` devuelve `{ puede: false, motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS' }` solo si la lista no está vacía; `MotivoNoQuitable` cambia el código eliminado por ese. Actualizar el comentario de la función (ya no "SIEMPRE no, por ahora"). Mismo commit: arreglar a mano cada llamada que rompa el typecheck (lote D la termina de verdad, T055).
- [ ] T007 Extender `apps/api/prisma/schema.prisma` según `data-model.md`: `Persona.disponibleDiscipulado Boolean @default(false)` y sus relaciones inversas; enums `CategoriaCurso { vida_nueva }`, `TipoCurso { individual, grupal }`, `ModalidadCurso { seguimiento_por_encuentros }`, `EstadoSolicitud { pendiente, aprobada, rechazada }`, `EstadoGrupo { en_curso, finalizado }` y `EstadoInscripcion { activa, completada, dada_de_baja, abandono }`; modelos `Curso` (`@@unique([categoria, tipo])`, `activo @default(true)`), `SolicitudDiscipulado` (`grupoId String? @unique`, `@@index([personaId])`, `@@index([estado, createdAt])`), `Grupo` (`@@index([cursoId])`, `@@index([sedeId])`, `@@index([estado])`), `Inscripcion` (`@@unique([personaId, grupoId])`, **sin** único sobre `grupoId`, FR-014), `Liderazgo` (`hasta DateTime?`, `@@index([personaId, hasta])`, `@@index([grupoId, hasta])`), `Encuentro` (`fecha DateTime @db.Date`, `capitulos String`, `notas String?`, `@@index([grupoId, fecha])`), `Asistencia` (`@@unique([encuentroId, inscripcionId])`) y `BloqueoDisponibilidad` (`desde`/`hasta` `@db.Date`, `@@index([personaId, hasta])`). Todos con `@@map` en plural snake_case, como el resto.
- [ ] T008 Crear la migración con `pnpm --filter api exec prisma migrate dev --create-only --name discipulado` y agregarle a mano, en SQL: `CREATE UNIQUE INDEX solicitudes_discipulado_una_pendiente ON solicitudes_discipulado ("personaId") WHERE estado = 'pendiente'` (research #2) y `CHECK ("hasta" >= "desde")` en `bloqueos_disponibilidad` (FR-017). Mismo patrón que los CHECK de la migración `20260925204725_cambio_de_rol` (H-140). Aplicarla y correr `pnpm --filter api run test` para confirmar que nada se rompió.
- [ ] T009 Extender `apps/api/prisma/seed.ts`, idempotente: `upsert` del Curso `{ nombre: 'Vida Nueva', categoria: vida_nueva, tipo: individual, modalidad: seguimiento_por_encuentros }` por `(categoria, tipo)`. Extender `apps/api/scripts/sembrar-e2e-admin.ts` con **dos** Personas fixture con rol `discipulador` (`e2e-discipulador@…` y `e2e-discipulador-2@…`, adultas, `disponibleDiscipulado = true`), y `apps/backoffice/e2e/helpers.ts` con `loguearseComoDiscipuladorE2E(page, cual = 1)`, mismo patrón que `loguearseComoLiderCursoE2E`.
- [ ] T010 Extender `apps/api/scripts/limpiar-e2e.ts` (H-67): antes de borrar las Personas `e2e-`, borrar en orden lo que cuelga de ellas (Asistencia → Encuentro → Liderazgo → Inscripción → SolicitudDiscipulado → Grupo sin Inscripciones → BloqueoDisponibilidad). Es la única excepción al soft delete: datos de test, como ya hace este script.
- [ ] T011 Crear `apps/api/src/discipulado/discipulados-activos.ts` con `discipuladosActivosDe(tx, personaId): Promise<DiscipuladoActivo[]>` y `discipuladosActivosDeVarias(tx, personaIds): Promise<Map<string, DiscipuladoActivo[]>>` (una sola consulta agrupada, para el listado de Personas). Criterio **único** de D137: `Liderazgo.hasta IS NULL` y `Grupo.estado = en_curso`, con el nombre de la Persona inscripta. Test de integración en `apps/api/test/integration/discipulados-activos.integration-spec.ts`: vigente en curso cuenta; cerrado por reasignación no cuenta; Grupo finalizado no cuenta.
- [ ] T012 Crear los tres módulos vacíos (`SolicitudDiscipuladoModule` en `apps/api/src/solicitud-discipulado/`, `DiscipuladoModule` en `apps/api/src/discipulado/`, `DisponibilidadModule` en `apps/api/src/disponibilidad/`) y registrarlos en `apps/api/src/app.module.ts`. `DiscipuladoModule` exporta el proveedor de `discipulados-activos.ts` para que lo use `PersonaModule`.
- [ ] T013 Extender `apps/backoffice/src/config/nav.ts`: `{ href: '/grupos/[id]', …, permiso: 'grupos.ver', enMenu: false }` y `{ href: '/mis-discipulados/[id]', …, permiso: 'mis_discipulados.ver', enMenu: false }` (patrón de `/sedes/[id]`). Correr `pnpm --filter backoffice run lint` (regla `pantalla-declara-permiso`).
- [ ] T014 Crear los namespaces vacíos en los mensajes, en este orden y cada uno en su propio bloque, para que los lotes paralelos no choquen al mergear: en `apps/backoffice/src/messages/es.json`, `solicitudes`, `grupos`, `misDiscipulados` y `miDisponibilidad`; en `apps/web/src/messages/es.json`, `miCamino`. Reconstruir `packages/shared-types` (H-33) y correr lint y typecheck de las cuatro piezas.

**Checkpoint**: la base compila, migra y siembra; el lote 0 va en un commit (o varios seguidos) antes de abrir los paralelos.

---

## Phase 3: User Story 1 — Pedir empezar Vida Nueva (P1) 🎯 MVP

**Goal**: una Persona activa pide Vida Nueva desde Mi camino, o alguien del equipo en su nombre, sin duplicados.

**Independent Test**: una Persona con sesión pide Vida Nueva y queda una Solicitud `pendiente` visible en la bandeja; un segundo pedido no crea otra y explica por qué.

- [ ] T015 [P] [US1] Unit test de las reglas de creación en `apps/api/test/unit/solicitud-discipulado-crear.spec.ts`: con pendiente → `SOLICITUD_DISCIPULADO_YA_PENDIENTE`; con Inscripción `activa` o `completada` en Vida Nueva → `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`; con una rechazada y nada más → se crea (FR-008); en nombre de otra → `creadoPorId` = el autor.
- [ ] T016 [US1] Implementar en `apps/api/src/solicitud-discipulado/solicitud-discipulado.service.ts` `crearPropia(personaId)` y `crearEnNombreDe(personaId, autorId)`, con la función `cursaOCompletoVidaNueva(tx, personaId)` (Inscripción `activa` o `completada` en un Grupo de Curso `vida_nueva`, data-model → Inscripcion). Traducir la violación del índice único parcial (código Prisma `P2002` sobre `solicitudes_discipulado_una_pendiente`) a `SOLICITUD_DISCIPULADO_YA_PENDIENTE`, nunca a 500.
- [ ] T017 [US1] Exponer en `apps/api/src/solicitud-discipulado/solicitud-discipulado.controller.ts` `POST /discipulado/solicitudes/me` (sesión con `estado = activa`, sin permiso del catálogo) y `POST /discipulado/solicitudes` (`solicitudes.crear_en_nombre`, cuerpo `{ personaId }`, 404 `NO_ENCONTRADO` si no existe o `activo = false`), según `contracts/solicitudes-api.md`.
- [ ] T018 [US1] Test de integración en `apps/api/test/integration/solicitud-discipulado.integration-spec.ts`: dos `POST /me` en paralelo dejan **una** Solicitud y el segundo recibe 409 `SOLICITUD_DISCIPULADO_YA_PENDIENTE` (el índice parcial, no el servicio); un Pastor recibe 403 al crear en nombre de otro.
- [ ] T019 [US1] Reescribir `apps/web/src/app/(app)/mi-camino/page.tsx` (Server Component, pide `GET /discipulado/me`) + `mi-camino-cliente.tsx` + `loading.tsx` + `error.tsx`: con `puede_pedir`, una tarjeta de Vida Nueva con **una** acción principal, "Quiero empezar Vida Nueva" (Flujo 3), con `useEnvio`; al enviar, pasa a pendiente sin recargar. Si la API responde 409, el mensaje dice por qué (Historia 1, escenarios 3 y 4). Textos en `miCamino` de `apps/web/src/messages/es.json`. El resto de "Mi camino" (Vida de Servicio, Ministerio, Bautismo) sigue como estado vacío.
- [ ] T020 [US1] Crear `apps/backoffice/src/components/pedir-en-nombre-de.tsx`: un `Sheet` con el buscador de `GET /personas/buscar` (mismo patrón que el buscador de tutor de `pendientes-tutor-cliente.tsx`) y el botón "Pedir Vida Nueva" (`useEnvio`); muestra los 409 legibles. Lo usan `/solicitudes` (T027) y `/mis-discipulados` (T046). `etiquetaCerrar` desde `next-intl` (H-151).
- [ ] T021 [US1] e2e en `apps/web/e2e/mi-camino-vida-nueva.spec.ts`, en modo claro y oscuro con `auditar()`: una Persona nueva pide Vida Nueva, ve "pendiente de revisión", recarga y sigue pendiente, y no hay un segundo botón de pedir.
- [ ] T022 [US1] Verificar `apps/web/src/app/(app)/mi-camino/` contra el checklist de `docs/15-guia-ux-ui.md`: una sola acción principal con verbo concreto, orden de botones, los cuatro estados (cargando, vacío = "todavía no pediste", error con reintentar, éxito), bloqueo de reentrada (H-57), feedback de `docs/16`, se entiende qué pasa después ("¿Y ahora qué?" de `docs/15`), tono sin jerga (Principio VIII: "Mi camino"), celular, teclado y lector de pantalla, y contraste en los dos temas.

**Checkpoint**: se puede pedir Vida Nueva; todavía nadie la aprueba.

---

## Phase 4: User Story 3 — Aprobar la Solicitud y armar el Grupo (P1)

**Goal**: el Admin ve la bandeja genérica, aprueba eligiendo un Discipulador disponible (o rechaza), y puede reasignar un discipulado en curso.

**Independent Test**: un Admin aprueba una Solicitud pendiente eligiendo de un listado ya filtrado, y queda un Grupo con la Persona inscripta y el Discipulador como Liderazgo vigente.

- [ ] T023 [P] [US3] Unit test en `apps/api/test/unit/solicitud-discipulado-resolver.spec.ts`: aprobar una no pendiente → `SOLICITUD_NO_PENDIENTE`; Discipulador sin el rol, no disponible o con bloqueo vigente → `DISCIPULADOR_NO_DISPONIBLE`; rechazar no crea Grupo ni Inscripción.
- [ ] T024 [US3] Implementar en `apps/api/src/solicitud-discipulado/solicitud-discipulado.service.ts` `aprobar(id, discipuladorId, adminId)` y `rechazar(id, adminId)` en transacciones, con **exactamente** los pasos de `contracts/solicitudes-api.md`. Aprobar: bloquea la Solicitud (`FOR UPDATE`) → bloquea la fila `personas` del Discipulador (D137) y exige rol, disponible y sin bloqueo vigente (con `hoyEnArgentina()`) → re-exige `cursaOCompletoVidaNueva = false` → crea Grupo (`en_curso`, Curso por `(vida_nueva, individual)`, `sedeId` de la Persona), Inscripción `activa` y Liderazgo (`asignadoPorId`), y marca la Solicitud `aprobada` con `revisadoPorId`, `revisadaEn` y `grupoId` (FR-023: la costura del aviso futuro).
- [ ] T025 [US3] Implementar `listarDisponibles()` en `apps/api/src/discipulado/disponibles.service.ts` (**un** solo lugar, lo usan aprobar y reasignar): `'discipulador' = ANY(rol)`, `activo`, `disponibleDiscipulado`, sin bloqueo vigente hoy, en orden por apellido y nombre, sin sugerir (D25). Sin filtro de edad: lo garantiza el otorgamiento (FR-011 del 005). Exponer `GET /discipulado/discipuladores-disponibles` (`solicitudes.aprobar`). Unit test en `apps/api/test/unit/discipuladores-disponibles.spec.ts`: toggle apagado, bloqueo vigente, bloqueo futuro (sí aparece), bloqueo vencido (sí aparece), sin el rol.
- [ ] T026 [US3] Exponer en el controller `GET /solicitudes` (`solicitudes.ver`; query `estado` = `pendiente` por defecto, `tipo`, `orden`, `dir` y `pagina`; `Pagina<SolicitudResumen>`, patrón de URL de `pendientes-tutor`, H-101), `POST /discipulado/solicitudes/:id/aprobar` y `POST /discipulado/solicitudes/:id/rechazar` (`solicitudes.aprobar`).
- [ ] T027 [US3] Reescribir `apps/backoffice/src/app/solicitudes/` (`page.tsx` con `requerirPermiso('solicitudes.ver')`, `solicitudes-cliente.tsx`, `loading.tsx`, `error.tsx`, `constantes.ts` con `TAMANIO_PAGINA`): la bandeja con `TablaDatos`/`ControlesTabla` y las columnas de la forma base (persona, estado, fecha, revisado por, creado por, FR-025), **sin** control de filtro por tipo. Por fila pendiente, un `Sheet` "Revisar": el listado de disponibles con elección manual, el estado vacío explicado si no hay ninguno (FR-007), "Aprobar" como acción principal y "Rechazar" con confirmación. Ante `DISCIPULADOR_NO_DISPONIBLE`, recarga el listado y lo dice. El Pastor ve la bandeja sin acciones (`tienePermiso(…, 'solicitudes.aprobar')`, D64). Arriba, "Pedir Vida Nueva en nombre de…" con `pedir-en-nombre-de.tsx` si tiene `solicitudes.crear_en_nombre`.
- [ ] T028 [US3] Implementar `reasignar(grupoId, discipuladorId, adminId)` en `apps/api/src/discipulado/reasignacion.service.ts` (FR-030, `contracts/discipulado-api.md`): bloquea el Grupo y exige `en_curso` → bloquea la fila de la Persona nueva (D137) y exige lo mismo que al aprobar → `REASIGNACION_AL_MISMO_DISCIPULADOR` si es el vigente → cierra el Liderazgo vigente (`hasta = now`, `cerradoPorId`) y abre uno nuevo. No toca Encuentros, Asistencias ni la propuesta de finalización. Exponer `POST /grupos/discipulados/:grupoId/reasignar` (`grupos.gestionar`).
- [ ] T029 [US3] Test de integración en `apps/api/test/integration/discipulado-aprobar-reasignar.integration-spec.ts`: aprobar crea Grupo, Inscripción `activa`, Liderazgo vigente y la Solicitud con `revisadoPorId`/`revisadaEn`/`grupoId`; dos aprobaciones simultáneas de la misma Solicitud dejan un solo Grupo; reasignar deja un Liderazgo cerrado y uno vigente, los Encuentros intactos, y el Discipulador anterior recibe 404 en `GET /discipulado/mis-discipulados/:grupoId`; **carrera de D137**: `quitarRol(discipulador)` y `aprobar` con esa misma Persona en paralelo nunca dejan un Liderazgo vigente de alguien sin el rol.
- [ ] T030 [US3] e2e en `apps/backoffice/e2e/solicitudes.spec.ts`, claro y oscuro con `auditar()`: el Admin abre una Solicitud pendiente (creada por API en el setup), ve solo a los disponibles, aprueba y la fila deja de estar pendiente; con ningún disponible, ve el estado vacío explicado; rechazar pide confirmación y la deja rechazada; el Pastor ve la bandeja sin botones.
- [ ] T031 [US3] Verificar `apps/backoffice/src/app/solicitudes/` y `components/pedir-en-nombre-de.tsx` contra el checklist de `docs/15-guia-ux-ui.md`, con la miga de pan (H-81) y el patrón de listado paginado (H-101) de esa guía.

**Checkpoint**: US1 + US3 = el MVP. Alguien pide, el Admin aprueba, y el discipulado existe.

---

## Phase 5: User Story 2 — Seguir el estado de mi propio pedido (P2)

**Goal**: la Persona ve en Mi camino si está pendiente, rechazada, en curso (con su Discipulador) o terminada, sin notas.

**Independent Test**: una Persona con una Solicitud pendiente ve "pendiente de revisión"; con el discipulado aprobado ve el nombre de su Discipulador.

- [ ] T032 [P] [US2] Unit test de la precedencia de `EstadoMiDiscipulado` en `apps/api/test/unit/estado-mi-discipulado.spec.ts` (`contracts/solicitudes-api.md`): Grupo `en_curso`/`finalizado` antes que una Solicitud; `pendiente` antes que `rechazada`; rechazada y después pendiente → pendiente; creada en su nombre → igual que propia; tras una reasignación → el Discipulador vigente.
- [ ] T033 [US2] Implementar `estadoPropio(personaId)` en `apps/api/src/solicitud-discipulado/solicitud-discipulado.service.ts` y exponer `GET /discipulado/me` (sesión `activa`). El `select` no incluye `Encuentro` en absoluto (FR-029).
- [ ] T034 [US2] Extender `apps/web/src/app/(app)/mi-camino/mi-camino-cliente.tsx` con los cuatro estados restantes: pendiente, rechazada ("podés volver a pedirlo", con el botón otra vez, FR-008), en curso ("Tu Discipulador es …", desde cuándo) y terminado. Cada estado con texto e ícono, nunca solo color (D81). Textos en `miCamino`.
- [ ] T035 [US2] Extender `apps/web/e2e/mi-camino-vida-nueva.spec.ts`: con la Solicitud aprobada por API, la Persona ve el nombre de su Discipulador, y la página no contiene el texto de una nota cargada por API (FR-029); rechazada, ve el estado y puede volver a pedir. axe en los dos temas.
- [ ] T036 [US2] Verificar los estados nuevos de `mi-camino` contra el checklist de `docs/15-guia-ux-ui.md`, con foco en "¿Y ahora qué?" de las solicitudes (`docs/15`): cada estado dice qué pasa después.

---

## Phase 6: User Story 4 — Gestionar mi disponibilidad (P2)

**Goal**: el Discipulador prende o apaga su disponibilidad y carga períodos, y eso se refleja de inmediato en el listado del Admin.

**Independent Test**: el Discipulador se marca no disponible (o carga un período que cubre hoy) y desaparece del listado de disponibles del Admin.

- [ ] T037 [P] [US4] Unit test en `apps/api/test/unit/bloqueo-disponibilidad.spec.ts`: `hasta < desde` → `BLOQUEO_FIN_ANTERIOR_AL_INICIO` en el campo `hasta`; `hasta` anterior a hoy → `BLOQUEO_YA_VENCIDO`; períodos superpuestos → se aceptan; `apareceEnElListado` = disponible y sin vigente.
- [ ] T038 [US4] Implementar `apps/api/src/disponibilidad/disponibilidad.service.ts` + `disponibilidad.controller.ts` según `contracts/disponibilidad-api.md`: `GET /disponibilidad/me` (`mi_disponibilidad.ver`, oculta bloqueos vencidos), `PUT /disponibilidad/me` (`mi_disponibilidad.gestionar`, `{ disponible }`, idempotente, no toca discipulados en curso, FR-018) y `POST /disponibilidad/me/bloqueos` (`mi_disponibilidad.gestionar`, `{ desde, hasta }`). Todo desde la sesión: ningún `personaId` en la ruta ni en el cuerpo (D134). Test de integración en `apps/api/test/integration/disponibilidad.integration-spec.ts`, que incluye que el CHECK de la base rechaza `hasta < desde` aunque se saltee el servicio.
- [ ] T039 [US4] Reescribir `apps/backoffice/src/app/mi-disponibilidad/` (`page.tsx` con `requerirPermiso('mi_disponibilidad.ver')`, `mi-disponibilidad-cliente.tsx`, `loading.tsx`, `error.tsx`): el toggle, la frase en palabras de si hoy el Admin lo ve (`apareceEnElListado`, `contracts/disponibilidad-api.md`), la lista de períodos vigentes y futuros (el vigente marcado con texto e ícono) y el formulario de período con validación por campo (H-50/H-72). Textos en `miDisponibilidad`.
- [ ] T040 [US4] e2e en `apps/backoffice/e2e/mi-disponibilidad.spec.ts`, claro y oscuro: `loguearseComoDiscipuladorE2E` → apaga la disponibilidad → como Admin ya no aparece en `GET /discipulado/discipuladores-disponibles`; carga un período con fin anterior al inicio y ve el error debajo del campo y en el resumen, con foco al resumen; carga uno que cubre hoy y la frase cambia.
- [ ] T041 [US4] Verificar `apps/backoffice/src/app/mi-disponibilidad/` contra el checklist de `docs/15-guia-ux-ui.md` (formularios estilo GOV.UK, `docs/15`).

---

## Phase 7: User Story 5 — Registrar el avance de los encuentros (P2)

**Goal**: el Discipulador ve sus discipulados, los datos de contacto y el historial con notas, y registra Encuentros con Asistencia; Admin y Pastor ven el seguimiento sin notas.

**Independent Test**: el Discipulador registra un Encuentro y lo ve con su nota; el Admin lo ve en `/grupos/[id]` con fecha y capítulos y sin la nota.

- [ ] T042 [P] [US5] Unit test en `apps/api/test/unit/encuentro.spec.ts`: `fecha` futura → `FECHA_FUTURA`; `capitulos` vacío o de más de 200 caracteres; `notas` de más de 2000; `presente` ausente → `true` (FR-013a); Grupo `finalizado` → `DISCIPULADO_NO_EN_CURSO`.
- [ ] T043 [US5] Implementar en `apps/api/src/discipulado/mis-discipulados.service.ts` `misDiscipulados(personaId)`, `miDiscipulado(personaId, grupoId)` (404 `NO_ENCONTRADO` si no tiene el Liderazgo **vigente**, Principio V) y `registrarEncuentro(personaId, grupoId, dto)` (Encuentro + una Asistencia por Inscripción `activa`, en una transacción). Exponer `GET /discipulado/mis-discipulados`, `GET /discipulado/mis-discipulados/:grupoId` (`mis_discipulados.ver`) y `POST …/:grupoId/encuentros` (`mis_discipulados.gestionar`). Los datos de contacto (`telefono`, `direccion`) salen **solo** por el detalle (FR-011, SC-003).
- [ ] T044 [US5] Implementar en `apps/api/src/discipulado/grupos.service.ts` la vista administrativa: `GET /grupos/discipulados` (`grupos.ver`, `Pagina<DiscipuladoResumen>`, query `estado` y `propuesta`) y `GET /grupos/discipulados/:grupoId` (con `EncuentroAdministrativo[]` e historial de Liderazgos). **Ningún `select` incluye `notas`** (D134), y el conteo de Encuentros va agregado en la consulta, no uno por fila.
- [ ] T045 [US5] Test de integración en `apps/api/test/integration/discipulado-encuentros.integration-spec.ts`: la respuesta de las dos rutas de `/grupos/discipulados` **no contiene** el texto de una nota cargada (se busca el string en el JSON serializado, así no depende de un nombre de campo); otro Discipulador recibe 404 en el detalle y en `POST encuentros`; crear un Encuentro crea exactamente una Asistencia `presente = true`.
- [ ] T046 [US5] Reescribir `apps/backoffice/src/app/mis-discipulados/` (`page.tsx` con `requerirPermiso('mis_discipulados.ver')`, cliente, `loading.tsx`, `error.tsx`) y crear `mis-discipulados/[id]/` (idem): la lista de discipulados vigentes (el vacío de D134: "Todavía no tenés discípulos asignados.") y el detalle con contacto, historial en orden con notas, y "Registrar encuentro" como acción principal (`Sheet` con fecha, capítulos, notas y la casilla "Faltó" sin marcar, FR-013a). Arriba de la lista, "Pedir Vida Nueva en nombre de…" (`pedir-en-nombre-de.tsx`, FR-002). Textos en `misDiscipulados`.
- [ ] T047 [US5] Reescribir `apps/backoffice/src/app/grupos/` (`page.tsx` con `requerirPermiso('grupos.ver')`, cliente, `loading.tsx`, `error.tsx`) y crear `grupos/[id]/`: listado paginado con `TablaDatos` (persona, discipulador, desde, cantidad de Encuentros, último capítulo, propuesta pendiente) y el detalle con Encuentros **sin notas** y el historial de Discipuladores. Textos en `grupos`. (Las acciones del Admin sobre esta pantalla, reasignar y finalización, entran en T052).
- [ ] T048 [US5] e2e en `apps/backoffice/e2e/discipulado-encuentros.spec.ts`, claro y oscuro: el Discipulador registra un Encuentro con una nota y la ve; el Admin, en `/grupos/[id]`, ve la fecha y los capítulos y **no** la nota; el Pastor igual, sin botones; el segundo Discipulador fixture recibe la pantalla de "no encontrado" en el detalle ajeno.
- [ ] T049 [US5] Verificar `apps/backoffice/src/app/mis-discipulados/` (lista y detalle) y `apps/backoffice/src/app/grupos/` (lista y detalle) contra el checklist de `docs/15-guia-ux-ui.md`, cada una por separado.

---

## Phase 8: User Story 6 — Proponer y confirmar la finalización (P2)

**Goal**: el Discipulador propone terminar; el Admin confirma (Inscripción completada) o rechaza con motivo (vuelve a en curso).

**Independent Test**: se propone, el Admin confirma, y la Inscripción queda `completada` sin tocar `apto_ministerio`.

- [ ] T050 [US6] Implementar en `apps/api/src/discipulado/finalizacion.service.ts` `proponer` (`mis_discipulados.gestionar` + Liderazgo vigente; `FINALIZACION_YA_PROPUESTA`), `confirmar` (`grupos.gestionar`; bloquea el Grupo, exige `en_curso` y propuesta, pasa a `finalizado` con `finalizadoEn`/`finalizadoPorId` y **todas** las Inscripciones `activa` a `completada`; `FINALIZACION_NO_PROPUESTA`, FR-020) y `rechazar` (`grupos.gestionar`; `{ motivo? }` de hasta 500 caracteres; limpia la propuesta y guarda `finalizacionRechazadaEn` y el motivo, FR-019a). Exponer las tres rutas de `contracts/discipulado-api.md`. Unit test en `apps/api/test/unit/finalizacion.spec.ts` con las transiciones del diagrama de `data-model.md` → Grupo.
- [ ] T051 [US6] Test de integración en `apps/api/test/integration/discipulado-finalizacion.integration-spec.ts`: confirmar pasa la Inscripción a `completada` y el Grupo a `finalizado`, y `discipuladosActivosDe` deja de contarlo; confirmar sin propuesta → 409; rechazar y volver a proponer funciona; en `personas` no cambia ninguna columna al confirmar (FR-022: nada parecido a `apto_ministerio`).
- [ ] T052 [US6] UI: en `apps/backoffice/src/app/mis-discipulados/[id]/`, "Proponer finalización" con confirmación, el estado "propuesta enviada" y el aviso del último rechazo con su motivo; en `apps/backoffice/src/app/grupos/[id]/`, para quien tiene `grupos.gestionar`, "Confirmar finalización" y "Rechazar" (con motivo opcional) cuando hay una propuesta, y "Reasignar" (listado de disponibles, el mismo endpoint que al aprobar) mientras esté en curso. El Pastor no ve ninguna de las tres.
- [ ] T053 [US6] e2e en `apps/backoffice/e2e/discipulado-finalizacion.spec.ts`, claro y oscuro: proponer → el Admin rechaza con un motivo → el Discipulador ve el motivo → propone de nuevo → el Admin confirma → el Grupo figura finalizado. Y reasignar: el Admin reasigna al segundo Discipulador fixture, que ve el discipulado con los Encuentros anteriores, y el primero ya no lo ve (Historia 3, escenario 8).
- [ ] T054 [US6] Verificar las acciones nuevas de `mis-discipulados/[id]` y `grupos/[id]` contra el checklist de `docs/15-guia-ux-ui.md` (confirmación antes de una acción que no se deshace, orden de botones, qué pasa después).

---

## Phase 9: Cierre de H-127 (cruza la US3 con el spec 005) — **lote D**

- [ ] T055 Cambiar `apps/api/src/persona/roles.service.ts` `quitarRol`: con la fila ya bloqueada, `discipuladosActivosDe(tx, personaId)` y pasárselo a `puedeQuitarRol`; el rechazo 409 `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS` lleva la extensión `discipulados: DiscipuladoActivo[]` (`contracts/discipulado-api.md`, "Cambio al contrato del spec 005"). Sacar la entrada de `RECHAZOS_DE_QUITAR` del código eliminado. Actualizar `specs/005-roles-permisos-acceso/contracts/roles-personas-api.md` con una nota que apunte a D137.
- [ ] T056 Cambiar el listado de `apps/api/src/persona/persona.service.ts` (`GET /personas`): `quitar.discipulador` con `discipuladosActivosDeVarias(tx, idsDeLaPagina)`, **una** consulta por página.
- [ ] T057 Actualizar `apps/api/test/unit/puede-quitar-rol.spec.ts` (sin discipulados → puede; con uno → `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`; el orden de las reglas sigue siendo el de la API) y `apps/api/test/roles-personas.e2e-spec.ts` (quitar `discipulador` sin discipulados ahora **pasa** y deja su fila de `CambioDeRol`; con uno, 409 con la lista). Mismo commit que T055, no heredar tests en rojo.
- [ ] T058 Cambiar `apps/backoffice/src/app/personas/personas-cliente.tsx`: el rechazo de quitar `discipulador` nombra los discipulados ("Tiene a su cargo el discipulado de Ana Pérez. Reasignalo antes de quitarle el rol.") con next-intl a partir de la extensión, y ofrece ir a `/grupos`. Actualizar el e2e `T062` de `apps/backoffice/e2e/personas.spec.ts`, que hoy afirma que nunca se ofrece quitar `discipulador`: sin discipulados se ofrece y funciona; con uno, se ve el motivo.
- [ ] T059 Verificar `apps/backoffice/src/app/personas/personas-cliente.tsx` (el cambio del mensaje) contra el checklist de `docs/15-guia-ux-ui.md`: el mensaje dice **cómo** destrabar, no solo que no se puede.
- [ ] T060 Registrar el cierre de H-127 en `specs/revision-manual/2026-09-17-001-002.md`, como los cierres anteriores (H-149, H-151): qué cambió, qué test lo prueba (T029 con la carrera, T057) y que la guarda ya no falla cerrada porque la consulta existe, no porque se relajó.

---

## Phase 10: Polish & Cross-Cutting

- [ ] T061 e2e del flujo crítico completo en `apps/backoffice/e2e/vida-nueva-flujo-completo.spec.ts` (va último, cruza A, B y C): pedir por API como Persona → aprobar en `/solicitudes` → registrar un Encuentro → proponer → confirmar, con `auditar()` en claro y oscuro en cada pantalla. Y en `apps/web`, el estado final "terminado" en Mi camino (se puede extender `mi-camino-vida-nueva.spec.ts`).
- [ ] T062 Actualizar `apps/backoffice/e2e/axe-todas-las-rutas.spec.ts` si hace falta para las rutas `[id]` nuevas (patrón de `/sedes/[id]`: necesita un id real sembrado) y confirmar que ninguna ruta da 404 (H-132).
- [ ] T063 Recorrer `quickstart.md` a mano, los 11 escenarios, y anotar lo que no coincida como hallazgo en `specs/revision-manual/`, no como arreglo silencioso.
- [ ] T064 Las tres suites en verde, leídas del informe y no del color (H-146/H-147): `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice`, con 0 unexpected y 0 flaky. Registrar el cierre de la 004 en `specs/revision-manual/2026-09-17-001-002.md`.

---

## Dependencies & Execution Order

- **Phase 1–2 (lote 0)** bloquean todo.
- **US1** no depende de otra historia. **US3** necesita que exista una Solicitud; en los tests se crea por API, sin la pantalla de US1.
- **US2** lee lo que producen US1 y US3; la parte "pendiente" se prueba con US1 sola.
- **US4** no depende de ninguna: solo alimenta el listado de US3 (T025).
- **US5** necesita un Grupo, que se siembra por API (T029 deja el helper) o se aprueba.
- **US6** necesita un Grupo con Liderazgo; la reasignación (T028) es de US3 pero su UI vive en `grupos/[id]` (T052).
- **Phase 9 (H-127)** necesita T011 (lote 0) y nada más.
- **T061** va último.

## Lotes (sesiones en paralelo que no se pisan)

**Lote 0 — primero y solo:** T001–T014. Todo lo que toca `packages/shared-types`,
`schema.prisma` y su migración, `seed.ts`, `sembrar-e2e-admin.ts`, `limpiar-e2e.ts`,
`app.module.ts`, `nav.ts`, `helpers.ts` del backoffice y la estructura de los `es.json`. D137 ya
está en `docs/05-decisiones.md`, y ningún lote paralelo agrega decisiones: si alguno necesita una,
para y pregunta.

Después del lote 0, cuatro sesiones en paralelo. Cada una escribe solo en sus carpetas y en su
namespace de `es.json`:

| Lote | Tareas | Archivos propios |
|---|---|---|
| **A — Solicitudes y Mi camino** | T015–T024, T026, T027, T030–T036 | `apps/api/src/solicitud-discipulado/`, `apps/web/src/app/(app)/mi-camino/`, `apps/backoffice/src/app/solicitudes/`, `apps/backoffice/src/components/pedir-en-nombre-de.tsx`, sus tests y los namespaces `miCamino` y `solicitudes` |
| **B — discipulado** | T025, T028, T029, T042–T054 | `apps/api/src/discipulado/` (salvo `discipulados-activos.ts`), `apps/backoffice/src/app/grupos/`, `apps/backoffice/src/app/mis-discipulados/`, sus tests y los namespaces `grupos` y `misDiscipulados` |
| **C — disponibilidad** | T037–T041 | `apps/api/src/disponibilidad/`, `apps/backoffice/src/app/mi-disponibilidad/`, sus tests y el namespace `miDisponibilidad` |
| **D — H-127** | T055–T060 | `apps/api/src/persona/roles.service.ts`, `persona.service.ts`, `apps/backoffice/src/app/personas/`, los tests del 005 que cambian y la revisión manual |

- **Cruces de a pares entre lotes, resueltos así:**
  - T025 (listado de disponibles) vive en `apps/api/src/discipulado/`, así que es de B, pero A lo consume en T024 y T027. B lo hace **primero** dentro de su lote, o A usa un stub del endpoint hasta el merge.
  - `pedir-en-nombre-de.tsx` es de A; B lo usa en T046. Lo mismo: A lo termina primero, o B deja el botón para el final de su lote.
  - T029 (integración de aprobar y reasignar) cruza A y B: va en B, después de mergear T024.
- **Después de los cuatro:** T061–T064, en una sola sesión.

## Implementation Strategy

- **MVP = lote 0 + US1 + US3** (pedir, aprobar, armar el Grupo). Con eso ya hay Vida Nueva en el sistema.
- Después, por valor: US5 (el discipulado deja rastro), US6 (cierra el ciclo), US2 (la Persona se entera) y US4 (el Admin elige con información real). La **Phase 9** conviene no dejarla para el final: mientras no esté, a ningún Discipulador se le puede quitar el rol (H-127 sigue fallando cerrado).
- Cada lote cierra con sus tests en verde y un commit por cambio coherente, en español. Sin push salvo pedido.
