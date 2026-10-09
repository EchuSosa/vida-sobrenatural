# Tasks: Bautismo

**Input**: Design documents from `/specs/010-bautismo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la spec no los pide explícitamente, pero la Constitución sí (Principio VI) y el brief de
esta corrida también: **cada criterio tiene su test**. Unit para toda regla con ramas, integración
para lo que cambia estado contra la base, e2e con axe en los dos temas para los flujos de pantalla.
La tabla **Cobertura** (al final) mapea cada FR y SC a su test.

**Organización**: por historia de usuario, en orden de prioridad (US1, US2, US3 son P1; US4, US5,
US6 son P2; US7 es P3). Cada pantalla nueva o modificada lleva su tarea de checklist de
`docs/15-guia-ux-ui.md` (D114). Al final, **Lotes** agrupa las tareas en sesiones paralelas que no
se pisan.

**Convenciones que valen para todas las tareas** (para no repetirlas):
- Permisos solo con `@RequierePermiso` / `requerirPermiso` contra `CATALOGO_PERMISOS` (D132).
- Errores con Problem Details y un `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50). Prisma con `select` explícito.
- Toda transición: `SELECT … FOR UPDATE` de la(s) Solicitud(es) en orden de id y chequeo de estado
  dentro de la transacción (research #10); `emitirEventoBautismo()` **después** del commit, con el
  evento de `contracts/eventos-bautismo.md`.
- Textos por `next-intl`, rioplatense con voseo (D84). Colores solo de tokens (D118); todo estado
  con texto + ícono (D81). Botones con `Button` + `useEnvio` (H-57); validación con
  `useValidacionCampos` + `ResumenErrores` + `MensajeErrorCampo` (H-50). En Next, "cargando" es
  `loading.tsx` y "error" es `error.tsx`.
- **Celular (D150)**: en `apps/web`, letra de 16 px en etiquetas, botones y ayudas (14 px solo
  metadatos), botones de 44 px de alto; 360 px primero. Los e2e de la card llevan `@celular`.
- Diálogos de retirar y "No puedo ese día": neutros, no rojos (D151).
- Listados que crecen: paginado, búsqueda y orden en la API; página en la URL (`docs/15`).

---

## Phase 1: Setup

- [x] T001 **[Sesión 010: Hecho: rama desde main con la 011 completa.]** Verificar antes de arrancar: `main` actualizado; si hay decisiones nuevas en `docs/05-decisiones.md`, mirar el último número (D89, D103); `.specify/feature.json` apunta a `specs/010-bautismo`; **la spec 011 está mergeada** (si no, el lote 0 deja `inscripcionEventoId` sin FK y T033 la agrega en lote B — ver plan, Paralelización); y si otra spec ya creó la vista `bandeja_solicitudes`, la variante neutra del diálogo (D151) o el proyecto `celular` de `apps/web`, reusarlos en T009, T017 y T015.

---

## Phase 2: Foundational (lote 0 — bloquea todas las historias, una sola sesión)

- [x] T002 **[Sesión 010: Hecho en `bautismo.ts`.]** **[Lote 0 global: el enum y las constantes ya están; `EstadoCardBautismo`, `HechosBautismo`, `estadoCardBautismo`, `motivoNoPuedePedir` y los DTOs → sesión de la 010, en el mismo archivo]** [P] Crear `packages/shared-types/src/bautismo.ts` (data-model.md, "Valores compartidos"): `EstadoSolicitudBautismo = 'pendiente' | 'aprobada' | 'rechazada' | 'retirada' | 'realizada'`; `COMENTARIO_BAUTISMO_MAX = 500`, `MOTIVO_RECHAZO_BAUTISMO_MAX = 500`, `EDAD_MINIMA_PEDIR_BAUTISMO_SOLO = 12` (constante propia, no la de Vida Nueva — H-128); la unión `EstadoCardBautismo` con sus 8 variantes exactas (`no_habilitada`, `lo_pide_su_tutor`, `puede_pedir { ultimo?: 'rechazada' | 'retirada' }`, `en_revision { solicitudId, desde }`, `esperando_fecha { solicitudId, aceptadaEn }`, `con_fecha { solicitudId, evento: { id, nombre, fecha, lugar, slug } }`, `fecha_pasada_sin_confirmar { solicitudId, evento }`, `bautizada { en: string | null }`) — FR-019; `HechosBautismo` (`vidaNueva: 'en_curso' | 'completada' | 'ninguna'`, `habilitada`, `edad`, `solicitudAbierta`, `ultimoDesenlace`, `bautizada`, `bautizadaEn`, `eventoAsignado`, `ahora`); `estadoCardBautismo(hechos)` y `motivoNoPuedePedir(hechos)` (research #6; devuelve `PERSONA_YA_BAUTIZADA` > `SOLICITUD_BAUTISMO_YA_ABIERTA` > `EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO` > `BAUTISMO_NO_HABILITADO` > `null`, en ese orden); y los DTOs `SolicitudBautismoDetalle`, `EventoDeBautismoResumen`, `FilaAsignada`, `FilaEsperando`, `AsignacionResultado`. Exportar desde `index.ts`.
- [x] T003 **[Sesión 010: Hecho.]** **[Lote 0 global: → sesión de la 010]** [P] Unit test de tabla en `apps/api/test/unit/estado-card-bautismo.spec.ts` (FR-002, FR-003, FR-004, FR-005, FR-019, SC-004): una fila por cada una de las 8 variantes de la card, y para `motivoNoPuedePedir`: en curso → null; completada → null; ninguna sin habilitar → `BAUTISMO_NO_HABILITADO`; ninguna habilitada → null; 11 años con Vida Nueva → `EDAD_INSUFICIENTE…`; 12 años → null; abierta → `…YA_ABIERTA`; bautizada → `PERSONA_YA_BAUTIZADA` aunque tenga todo lo demás; precedencia entre motivos; `con_fecha` vs `fecha_pasada_sin_confirmar` en el borde exacto de `ahora`.
- [x] T004 **[Lote 0 global: reemplazado por `CATALOGO_AVISOS` (D197): eventos `bautismo.*`]** [P] Crear `packages/shared-types/src/eventos-bautismo.ts` con `EventoBautismo` exactamente como `contracts/eventos-bautismo.md` (solo ids en `datos`). Exportar desde `index.ts`.
- [x] T005 **[Lote 0 global: reemplazado por D178: `TipoSolicitud` en `bandeja.ts`; la fila es `SolicitudBandeja` y lo propio va en `extra` (la fuente `bautismo` la registra la 010)]** Extender `packages/shared-types/src/discipulado.ts`: `TipoSolicitud = 'discipulado' | 'bautismo'`; `EstadoSolicitud` de la fila de bandeja pasa a `EstadoSolicitud | EstadoSolicitudBautismo`; `SolicitudResumen` suma `eventoAsignado: { id, nombre, fecha } | null` (solo bautismo; `null` en discipulado). Ajustar los usos de la 004 que el typecheck marque (`apps/backoffice/src/app/solicitudes/*`) sin cambiar comportamiento; correr `pnpm --filter api run test` y el typecheck de las tres apps.
- [x] T006 **[Lote 0 global: hecho, con traducciones]** Extender `packages/shared-types/src/error-code.ts` con `BAUTISMO_NO_HABILITADO`, `EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO`, `SOLICITUD_BAUTISMO_YA_ABIERTA`, `PERSONA_YA_BAUTIZADA`, `SOLICITUD_BAUTISMO_YA_CAMBIO`, `EVENTO_NO_ES_DE_BAUTISMO`, `EVENTO_NO_DISPONIBLE_PARA_ASIGNAR`, `EVENTO_TODAVIA_NO_OCURRIO` (comentario con el FR de cada uno, `contracts/bautismo-api.md`); los de campo `COMENTARIO_DEMASIADO_LARGO` y `SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO` bajo `VALIDACION`. Traducciones en `apps/web/src/messages/es.json` y `apps/backoffice/src/messages/es.json` (`errors`), diciendo **cómo** corregir (H-50).
- [x] T007 **[Lote 0 global: hecho]** Extender `packages/shared-types/src/permisos.ts`: `'bautismo.habilitar': ['admin']` y `'bautismo.crear_en_nombre': ['admin']` (research #12; **no** reutilizar `solicitudes.crear_en_nombre`, que incluye al Discipulador — D143). Los demás endpoints reusan `solicitudes.ver` y `solicitudes.aprobar`. Actualizar el test del catálogo si enumera permisos.
- [x] T008 **[Lote 0 global: en la migración única `20261008120000_lote_0_global`]** Extender `apps/api/prisma/schema.prisma` según `data-model.md`: enum `EstadoSolicitudBautismo { pendiente aprobada rechazada retirada realizada }`; modelo `SolicitudBautismo` (`@@map("solicitudes_bautismo")`) con `comentario String?` ("≤ 500"), `creadoPorId String?` ("null = la pidió la propia Persona"), `revisadoPorId String?`, `revisadaEn DateTime?`, `motivoRechazo String?` ("Solo equipo… ≤ 500"), `inscripcionEventoId String? @unique` (FK a `InscripcionEvento` de la 011), `realizadaEn DateTime?`, `retiradaEn DateTime?`, `createdAt`, `updatedAt`, `@@index([personaId])`, `@@index([estado, createdAt])`; en `Persona`, `bautismoHabilitadoEn DateTime?` y `bautismoHabilitadoPorId String?` con relaciones con nombre explícito (`solicitudesBautismo`, `solicitudesBautismoCreadas`, `solicitudesBautismoRevisadas`, `bautismosHabilitados`).
- [x] T009 **[Lote 0 global: en la migración única; la vista es `solicitudes_bandeja` (D178) con las siete ramas]** Crear la migración con `pnpm --filter api exec prisma migrate dev --create-only --name bautismo` y agregarle en SQL (patrón H-140): `CREATE UNIQUE INDEX solicitudes_bautismo_una_abierta ON solicitudes_bautismo ("personaId") WHERE estado IN ('pendiente','aprobada')`; CHECK `"inscripcionEventoId" IS NULL OR estado IN ('aprobada','realizada')`; CHECK `(estado = 'realizada') = ("realizadaEn" IS NOT NULL)`; CHECK de largo ≤ 500 en `comentario` y `"motivoRechazo"`; CHECK en `personas` (`"bautismoHabilitadoEn" IS NULL) = ("bautismoHabilitadoPorId" IS NULL)`; y `CREATE OR REPLACE VIEW bandeja_solicitudes` con el `UNION ALL` de `data-model.md` (si otra spec ya la creó, conservar sus ramas y sumar la de bautismo). Aplicarla.
- [x] T010 **[Sesión 010: Hecho, dentro de `bautismo-persona.integration-spec.ts` (bloque "restricciones de la base").]** **[Lote 0 global: la coherencia de la vista con `ESTADOS_ABIERTOS` ya está en `lote-0-global.integration-spec.ts`; las restricciones propias → sesión de la 010]** Test de integración de las restricciones en `apps/api/test/integration/bautismo-restricciones.integration-spec.ts` (FR-004, FR-034): dos inserts `pendiente` de la misma Persona → el segundo falla por el índice; `pendiente` + `rechazada` conviven; `realizada` sin `realizadaEn` falla; `pendiente` con `inscripcionEventoId` falla; la vista devuelve filas de los dos tipos con la forma base.
- [x] T011 **[Sesión 010: Hecho: `estado-bautismo.ts` con `completoEtapa` (sin puerto); integración en `bautismo-persona` y `bautismo-admin`.]** **[Lote 0 global: → sesión de la 010; el "completó Vida Nueva o se bautizó por historial" sale de `completoEtapa` (camino/consultas.ts, D155), sin puerto aparte]** Crear `apps/api/src/bautismo/estado-bautismo.ts` (research #7): `vidaNuevaDe(tx, personaId)` (`en_curso` si hay `Inscripcion` `activa` en un Grupo del Curso `vida_nueva`, con `desde`; `completada` si hay una `completada` o `HistorialPrevio.vidaNuevaDeclaradaConfirmada`; si no, `ninguna`), `estaBautizada(tx, personaId)` (Solicitud `realizada` → `{ si: true, en: realizadaEn }`, o `HistorialPrevio.bautismoDeclaradoConfirmado`), `hechosDe(tx, personaId, ahora)` que arma `HechosBautismo`, y el puerto `HistorialPrevio` con su implementación por defecto que devuelve `false` (provider de Nest reemplazable, `contracts/dependencia-evento.md` H1). Integración en `apps/api/test/integration/estado-bautismo.integration-spec.ts` (FR-002, FR-030): Inscripción activa → `en_curso`; completada → `completada`; `abandono` → `ninguna`; un puerto falso que devuelve `true` → `completada` / bautizada (prueba que el puerto se consulta); Solicitud `realizada` → bautizada con su fecha.
- [x] T012 **[Lote 0 global: reemplazado por `NotificacionesService.emitir(tx, …)` (D197)]** [P] Crear `apps/api/src/bautismo/eventos.ts` con `emitirEventoBautismo(evento)` (Logger estructurado con `nombre`, `personaId` e ids; nunca nombres, motivos ni comentarios — FR-024). Unit test en `apps/api/test/unit/eventos-bautismo.spec.ts`: no se loguea ningún campo fuera de ids.
- [x] T013 **[Lote 0 global: `BautismoService` exporta los dos hooks con su firma (no-op hasta que la 010 los implemente)]** Crear `apps/api/src/bautismo/bautismo.module.ts` vacío (controladores y servicio sin endpoints), registrarlo en `app.module.ts`, exportar `BautismoService` (lo inyecta la 011 para el hook, E7).
- [x] T014 **[Sesión 010: Hecho: `sembrar-e2e/010-bautismo.ts` (Eventos pasados con asignadas) y `helpers-010.ts` en web y backoffice; el resto lo arman los e2e por la API.]** **[Lote 0 global: `limpiar-e2e.ts` ya borra `SolicitudBautismo` antes que las inscripciones; lo sembrado y los helpers → sesión de la 010]** Fixtures y limpieza e2e: extender `apps/api/scripts/sembrar-e2e-admin.ts` con `e2e-bautismo-vn@…` (Vida Nueva en curso), `e2e-bautismo-sin-vn@…` (sin Vida Nueva, sin habilitar), `e2e-bautismo-menor@…` (11 años, Vida Nueva en curso) y `e2e-bautismo-sin-app@…` (sin acceso); un Evento de bautismo futuro y uno pasado con el helper de la 011 (E8); extender `apps/api/scripts/limpiar-e2e.ts` para borrar `SolicitudBautismo` de Personas `e2e-` antes que sus inscripciones (H-67); helpers en `apps/web/e2e/helpers.ts` y `apps/backoffice/e2e/helpers.ts`: `pedirBautismoComo(email)`, `aceptarBautismo(id, eventoId?)`, `asignarABautismo(eventoId, ids)` (por API, para no depender de pantallas de otro lote).
- [x] T015 **[Lote 0 global: hecho]** [P] Agregar el proyecto `celular` (`devices['Pixel 7']`, `grep: /@celular/`) a `apps/web/playwright.config.ts`, como en el backoffice (research #15, D150).
- [x] T016 **[Lote 0 global: hecho]** [P] Namespaces vacíos `miCamino.bautismo` en `apps/web/src/messages/es.json` y `solicitudes.bautismo`, `eventos.bautismo`, `personas.bautismo` en `apps/backoffice/src/messages/es.json`, para que los lotes no choquen al agregar claves.
- [x] T017 **[Lote 0 global: la prop `tono` existe (default `destructivo`); el aspecto de cada tono lo aplica `ajustes-ux` (D151)]** [P] Si D151 todavía no lo hizo: sumar a `packages/ui/src/components/confirm-destructive-dialog.tsx` una prop `tono: 'destructivo' | 'neutro'` (default `destructivo`; `neutro` = botón primario sin rojo ni ícono de alerta) o un `ConfirmDialog` neutro aparte, exportado desde `packages/ui/src/index.ts`; e2e de contraste del botón en los dos temas en el spec que primero lo use (T044).

**Checkpoint**: lote 0 en verde (`pnpm --filter api run test`, typecheck de las tres apps). Abren los lotes A, B y C.

---

## Phase 3: User Story 1 — Pedir el bautismo desde Mi camino (P1) 🎯 MVP · lote A

**Goal**: una Persona habilitada pide el bautismo desde la card y ve que quedó en revisión.
**Independent Test**: Persona con Vida Nueva en curso → card → "Quiero bautizarme" → `en_revision`; el pedido existe en la base.

- [x] T018 **[Sesión 010: Hecho: `acciones-persona.ts` + `me.controller.ts`.]** [US1] En `apps/api/src/bautismo/bautismo.service.ts` y `bautismo.controller.ts`: `GET /bautismo/me` (`hechosDe` → `estadoCardBautismo`, nunca `motivoRechazo`) y `POST /bautismo/solicitudes/me` con `{ comentario?: string }` (≤ `COMENTARIO_BAUTISMO_MAX`, error de campo `COMENTARIO_DEMASIADO_LARGO`), que rechaza con `motivoNoPuedePedir()` y traduce el `P2002` del índice a `SOLICITUD_BAUTISMO_YA_ABIERTA`; responde 201 con la card `en_revision`; **sin** evento de aviso (FR-025). Sesión `activa`, sin permiso de catálogo (como `/discipulado/me`). DTO en `apps/api/src/bautismo/dto/`. Cubre FR-001 a FR-005.
- [x] T019 **[Sesión 010: Hecho en `bautismo-persona.integration-spec.ts`.]** [US1] Integración en `apps/api/test/integration/bautismo-pedir.integration-spec.ts` (FR-001 a FR-005, FR-025): pide con Vida Nueva en curso → 201 y fila `pendiente` con `creadoPorId = null`; con completada → 201; sin Vida Nueva → 409 `BAUTISMO_NO_HABILITADO`; habilitada sin Vida Nueva → 201; 11 años → 409 `EDAD_INSUFICIENTE…`; dos pedidos en paralelo (`Promise.all`) → uno 201 y otro 409 `SOLICITUD_BAUTISMO_YA_ABIERTA`, una sola fila; bautizada → 409 `PERSONA_YA_BAUTIZADA`; comentario de 501 caracteres → `VALIDACION` en `comentario`; `GET /bautismo/me` devuelve `en_revision` y no expone `motivoRechazo`; no se emitió ningún evento.
- [x] T020 **[Sesión 010: Hecho: `tarjeta-bautismo.tsx` + `acciones-bautismo.tsx`. El "Ya me bauticé" es el "Ya lo hice" de la 006.]** [US1] Crear `apps/web/src/app/(app)/mi-camino/tarjeta-bautismo.tsx` con los estados `no_habilitada` (explica la regla con texto de `docs/15` y enlaza a la card de Vida Nueva — FR-002), `lo_pide_su_tutor` (FR-003), `puede_pedir` (explicación corta + "Quiero bautizarme" que abre un paso de confirmación con el campo opcional "¿Querés contarnos algo?" con su ayuda y contador; confirma con `Button` + `useEnvio`; errores por campo), `en_revision` (texto "Recibimos tu pedido, el equipo lo está revisando", desde cuándo, qué pasa después) y `bautizada` (FR-019); cada estado con ícono de `lucide-react` + texto (D81), tokens de color, 16 px / 44 px (D150, FR-032); prop opcional `accionYaLoHice?: ReactNode` que se renderiza en `no_habilitada` y `puede_pedir` (FR-020b). Claves en `miCamino.bautismo`. Al pedir, la card se actualiza con la respuesta sin recargar.
- [x] T021 **[Sesión 010: Hecho por el contrato del lote 0 (la página ya renderiza `AccionesBautismo`); no hizo falta tocar `page.tsx`.]** [US1] En `apps/web/src/app/(app)/mi-camino/page.tsx`: sumar `apiFetch<EstadoCardBautismo>('/bautismo/me')` y `<TarjetaBautismo estadoInicial={…} />` después de la card de Vida Nueva (una línea; research #14). `loading.tsx` muestra el esqueleto de las dos cards; `error.tsx` ya cubre la falla.
- [x] T022 **[Sesión 010: Hecho: `apps/web/e2e/mi-camino-bautismo.spec.ts`.]** [US1] E2E en `apps/web/e2e/mi-camino-bautismo.spec.ts`, título con `@celular` (US1 escenarios 1–8, SC-001, SC-007): con `e2e-bautismo-vn` ve la card y pide en ≤ 2 toques tras abrirla → ve "Recibimos tu pedido…"; recargar mantiene `en_revision` y no ofrece pedir otra vez; `e2e-bautismo-sin-vn` ve la explicación y el enlace a Vida Nueva, sin botón; `e2e-bautismo-menor` ve "lo hace tu mamá, papá o tutor…"; comentario de 501 → mensaje bajo el campo y resumen arriba con foco; doble clic en confirmar crea un solo pedido; axe sin violaciones en claro y oscuro; a 360 px sin scroll horizontal y botón principal ≥ 44 px de alto.
- [x] T023 **[Sesión 010: Hecho: `checklists/pantallas.md`.]** [US1] Checklist de `docs/15` para la card de Bautismo (estados de US1) en `specs/010-bautismo/checklists/pantallas.md`: acción principal "Quiero bautizarme", orden de botones, cuatro estados, reentrada, feedback (`docs/16`: "Recibimos tu pedido…"), qué pasa después, tono, celular/teclado/lector, contraste claro y oscuro. Cada ítem dice cómo se verificó.

---

## Phase 4: User Story 2 — Aceptar o rechazar los pedidos (P1) · lote B

**Goal**: el Admin ve los pedidos en la bandeja unificada, los acepta o rechaza; la Persona ve el resultado.
**Independent Test**: Solicitud pendiente → bandeja filtrada por "Bautismo" → detalle → Aceptar → `GET /bautismo/me` = `esperando_fecha`.

- [x] T024 **[Sesión 010: Reemplazada: la bandeja unificada es de la 013 (D178); la 010 registra `FuenteBautismo`.]** [US2] Crear `apps/api/src/solicitud-discipulado/bandeja.service.ts` y hacer que `GET /solicitudes` lea la vista `bandeja_solicitudes` con `$queryRaw` parametrizado (research #4): `tipo` (`discipulado` | `bautismo` | ausente = todos), `estado` (valores de los dos tipos; `abiertas` = `pendiente`+`propuesta` de discipulado y `pendiente` de bautismo; `esperando_fecha` = bautismo `aprobada` sin inscripción), `buscar` (nombre/apellido, unido a `personas`), `orden` (`fecha` | `persona` | `espera`), `dir`, `skip`, `take`; luego completa por página `propuestaVigente` (discipulado) y `eventoAsignado` (bautismo). Sin cambios de contrato para Discipulado (FR-006).
- [x] T025 **[Sesión 010: Reemplazada (013); la fuente `bautismo` se prueba en `bautismo-admin.integration-spec.ts`.]** [US2] Integración en `apps/api/test/integration/bandeja-solicitudes.integration-spec.ts` (FR-006): con 15 de discipulado y 15 de bautismo y `take=20`, la página 2 trae las 10 que faltan en el orden correcto; `tipo=bautismo` solo trae bautismo; `abiertas` no incluye bautismo `aprobada`; `esperando_fecha` sí, y solo sin inscripción; `buscar` filtra en los dos tipos; los tests existentes de la bandeja de la 004 siguen en verde.
- [x] T026 **[Sesión 010: Hecho: `acciones-admin.ts` + `bautismo.controller.ts`; avisos por `emitir` dentro de la transacción (D197).]** [US2] En `bautismo.service.ts` / `bautismo.controller.ts`: `GET /bautismo/solicitudes/:id` (`solicitudes.ver`, `SolicitudBautismoDetalle` con `vidaNueva`, `habilitacion`, `evento`, `motivoRechazo` — FR-007), `POST …/:id/aceptar` (`solicitudes.aprobar`; exige `pendiente`; `{ eventoId? }` asigna en la misma transacción vía T031 — FR-008), `POST …/:id/rechazar` (`{ motivo? }` ≤ `MOTIVO_RECHAZO_BAUTISMO_MAX` — FR-009); ambos con `FOR UPDATE` y `SOLICITUD_BAUTISMO_YA_CAMBIO` (FR-010); eventos `solicitud_bautismo_aceptada` / `_rechazada` después del commit (FR-023).
- [x] T027 **[Sesión 010: Hecho en `bautismo-admin.integration-spec.ts`.]** [US2] Integración en `apps/api/test/integration/bautismo-revisar.integration-spec.ts` (FR-007 a FR-011, FR-023): detalle con cada variante de `vidaNueva` y la habilitación con quién; aceptar → `aprobada`, `revisadoPorId`, `revisadaEn`, evento emitido una vez; aceptar con `eventoId` → además asignada; rechazar con motivo → `rechazada`, motivo guardado, `GET /bautismo/me` de la Persona = `puede_pedir { ultimo: 'rechazada' }` sin motivo; aceptar una ya aceptada → 409 `…YA_CAMBIO`; carrera retirar (Persona) vs aceptar (Admin) en paralelo → una gana y la otra 409, estado final coherente; Pastor → 200 en GET y 403 en aceptar/rechazar; Discipulador → 403 en todo.
- [x] T028 **[Sesión 010: Reemplazada (013): la bandeja ya tiene filtro por tipo y estado; "Esperando fecha" = `tipo=bautismo&estado=aprobada`.]** [US2] Bandeja en `apps/backoffice/src/app/solicitudes/` (`page.tsx`, `solicitudes-cliente.tsx`, `constantes.ts`): mostrar el filtro por tipo (Todos / Vida Nueva / Bautismo) con `ControlesTabla`, sumar `esperando_fecha` a los filtros de estado cuando el tipo es Bautismo o Todos, columna "Tipo" en texto, y enlazar cada fila a `/solicitudes/[id]` (discipulado) o `/solicitudes/bautismo/[id]` (bautismo). Filtros en la URL; cambiar filtro vuelve a la página 1 (`docs/15`). FR-006.
- [x] T029 **[Sesión 010: Hecho: `app/solicitudes/bautismo/[id]/`.]** [US2] Crear `apps/backoffice/src/app/solicitudes/bautismo/[id]/` (`page.tsx` con `requerirPermiso('solicitudes.ver')`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `detalle-bautismo-cliente.tsx`): miga `Solicitudes › {Persona}` (`docs/15`), datos de FR-007, acción principal "Aceptar" (con selector opcional de próximos Eventos de bautismo, T037) y secundaria "Rechazar" (panel con motivo opcional, aclarando que la Persona no lo ve); Pastor ve todo sin botones (FR-011); el error `…YA_CAMBIO` se explica y recarga.
- [x] T030 **[Sesión 010: Hecho en `apps/backoffice/e2e/bautismo.spec.ts`.]** [US2] E2E en `apps/backoffice/e2e/bautismo-revision.spec.ts` (US2 escenarios 1–6, SC-002, SC-007): la bandeja muestra filas de los dos tipos con su tipo escrito; el filtro "Bautismo" las aísla; abrir → aceptar → la Persona (`GET /bautismo/me` por helper) queda `esperando_fecha`; otra → rechazar con motivo → la fila dice "rechazada"; como Pastor, mismo detalle sin botones; axe en claro y oscuro en bandeja y detalle.
- [x] T031 **[Sesión 010: Hecho.]** [US2] Checklist de `docs/15` de la bandeja (cambios) y del detalle de Solicitud de Bautismo en `specs/010-bautismo/checklists/pantallas.md`.

---

## Phase 5: User Story 3 — Asignar a los aceptados a un Evento de bautismo (P1) · lote B

**Goal**: el Admin suma aceptados a un Evento de bautismo, de a varios, y cada Persona ve su fecha.
**Independent Test**: Evento futuro + dos aceptadas → "Esperando fecha" → tildar dos → confirmar → las dos con `con_fecha`.

- [x] T032 **[Sesión 010: Hecho (en `bautismo.controller.ts`, no en un controller aparte).]** [US3] En `apps/api/src/bautismo/bautismo-eventos.controller.ts` y el servicio: `GET /bautismo/eventos` (próximos de bautismo, activos, `fecha > now()`, asc), `GET /bautismo/eventos/:eventoId` (asignadas + `esperandoFecha` paginada con `skipEsperando`/`takeEsperando`, orden `revisadaEn` asc + `puedeConfirmar` — FR-033), `POST /bautismo/eventos/:eventoId/asignar` (`{ solicitudIds }` 1..100; valida `EVENTO_NO_ES_DE_BAUTISMO` y `EVENTO_NO_DISPONIBLE_PARA_ASIGNAR`; por Solicitud en orden de id: exige `aprobada`, cancela la inscripción anterior si estaba en otro Evento, crea la `InscripcionEvento` `confirmada` con la operación de la 011 que saltea cupo y aprobación (E5), setea la FK; resultado parcial `{ asignadas, noAsignadas: [{ id, code }] }`) y `POST /bautismo/solicitudes/:id/quitar-de-evento` (cancela la inscripción — D69 — y FK → `null`). Eventos `bautismo_fecha_asignada` / `bautismo_fecha_quitada`. FR-012 a FR-015, FR-017.
- [x] T033 **[Sesión 010: No hace falta: la FK ya está en la migración del lote 0.]** [US3] Si T001 dejó la FK pendiente: agregar la relación `inscripcionEventoId → InscripcionEvento` en `schema.prisma` y su migración, una vez mergeada la 011.
- [x] T034 **[Sesión 010: Hecho en `bautismo-admin.integration-spec.ts`.]** [US3] Integración en `apps/api/test/integration/bautismo-asignar.integration-spec.ts` (FR-012 a FR-015, FR-017, FR-033): asignar dos → dos inscripciones `confirmada` con `creadoPorId` del Admin y las FK seteadas, dos eventos; asignar una `pendiente` → `noAsignadas` con su code y las demás asignadas; a un Evento que no es de bautismo → 409; a uno pasado o inactivo → 409; reasignar a otro Evento → la inscripción anterior `cancelada` y una nueva; quitar → FK `null`, inscripción `cancelada`, `GET /bautismo/me` = `esperando_fecha`; la Persona ve `con_fecha` con nombre, fecha y lugar **leídos del Evento** (cambiar el lugar del Evento cambia lo que ve); `esperandoFecha` pagina y ordena por antigüedad; Pastor 403 en asignar.
- [x] T035 **[Sesión 010: Hecho (el hook emite adentro; la 011 ya lo llama al cancelar).]** [US3] Hook `BautismoService.liberarAsignacionesDeEvento(tx, eventoId)` (FR-016, FR-026, E7): pone la FK en `null` en todas las `aprobada` del Evento, cancela sus inscripciones y devuelve los eventos `bautismo_evento_cancelado` listos para emitir después del commit. Integración en `apps/api/test/integration/bautismo-evento-cancelado.integration-spec.ts`: con tres asignadas, el hook dentro de una transacción → las tres `esperando_fecha`, tres eventos; si la transacción se revierte, nada cambia y no se emite nada.
- [x] T036 **[Sesión 010: Hecho, montada en `eventos/[id]/page.tsx` en lugar de los inscriptos (E6).]** [US3] Crear `apps/backoffice/src/components/seccion-bautismo-evento.tsx` (la monta el detalle de Evento de la 011, E6; si la 011 no tiene detalle todavía, montarla en una ruta temporal `apps/backoffice/src/app/eventos/[id]/bautismo/page.tsx` con `requerirPermiso('solicitudes.ver')`, el mismo permiso que su endpoint): dos bloques, "Personas a bautizar" (lista con "Quitar") y "Esperando fecha" (selección múltiple con casillas reales, "Seleccionar todas", acción principal "Sumar al bautismo (N)", paginado con `Paginacion`); el resultado parcial se muestra en texto ("Se sumaron 3; 1 ya no estaba aceptada"); vacío amable ("No hay pedidos aceptados esperando fecha"); Pastor sin acciones. Claves en `eventos.bautismo`.
- [x] T037 **[Sesión 010: Hecho.]** [US3] En el detalle de la Solicitud (T029): selector "Asignar a un bautismo" con `GET /bautismo/eventos`; sin Eventos futuros, texto + enlace "Crear un Evento de bautismo" (ruta de la 011, E9) en vez de un selector vacío (escenario 3.5); "Quitar de esta fecha" cuando ya tiene una.
- [x] T038 **[Sesión 010: Hecho en `bautismo.spec.ts` (con dos aceptadas; no se midió el minuto con diez).]** [US3] E2E en `apps/backoffice/e2e/bautismo-asignar.spec.ts` (US3 escenarios 1–5, SC-003): con 10 aceptadas por helper, abrir la sección del Evento, "Seleccionar todas", "Sumar al bautismo (10)" → las 10 en "Personas a bautizar" en menos de 1 minuto de interacción; quitar una → vuelve a "Esperando fecha"; desde el detalle de una Solicitud sin Eventos futuros → ve el enlace a crear uno; axe claro y oscuro.
- [ ] T039 **[Sesión 010: Pendiente: la página pública es de la 011 (oculta "Anotarme" en bautismo); falta el e2e que verifique que no muestra inscriptos ni cantidad.]** [US3] E2E en `apps/web/e2e/evento-bautismo-publico.spec.ts` (FR-018, escenario 3.7, depende de la página pública de la 011): la página pública de un Evento de bautismo con asignados no muestra nombres, cantidad, "Anotarme" ni QR; axe.
- [x] T040 **[Sesión 010: Hecho.]** [US3] Checklist de `docs/15` de la sección Bautismo del Evento en `specs/010-bautismo/checklists/pantallas.md` (acción principal "Sumar al bautismo", acciones en lote, resultado parcial explicado, qué pasa después: "cada persona ve la fecha en Mi camino").

---

## Phase 6: User Story 4 — Ver en qué está mi bautismo (P2) · lote A

**Goal**: la card muestra los 8 estados con qué pasa después, y la Persona puede retirar o decir "No puedo ese día".
**Independent Test**: una Solicitud en cada estado (por helpers) → la card muestra su texto e ícono.

- [x] T041 **[Sesión 010: Hecho.]** [US4] En `bautismo.service.ts` / `bautismo.controller.ts`: `POST /bautismo/solicitudes/me/retirar` (exige `pendiente`, o `aprobada` sin Evento o con Evento futuro — con Evento pasado, 409 `SOLICITUD_BAUTISMO_YA_CAMBIO`; si tenía inscripción la cancela y FK → `null`; → `retirada`, `retiradaEn` — FR-020) y `POST /bautismo/solicitudes/me/no-puedo` (exige `aprobada` con Evento futuro; cancela la inscripción, FK → `null` — FR-020a); ninguno emite aviso (FR-025).
- [x] T042 **[Sesión 010: Hecho en `bautismo-persona.integration-spec.ts`.]** [US4] Integración en `apps/api/test/integration/bautismo-persona-acciones.integration-spec.ts` (FR-020, FR-020a, FR-025): retirar pendiente → `retirada` y la card `puede_pedir { ultimo: 'retirada' }`; retirar con fecha → inscripción `cancelada` y FK `null`; retirar una `realizada` → 409; retirar con Evento pasado sin confirmar → 409; "no puedo" con Evento futuro → `esperando_fecha`; "no puedo" sin Evento o con Evento pasado → 409; ninguna emite evento; después de retirar, puede pedir de nuevo (si cumple FR-002).
- [x] T043 **[Sesión 010: Hecho.]** [US4] En `tarjeta-bautismo.tsx`: estados `esperando_fecha` ("Aceptamos tu pedido, te avisamos la próxima fecha", D147), `con_fecha` (fecha y hora en Argentina con `formatearDiaEnArgentina` y su par de hora, lugar en texto, enlace a la página del Evento, acción secundaria "No puedo ese día"), `fecha_pasada_sin_confirmar` ("Estamos confirmando tu bautismo"), `puede_pedir` con `ultimo: 'rechazada'` ("Por ahora no pudimos aceptar tu pedido; alguien del equipo va a hablar con vos", sin motivo) o `'retirada'`; "Retirar el pedido" en `en_revision`, `esperando_fecha` y `con_fecha`, con diálogo **neutro** (T017, D151) que dice qué pasa ("vas a salir de la fecha asignada" si aplica). FR-019, FR-020, FR-020a.
- [x] T044 **[Sesión 010: Hecho en `mi-camino-bautismo.spec.ts` (los estados que la API deja armar + el pasado sembrado).]** [US4] E2E en `apps/web/e2e/mi-camino-bautismo-estados.spec.ts`, `@celular` (US4 escenarios 1–8, SC-004): por helpers, una Persona en cada uno de los 8 estados → la card muestra su texto y su ícono (con nombre accesible), y nunca el motivo de rechazo; "No puedo ese día" → diálogo sin rojo → `esperando_fecha`; retirar con fecha → `puede_pedir`; una Solicitud creada en nombre de `e2e-bautismo-sin-app` que luego entra se ve igual; axe en claro y oscuro (incluye el botón del diálogo neutro, T017).
- [x] T045 **[Sesión 010: Hecho.]** [US4] Checklist de `docs/15` para la card de Bautismo (estados de US4, diálogos neutros) en `specs/010-bautismo/checklists/pantallas.md`.

---

## Phase 7: User Story 5 — Habilitar el bautismo y pedirlo en nombre de alguien (P2) · lote C

**Goal**: el Admin cubre las excepciones de D147 y D97.
**Independent Test**: habilitar a `e2e-bautismo-sin-vn` → su card ofrece pedir; crear en nombre de `e2e-bautismo-sin-app` → aparece en la bandeja con "creada por".

- [x] T046 **[Sesión 010: Hecho en `bautismo/` (`en-nombre.controller.ts`), no en `persona/` (IMPLEMENTACION §3).]** [US5] En `apps/api/src/persona/`: `PUT` y `DELETE /personas/:id/habilitacion-bautismo` (`bautismo.habilitar`; PUT idempotente setea `bautismoHabilitadoEn = now()` y `…PorId` = sesión; DELETE los pone en `null`; Persona inexistente o no `activa` → `NO_ENCONTRADO`; no toca Solicitudes) — FR-021. Exponer la habilitación en la fila/panel de Personas que ya usa el backoffice.
- [x] T047 **[Sesión 010: Hecho.]** [US5] En `bautismo.controller.ts`: `POST /bautismo/solicitudes` (`bautismo.crear_en_nombre`; `{ personaId, comentario? }`; sin FR-002 ni edad; sí `SOLICITUD_BAUTISMO_YA_ABIERTA` y `PERSONA_YA_BAUTIZADA`; `creadoPorId` = sesión; sin aviso) — FR-022.
- [x] T048 **[Sesión 010: Hecho en `bautismo-excepciones.integration-spec.ts`.]** [US5] Integración en `apps/api/test/integration/bautismo-excepciones.integration-spec.ts` (FR-021, FR-022): habilitar → `GET /bautismo/me` de esa Persona = `puede_pedir`; deshabilitar con Solicitud abierta → la Solicitud sigue; deshabilitar sin Vida Nueva → vuelve a `no_habilitada`; Discipulador y Pastor → 403 en los dos endpoints; crear en nombre de un menor de 11 → 201 con `creadoPorId`; de alguien con una abierta → 409; de alguien bautizado → 409.
- [x] T049 **[Sesión 010: Hecho en la sección del Perfil (`seccion-bautismo.tsx`), no en `personas-cliente.tsx` (IMPLEMENTACION §2.6).]** [US5] En `apps/backoffice/src/app/personas/personas-cliente.tsx`: en el panel de la Persona, bloque "Bautismo" con su situación (Vida Nueva en curso / completada / habilitada por X el …) y la acción "Habilitar el bautismo" / "Quitar la habilitación" (con `Button` + `useEnvio`, feedback en texto). Claves en `personas.bautismo`.
- [x] T050 **[Sesión 010: Hecho desde el Perfil; el "Nueva solicitud en nombre de…" de la bandeja (013) no se tocó.]** [US5] En `apps/backoffice/src/components/pedir-en-nombre-de.tsx` y la bandeja: "Nueva solicitud en nombre de…" pide primero el tipo (Vida Nueva / Bautismo); para Bautismo, solo el comentario opcional; visible solo con `bautismo.crear_en_nombre` para ese tipo (D132). Sin cambios para Vida Nueva.
- [x] T051 **[Sesión 010: Hecho en `bautismo.spec.ts`.]** [US5] E2E en `apps/backoffice/e2e/bautismo-excepciones.spec.ts` (US5 escenarios 1–5): habilitar a `e2e-bautismo-sin-vn` y ver la marca "habilitada por…"; crear en nombre de `e2e-bautismo-sin-app` y verla en la bandeja con "creada por"; intentar otra → mensaje claro; axe claro y oscuro.
- [x] T052 **[Sesión 010: Hecho.]** [US5] Checklist de `docs/15` del panel de Persona (bloque Bautismo) y de "Nueva solicitud en nombre de…" en `specs/010-bautismo/checklists/pantallas.md`.

---

## Phase 8: User Story 6 — Avisar a la Persona de cada novedad (P2) · lote B

**Goal**: cada transición del Admin o del sistema deja exactamente un evento correcto y sin datos sensibles.
**Independent Test**: test unitario por transición, sin la 012.

- [x] T053 **[Sesión 010: Cubierto por integración: cada transición afirma sus avisos en la base (y que pedir, retirar, "no puedo", en nombre y habilitar no emiten).]** [US6] Unit test en `apps/api/test/unit/bautismo-transiciones-eventos.spec.ts` (FR-023 a FR-026, SC-006), con el patrón de `discipulado-tx-falso.ts`: aceptar → `solicitud_bautismo_aceptada`; rechazar → `…_rechazada`; asignar → `bautismo_fecha_asignada` (uno por asignada); reasignar → `bautismo_fecha_asignada` con el nuevo `eventoId`; quitar → `bautismo_fecha_quitada`; hook de cancelación → `bautismo_evento_cancelado` por Persona; confirmar → `bautismo_realizado` solo para las tildadas; pedir, retirar, "no puedo", crear en nombre y habilitar → **ninguno**; ningún evento lleva campos fuera de ids; si la transacción falla, no se emite nada.
- [x] T054 **[Sesión 010: Reemplazada por `CATALOGO_AVISOS` (D197).]** [US6] Documentar en `apps/api/src/bautismo/eventos.ts` (comentario breve) la tabla de mapeo a `solicitud_actualizada` de `contracts/eventos-bautismo.md` y que el texto fuera de la app es genérico (N2), para quien conecte la 012.

---

## Phase 9: User Story 7 — Confirmar quiénes se bautizaron (P3) · lote B

**Goal**: pasado el Evento, el Admin deja registrados los bautismos reales.
**Independent Test**: Evento pasado con tres asignadas → destildar una → confirmar → dos `bautizada`, una `esperando_fecha`.

- [x] T055 **[Sesión 010: Hecho.]** [US7] `POST /bautismo/eventos/:eventoId/confirmar` (`solicitudes.aprobar`; `{ realizadas: string[] }`; research #9): Evento de bautismo y `fecha <= now()` o `EVENTO_TODAVIA_NO_OCURRIO`; tildadas → `realizada` con `realizadaEn = Evento.fecha`; destildadas → `aprobada` con FK `null` y la inscripción **sin tocar**; id no asignado a ese Evento → `VALIDACION` (`SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO`); idempotente; eventos `bautismo_realizado`. FR-027, FR-028.
- [x] T056 **[Sesión 010: Hecho en `bautismo-admin.integration-spec.ts`.]** [US7] Integración en `apps/api/test/integration/bautismo-confirmar.integration-spec.ts` (FR-027, FR-028, FR-005, FR-030): Evento futuro → 409; pasado con tres, confirmar dos → dos `realizada` con la fecha del Evento y `GET /bautismo/me` = `bautizada`, una `esperando_fecha`; repetir la misma llamada → mismo resultado sin duplicar eventos; una bautizada intenta pedir → `PERSONA_YA_BAUTIZADA`.
- [x] T057 **[Sesión 010: Hecho por `RegistroPendientesAdmin` (dos filas); probado en integración.]** [US7] Pendientes: extender `apps/api/src/discipulado/pendientes-admin.service.ts` con `bautismo: { pendientes, esperandoFecha, eventosSinConfirmar: [{ id, nombre, fecha }] }` (FR-029) y la tarjeta de Pendientes de `apps/backoffice/src/app/page.tsx` con esas tres líneas enlazadas (bandeja filtrada y el Evento). Unit en `apps/api/test/unit/pendientes-admin.spec.ts` (ampliar): Evento pasado con asignadas sin confirmar aparece; confirmado, no; futuro, no.
- [x] T058 **[Sesión 010: Hecho.]** [US7] En `seccion-bautismo-evento.tsx`: cuando `puedeConfirmar`, bloque "Confirmar bautismos" con todos tildados por defecto, texto que dice qué pasa con los destildados ("vuelven a esperar fecha"), acción principal "Confirmar bautismos (N)"; ya confirmado → lista de bautizados sin acciones. FR-027.
- [x] T059 **[Sesión 010: Hecho en `bautismo.spec.ts` (con el Evento pasado sembrado).]** [US7] E2E en `apps/backoffice/e2e/bautismo-confirmar.spec.ts` (US7 escenarios 1–4): en el Evento pasado de fixtures, destildar una → confirmar → la sección muestra dos bautizadas; la tarjeta de Pendientes de Inicio deja de mostrar el Evento; en el Evento futuro no aparece el bloque; axe claro y oscuro.
- [x] T060 **[Sesión 010: Hecho.]** [US7] Checklist de `docs/15` del bloque "Confirmar bautismos" y de la tarjeta de Pendientes en `specs/010-bautismo/checklists/pantallas.md`.

---

## Phase 10: Polish & Cross-Cutting (cierre, secuencial)

- [x] T061 **[Sesión 010: Hecho; la 006 no lo llamaba y se conectó en `historial-admin.service.ts`.]** Hook `BautismoService.retirarPorDeclaracion(tx, personaId)` para la spec de D144 (H3, caso borde de la spec): con Solicitud `pendiente` o `aprobada` → `retirada` (cancela la inscripción si tenía), sin aviso; sin Solicitud abierta → no hace nada. Integración en `apps/api/test/integration/bautismo-declaracion.integration-spec.ts`.
- [x] T062 **[Sesión 010: Hecho en `seed-demo/010-bautismo.ts`.]** Ampliar `apps/api/prisma/seed-demo.ts` (D120): una Persona en cada estado de la card (pendiente, esperando fecha, con fecha, pasada sin confirmar, bautizada, rechazada), una habilitada sin Vida Nueva, una creada en nombre de una Persona sin acceso, un Evento de bautismo próximo con tres asignadas y uno pasado confirmado; nombres largos con tildes y apellidos compuestos; prefijo `demo-`. Verificar a ojo que la card y la sección no desbordan con esos datos (360 px).
- [ ] T063 **[Sesión 010: Pendiente: el flujo completo queda cubierto por partes (integración y los e2e de cada pantalla).]** E2E del flujo completo en `apps/backoffice/e2e/bautismo-flujo-completo.spec.ts` (SC-001 a SC-005, SC-007): la Persona pide desde la web → el Admin acepta → asigna desde el Evento → (fixture mueve el Evento al pasado) → confirma → la card de la Persona dice "bautizada"; axe en claro y oscuro en cada pantalla.
- [x] T064 **[Sesión 010: Hecho: `/solicitudes/bautismo/[id]` en `nav.ts` (el smoke de axe lo recorre); `/mi-camino` ya estaba.]** [P] Sumar las rutas nuevas (`/solicitudes/bautismo/[id]` con un id de fixture, y la sección del Evento) a `apps/backoffice/e2e/axe-todas-las-rutas.spec.ts`, y verificar que `/mi-camino` con la card ya está en `apps/web/e2e/axe-todas-las-rutas.spec.ts` (SC-007).
- [x] T065 **[Sesión 010: Hecho: Observaciones en `checklists/pantallas.md`.]** Releer `specs/010-bautismo/checklists/pantallas.md` completo; lo que no cumple va a "Observaciones", no se arregla en silencio.
- [ ] T066 **[Sesión 010: API en verde en local; e2e en el CI del PR.]** Las tres suites en verde: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` y `apps/backoffice` (CLAUDE.md).
- [ ] T067 Al mergear (no en esta rama): numerar D179–D187 (la DN-8 de esta spec quedó unificada en D178, con la precisión D186) en `docs/05-decisiones.md` mirando el último número, y aplicar "Cambios a docs al mergear" de `plan.md` (`docs/04`, ER, `docs/07` Flujo 6, `docs/03`, `docs/14`, `docs/15`) con las respuestas de Echu a las Preguntas.

---

### Ajuste D220 — talle de remera (2026-10-09)

- [x] T068 Talle de remera en el pedido (D220): `SolicitudBautismo.talleRemera` (enum `TalleRemera`, nullable, migración `talle_remera_bautismo`); obligatorio al pedir (Persona y en nombre de) con `TALLE_REQUERIDO`/`TALLE_INVALIDO` por campo; `PUT /bautismo/solicitudes/:id/talle`; resumen de talles en `GET /bautismo/eventos/:eventoId`. Tests: `test/unit/talle-remera.spec.ts` y los tres `bautismo-*.integration-spec.ts`.
- [x] T069 Pantallas tocadas por D220 — checklist de `docs/15-guia-ux-ui.md` (cuatro estados, H-50, H-57, D81, D150, tokens, next-intl, axe claro/oscuro en los e2e): el diálogo "Quiero bautizarme" de Mi camino (`CampoTalleRemera`, 44 px), el diálogo "Pedir el bautismo en su nombre" del Perfil, el talle en el detalle del pedido y el resumen de talles en la sección Bautismo del Evento. E2E: `apps/web/e2e/mi-camino-bautismo.spec.ts` y `apps/backoffice/e2e/bautismo.spec.ts`.

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T017, lote 0)** → abren los lotes A, B y C en paralelo.
- **US1** (lote A) no depende de la 011. **US4** (lote A) usa estados con fecha: sus e2e necesitan los helpers de asignación (T014) y la 011.
- **US2, US3, US6, US7** (lote B) necesitan la 011 mergeada (E1–E9). Dentro del lote: T024–T027 → T032–T035 → T053 → T055–T057; pantallas después de su endpoint.
- **US5** (lote C) solo depende del lote 0 (T050 toca `pedir-en-nombre-de.tsx`, que el lote B no toca).
- **Cierre (T061–T067)** cuando A, B y C están en `main` de la rama.

## Parallel Example

```text
Lote 0, en paralelo dentro de la sesión: T002, T004, T012, T015, T016, T017 (archivos distintos).
Después, tres sesiones a la vez:
  Lote A: T018 → T019, T020 → T021 → T022 → T023; T041 → T042, T043 → T044 → T045
  Lote B: T024 → T025; T026 → T027 → T028/T029 → T030 → T031; T032…T040; T053/T054; T055…T060
  Lote C: T046/T047 → T048 → T049/T050 → T051 → T052
```

## Lotes (sesiones en paralelo que no se pisan)

| Lote | Tareas | Archivos | Depende de |
|---|---|---|---|
| **0 — base** | T001–T017 | `packages/shared-types/src/{bautismo,eventos-bautismo,discipulado,error-code,permisos}.ts`, `schema.prisma` + migración, `estado-bautismo.ts`, `eventos.ts`, `bautismo.module.ts`, scripts e2e y helpers, `apps/web/playwright.config.ts`, los dos `es.json`, `packages/ui` (diálogo neutro) | 011 para la FK (opcional, T033) |
| **A — Persona (web)** | T018–T023, T041–T045 | `bautismo.controller.ts` (rutas `/me`), `bautismo.service.ts` (métodos de la Persona), `apps/web/src/app/(app)/mi-camino/{page,tarjeta-bautismo}.tsx`, `apps/web/e2e/mi-camino-bautismo*.spec.ts` | lote 0 |
| **B — Admin** | T024–T040, T053–T060 | `bandeja.service.ts`, `bautismo-eventos.controller.ts`, métodos de Admin de `bautismo.service.ts`, `pendientes-admin.service.ts`, `apps/backoffice/src/app/solicitudes/**`, `seccion-bautismo-evento.tsx`, `apps/backoffice/src/app/page.tsx`, sus e2e | lote 0 + **spec 011** |
| **C — excepciones** | T046–T052 | `apps/api/src/persona/*`, `POST /bautismo/solicitudes` en el controller, `personas-cliente.tsx`, `pedir-en-nombre-de.tsx` | lote 0 |
| **Cierre** | T061–T067 | `seed-demo.ts`, e2e de flujo completo, axe de rutas | A, B, C |

`bautismo.service.ts` lo tocan A, B y C: para no pisarse, cada lote agrega sus métodos en un
archivo propio que el servicio compone (`acciones-persona.ts`, `acciones-admin.ts`,
`acciones-excepciones.ts` dentro de `apps/api/src/bautismo/`), y `bautismo.controller.ts` se parte
igual (`me.controller.ts` para A, `bautismo.controller.ts` para B, `en-nombre.controller.ts` para
C) — registrados todos en `bautismo.module.ts` desde el lote 0 (T013).

## Cobertura (cada criterio con su test)

| Criterio | Test |
|---|---|
| FR-001 | T019, T022 |
| FR-002 | T003, T011, T019, T022 |
| FR-003 | T003, T019, T022 |
| FR-004 | T003, T010, T019, T022 |
| FR-005 | T003, T019, T056 |
| FR-006 | T025, T030 |
| FR-007 | T027, T030 |
| FR-008 | T027, T030 |
| FR-009 | T027, T030 |
| FR-010 | T027 |
| FR-011 | T027, T030 |
| FR-012 | T034, T038 |
| FR-013 | T034 |
| FR-014 | T034, T038 |
| FR-015 | T034, T038 |
| FR-016 | T035 |
| FR-017 | T034 |
| FR-018 | T039 |
| FR-019 | T003, T044 |
| FR-020 / FR-020a | T042, T044 |
| FR-020b | T020 (prop renderizada) + T065 (checklist); se prueba de punta a punta en la spec de D144 |
| FR-021 | T048, T051 |
| FR-022 | T048, T051 |
| FR-023 / FR-024 / FR-025 / FR-026 | T012, T053 |
| FR-027 / FR-028 | T056, T059 |
| FR-029 | T057, T059 |
| FR-030 | T011, T056 |
| FR-031 | checklists T023, T031, T040, T045, T052, T060 + axe en cada e2e |
| FR-032 | T022, T044 (`@celular`) |
| FR-033 | T025, T034 |
| FR-034 | T010 |
| SC-001 | T022, T063 |
| SC-002 | T025, T030 |
| SC-003 | T038 |
| SC-004 | T003, T044 |
| SC-005 | T010, T035, T057 |
| SC-006 | T053 |
| SC-007 | T022, T030, T038, T044, T064 |

## Implementation Strategy

1. **MVP**: lote 0 + US1 (pedir y ver "en revisión") + US2 (aceptar/rechazar) → ya reemplaza el
   WhatsApp para pedir y responder, aunque la fecha se avise por fuera.
2. **D147 completo**: + US3 (fechas como Evento de bautismo) + US4 (card con todos los estados).
3. **Excepciones y avisos**: + US5 + US6 (los avisos salen cuando se conecte la 012).
4. **Cierre del registro**: + US7 (confirmar bautismos) + cierre.
