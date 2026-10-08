# Tasks: Vida de Servicio

**Input**: Design documents from `/specs/008-vida-de-servicio/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la Constitución los exige (Principio VI y VII): unit para toda regla con ramas,
integración para lo que cambia estado en cascada contra la base, e2e con `axe` en claro y oscuro
para los flujos críticos. **Cada criterio de aceptación y cada SC tiene su test** (tabla de
cobertura al final).

**Organización**: por historia de usuario, en orden de prioridad (US1–US5 son P1; US6–US8 P2; US9
P3). Cada tarea cita el FR/escenario que cubre. Cada pantalla nueva o modificada lleva su tarea de
checklist de `docs/15-guia-ux-ui.md` (D114). **Lotes** al final.

**Convenciones que valen para todas las tareas** (para no repetirlas):
- Permisos solo con `@RequierePermiso`/`requerirPermiso` contra `CATALOGO_PERMISOS` (D132), y además
  la verificación por registro del servicio (Liderazgo vigente, dueña de la Inscripción).
- Errores con Problem Details y `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito; listados que crecen con `Pagina<T>` (H-42).
- Textos por `next-intl`, rioplatense con voseo (D84); colores solo de tokens (D118); estados con
  texto + ícono (D81).
- Botones de acción con `Button` y `useEnvio` de `packages/ui` (H-57); validación con
  `useValidacionCampos` + `ResumenErrores` (H-50). "Cargando" = `loading.tsx`, "error" = `error.tsx`.
- **Celular (D150)**: en `apps/web`, letra de 16 px en etiquetas, botones y ayudas (14 px solo
  metadatos), `Button` de 44 px de alto; las pantallas del Líder se diseñan a 360 px primero y sus e2e
  llevan `@celular`. Sin scroll horizontal a 320 px.
- Confirmaciones reversibles neutras; rojo + ícono solo para lo irreversible (D151).
- Cada transición llama a `emitirEventoVidaDeServicio()` **después** del commit, con el evento de
  `contracts/eventos.md`.
- Commits en español, uno por cambio coherente. Un test que rompe por un cambio de modelo se arregla
  en el mismo commit.

---

## Phase 1: Setup

- [ ] T001 Verificar que la rama `008-vida-de-servicio` está al día con `main`, que `.specify/feature.json` apunta a `specs/008-vida-de-servicio`, y anotar en el PR si la 006 ya mergeó (cambia T012, T014, T026, T027 y T065, ver plan → Dependencias). No agregar decisiones a `docs/05-decisiones.md` (van al mergear).

---

## Phase 2: Foundational — **lote 0** (secuencial, bloquea todo)

- [ ] T002 **[Lote 0 global: el enum `TipoBaja` y todas las constantes ya están; los tipos de los contratos y las reglas puras → la sesión de la 008, en el mismo archivo]** [P] Crear `packages/shared-types/src/vida-de-servicio.ts` con todos los tipos de `contracts/persona-api.md`, `contracts/lider-api.md` y `contracts/admin-api.md` (`EstadoMiVidaDeServicio`, `EdicionAbierta`, `SemanaParaPersona`, `MiAsistencia`, `ContenidoParaPersona`, `MiGrupoResumen`, `MiGrupoDetalle`, `SemanaParaLider`, `InscriptoParaLider`, `ContenidoParaLider`, `AsistenciaDelDia`, `EdicionAdminResumen`, `EdicionAdminDetalle`, `SolicitudVidaServicioDetalle`, `TipoBaja`), las constantes (`FALTAS_PARA_ALERTA = 2`, `SEMANAS_MIN = 1`, `SEMANAS_MAX = 52`, `NOMBRE_EDICION_MAX = 80`, `TITULO_CONTENIDO_MAX = 120`, `TEXTO_CONTENIDO_MAX = 10_000`, `ARCHIVO_MAX_BYTES = 15 * 1024 * 1024`, `ARCHIVOS_POR_SEMANA_MAX = 5`, `ENLACES_POR_SEMANA_MAX = 10`, `MIME_CONTENIDO_ADMITIDOS`, `EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO = 12`) y las reglas puras: `cumplePrerrequisito` (FR-008), `cronogramaPropuesto(fechaInicio, semanas)` y `cronogramaValido(items)` (FR-002, FR-004), `liberada(item, contenido, hoy)` (FR-021), `semanasVisibles(inscripcion, items, hoy)` (FR-034), `materialCargado(contenido)` (FR-020), `alertaFaltas(faltas)` (FR-029), `sePuedeProponerFinalizacion(items, hoy)` (FR-035). Exportar desde `index.ts`.
- [ ] T003 **[Lote 0 global: → sesión de la 008, junto con las reglas]** [P] Unit tests de las reglas de T002 en `apps/api/test/unit/vida-de-servicio-reglas.spec.ts`: prerrequisito por Inscripción individual, por grupal, por Completitud Manual, sin ninguna, con `prerequisito = null`; cronograma propuesto de 8 semanas (cada 7 días), fechas repetidas/desordenadas/primera antes del inicio; liberada con fecha hoy/ayer/mañana × con/sin material; visibles para `activa`, `completada`, `dada_de_baja` (corta en `cerradaEn`), `abandono`; material vacío (título solo) vs. con texto/archivo/enlace; alerta con 1, 2, 3 faltas; proponer finalización antes/el día/después de la última fecha.
- [x] T004 **[Lote 0 global: reemplazado por `CATALOGO_AVISOS` (D197): eventos `vida_servicio.*` con su destinatario (`persona`, `grupo`, `lideres_grupo`, `admin`)]** [P] Crear `packages/shared-types/src/eventos-vida-de-servicio.ts` con `DestinatarioVS` y `EventoVidaDeServicio` exactamente como `contracts/eventos.md` (FR-041). Exportar.
- [x] T005 **[Lote 0 global: hecho, con traducciones]** Extender `packages/shared-types/src/error-code.ts` con `VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO`, `SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE`, `VIDA_SERVICIO_EN_CURSO_O_COMPLETADA`, `CONTENIDO_NO_DISPONIBLE`, `GRUPO_NO_ENCONTRADO` (si no existe), `GRUPO_NO_EN_CURSO`, `SEMANA_NO_ENCONTRADA`, `SEMANA_LIBERADA_NO_EDITABLE`, `SEMANA_CON_MATERIAL`, `ULTIMO_LIDER`, `YA_ES_LIDER`, `INSCRIPCION_NO_ACTIVA`, `FINALIZACION_ANTES_DE_TIEMPO`, `BAJAS_PROPUESTAS_SIN_RESOLVER`, `LIDER_TIENE_GRUPOS_ACTIVOS`; y los códigos de campo bajo `VALIDACION` de los tres contratos (`EDICION_NO_DISPONIBLE`, `EDICION_YA_CURSADA`, `EDICION_REQUERIDA`, `NOMBRE_REQUERIDO`, `SEMANAS_FUERA_DE_RANGO`, `FECHAS_NO_CRECIENTES`, `PRIMERA_SEMANA_ANTES_DEL_INICIO`, `LIDERES_REQUERIDOS`, `PERSONA_SIN_ROL_LIDER`, `TITULO_REQUERIDO`, `TITULO_DEMASIADO_LARGO`, `TEXTO_DEMASIADO_LARGO`, `MATERIAL_VACIO`, `ARCHIVO_TIPO_NO_ADMITIDO`, `ARCHIVO_DEMASIADO_GRANDE`, `DEMASIADOS_ARCHIVOS`, `TEXTO_ALTERNATIVO_REQUERIDO`, `ENLACE_URL_INVALIDA`, `ENLACE_TEXTO_REQUERIDO`, `DEMASIADOS_ENLACES`, `FECHA_ANTERIOR_AL_INICIO`, `INSCRIPCION_AJENA`), cada uno con el FR en un comentario. Traducciones en los dos `es.json` (namespace `errors`), diciendo **cómo corregir** (H-50).
- [x] T006 **[Lote 0 global: hecho, con tests]** Extender `packages/shared-types/src/permisos.ts` (research #15): `'vida_servicio.inscribir_en_nombre': ['admin']`, `'mis_grupos.gestionar': ['lider_curso']`; `RolDeEstado` suma `'apto_ministerio'`; `PersonaParaQuitarRol.gruposServicioActivos` (obligatorio) y la rama `lider_curso` de `puedeQuitarRol` con `LIDER_TIENE_GRUPOS_ACTIVOS` (FR-040). Actualizar en el mismo commit los tests del 005/004 que construyen `PersonaParaQuitarRol` (`puede-quitar-rol.spec.ts` y los que use `roles.service`) y sumar casos: `lider_curso` con y sin grupos activos.
- [x] T007 **[Lote 0 global: en la migración única `20261008120000_lote_0_global`]** Extender `apps/api/prisma/schema.prisma` según `data-model.md`: enums (`CategoriaCurso.vida_de_servicio`, `ModalidadCurso.liberacion_programada`, `TipoBaja`), `Curso.prerequisitoCategoria`, `Grupo.nombre/fechaInicio/inscripcionAbierta` y relaciones, modelos `ItemCronograma`, `Contenido`, `ArchivoContenido`, `EnlaceContenido`, `SolicitudVidaServicio`, `Inscripcion.solicitudId` opcional + `solicitudVidaServicioId` + `bajaPropuestaTipo`, `Encuentro.capitulos` opcional; índices de `data-model.md`; `@@map` plural snake_case.
- [x] T008 **[Lote 0 global: en la migración única; las tres suites de la API en verde]** Crear la migración `vida_de_servicio` con `--create-only` y sumarle en SQL: únicos parciales de `ItemCronograma` (`WHERE "eliminadoEn" IS NULL`), `solicitudes_vida_servicio_una_pendiente` (`WHERE estado = 'pendiente'`), `encuentros_uno_por_fecha_servicio` (`("grupoId", fecha) WHERE capitulos IS NULL`), CHECK `num_nonnulls("solicitudId","solicitudVidaServicioId") = 1` en `inscripciones`, CHECK `estado <> 'propuesta'` en `solicitudes_vida_servicio`, CHECK `"numeroSemana" BETWEEN 1 AND 52`, CHECK `"tamanioBytes" <= 15728640`. Aplicarla y correr las tres suites de la API para confirmar que la 004 sigue en verde (las Inscripciones existentes tienen `solicitudId`, el CHECK pasa).
- [x] T009 **[Lote 0 global: filtro por categoría hecho (también en `cursaOCompletoVidaNueva`); el caso de integración "Liderazgo de VS no cuenta" → sesión de la 008]** Ajustar la 004 sin cambiar su conducta: `apps/api/src/discipulado/discipulados-activos.ts` filtra `grupo.curso.categoria = 'vida_nueva'` (FR-040); `encuentros.service.ts` sigue exigiendo `capitulos` (validación propia, ahora que la columna es opcional); `baja.service.ts` confirma a `abandono` ignorando `bajaPropuestaTipo`. Test de integración en `apps/api/test/integration/discipulados-activos.integration-spec.ts` (extender): un Liderazgo vigente en una edición de Vida de Servicio **no** cuenta como discipulado activo.
- [ ] T010 **[Lote 0 global: Curso Vida de Servicio en el seed mínimo y tablas nuevas en `limpiar-e2e.ts` hechos; Personas de e2e y helpers por API → sesión de la 008]** Extender `apps/api/prisma/seed.ts` (upsert del Curso Vida de Servicio, FR-001), `apps/api/scripts/sembrar-e2e-admin.ts` (dos Personas `e2e-lider-1/2@…` con `lider_curso`; `e2e-vs-apta@…` con una Inscripción `completada` de Vida Nueva sembrada por Prisma; `e2e-vs-sin-vn@…` sin Vida Nueva) y `apps/api/scripts/limpiar-e2e.ts` (orden de `data-model.md` → Seeds). Helpers de e2e por API en `apps/web/e2e/helpers.ts` y `apps/backoffice/e2e/helpers.ts`: `crearEdicionPorApi({ semanas, lideres, fechaInicio })`, `inscribirPorApi(email, grupoId)` (crea Solicitud y la aprueba), `cargarMaterialPorApi(grupoId, numero)`, `loguearseComoLiderE2E(page, 1 | 2)`.
- [x] T011 **[Lote 0 global: con áreas en vez de `visibilidad` (D168): `subirPrivado('contenidos', …)`, `leer(area, ruta)`; privadas bajo `.privado/` con `dotfiles: deny`. Test en `lote-0-global.integration-spec.ts`]** `StorageService` privado (research #5) en `apps/api/src/storage/storage.service.ts` y `local-storage.provider.ts`: `subir({ …, visibilidad })`, `leer(ruta): Promise<Readable>`, carpeta `STORAGE_PRIVADO_DIR` fuera de lo que sirve `main.ts`; el uso de portadas queda con `visibilidad: 'publica'` sin otro cambio. Agregar la variable a `.env.example` y a `docs`-de-setup solo si existe la lista de variables en `specs/revision-manual/COMO-ARRANCAR.md` (si no, anotarlo en el PR). Test de integración `apps/api/test/integration/storage-privado.integration-spec.ts`: un archivo privado no aparece bajo la ruta estática pública; `leer` devuelve el mismo contenido.
- [ ] T012 **[Lote 0 global: `VidaDeServicioModule` vacío ya registrado; `prerrequisito.ts` (sobre `completoEtapa` de la 006) y `efectos.ts` → sesión de la 008; los avisos van por `NotificacionesService.emitir`]** Crear `apps/api/src/vida-de-servicio/` con `vida-de-servicio.module.ts` (registrado en `app.module.ts`), `prerrequisito.ts` (`estadoPrerrequisito(tx, personaId, categoria)` con `completitudesDe()`/`declaracionEnRevision()` como punto único hacia la 006 — research #8), `efectos.ts` (`alCompletarCategoria(tx, personaId, categoria)` → `RolesDeEstadoService.otorgarRolDeEstado(…,'apto_ministerio', tx)` si es `vida_de_servicio`, research #9) y `eventos.ts` (`emitirEventoVidaDeServicio`). Test de integración `apps/api/test/integration/prerrequisito-vs.integration-spec.ts` (FR-008: los dos caminos y los tres motivos de "no cumple") y unit `apps/api/test/unit/eventos-vida-de-servicio.spec.ts` (solo ids en `datos`).
- [x] T013 **[Lote 0 global: reemplazado por D178: `BandejaModule` con `RegistroFuentesSolicitudes` y `RegistroPendientesAdmin` (cada spec registra su fuente desde su módulo); mover `GET /solicitudes` es de la 013, lote 1]** Mover la bandeja y los pendientes a módulos propios sin cambiar su conducta (research #7): `GET /solicitudes` a `apps/api/src/solicitudes/` y `pendientes-admin` a `apps/api/src/pendientes/` (`GET /pendientes-admin`, con `GET /discipulado/pendientes-admin` como alias). Los tests existentes de la 004 pasan sin tocarlos (salvo la ruta del import).
- [ ] T014 **[Lote 0 global: borrar `/mis-grupos` del backoffice lo hace la 006 (lote C, D142) junto con las otras dos; la 008 suma sus rutas en su bloque de `nav.ts` y el acceso en la web]** Navegación: borrar `apps/backoffice/src/app/mis-grupos/` y su ítem de `apps/backoffice/src/config/nav.ts` (D142; ajustar `apps/backoffice/e2e/sesion-requerida.spec.ts`); sumar en `nav.ts` las rutas `enMenu: false` `/grupos/vida-de-servicio/[id]` (`grupos.ver`) y `/solicitudes/vida-de-servicio/[id]` (`solicitudes.ver`); en `apps/web`, el acceso a `/mis-grupos` para quien tenga `mis_grupos.ver`, con el patrón de la 006 si ya mergeó, o como acceso en Inicio (research #14). Correr el lint `pantalla-declara-permiso`.
- [ ] T015 **[Lote 0 global: → sesión de la 008 (solo la usa ella)]** [P] Crear `packages/ui/src/components/estado-semana.tsx`: badge texto + ícono para `liberada` / `proxima` / `sin_material` / `cargado_por_liberar` / `vencida_sin_material`, textos por prop (H-151), tokens de color (D118). Lo usan T027, T046, T061 y T074 (Principio XI).
- [x] T016 **[Lote 0 global: namespaces y proyecto `celular` hechos; los pendientes van en `inicio.pendientes.extra.<clave>`]** Namespaces vacíos en `apps/web/src/messages/es.json` (`vidaDeServicio`, `misGrupos`) y `apps/backoffice/src/messages/es.json` (`edicionesServicio`, `solicitudesServicio`, `inicio.pendientes.vidaDeServicio`), cada uno en su bloque. Glosario de interfaz en el bloque: "edición" para el Grupo de Vida de Servicio, "material" para Contenido, "Quiero anotarme", "Tomar asistencia" (`docs/15`, Tono). Proyecto `celular` (`devices['Pixel 7']`, `grep: /@celular/`) en `apps/web/playwright.config.ts`. Reconstruir `packages/shared-types` (H-33) y correr lint + typecheck de las cinco piezas.

**Checkpoint**: compila, migra, siembra; reglas, eventos y prerrequisito con test; la 004 y la 005 siguen en verde.

---

## Phase 3: User Story 1 — Abrir una edición (P1) · lote B

- [ ] T017 [US1] `apps/api/src/vida-de-servicio/ediciones.service.ts` + `grupos-vs.controller.ts`: `POST /grupos/vida-de-servicio` (FR-002, FR-003: valida con `cronogramaValido`, Líderes con `lider_curso` y activos, Sede activa; crea Grupo + items + Liderazgos en una transacción; `inscripcionAbierta = true`, FR-006; emite `lider_asignado`), `GET` listado (con `estado`, `pendiente`) y detalle, `PUT …/cronograma` (FR-004), `POST/DELETE …/lideres` (FR-005, bloquea la fila del Grupo para `ULTIMO_LIDER`), `PUT …/inscripcion-abierta` (FR-006). Permisos `grupos.ver`/`grupos.gestionar` (FR-007).
- [ ] T018 [US1] Integración `apps/api/test/integration/ediciones-vs.integration-spec.ts`: US1 escenarios 1–6 (cronograma propuesto y corregido; Persona sin `lider_curso` rechazada; mover/quitar semana liberada rechazado, agregar al final y quitar la última sin material aceptado; sacar al último Líder rechazado y dos Admins sacando a los dos últimos a la vez → uno falla; abrir/cerrar inscripción; errores por campo). Pastor: 403 en escrituras.
- [ ] T019 [US1] Backoffice `apps/backoffice/src/app/grupos/`: filtro por curso (`curso=vida_nueva|vida_de_servicio`, en la URL, default `vida_nueva` para no cambiar la vista de la 004, FR-038) y, con Vida de Servicio, `TablaDatos` de ediciones + "Crear una edición" (modal: nombre, Sede, fecha de inicio, semanas → previsualización editable de fechas → Líderes con búsqueda), según `docs/15` (Alta en modal, colapso en celular).
- [ ] T020 [US1] Backoffice `apps/backoffice/src/app/grupos/vida-de-servicio/[id]/` (parte de gestión): editar cronograma, sumar/sacar Líderes (con historial), abrir/cerrar inscripción. El resto del detalle lo completa T061.
- [ ] T021 [US1] E2e `apps/backoffice/e2e/ediciones-vs.spec.ts`: el Admin crea una edición de 8 semanas, corrige una fecha, asigna dos Líderes; ve el error por campo al guardar sin Líderes; `axe` claro y oscuro.
- [ ] T022 [P] [US1] Checklist `docs/15` — **listado de Grupos con filtro y modal de alta** (`apps/backoffice/src/app/grupos/`): una acción principal ("Crear una edición"), orden de botones, cuatro estados, `useEnvio`, feedback (`docs/16`), qué pasa después, tono, celular + teclado + lector, contraste en los dos temas.
- [ ] T023 [P] [US1] Checklist `docs/15` — **detalle de edición, gestión** (`apps/backoffice/src/app/grupos/vida-de-servicio/[id]/`).

---

## Phase 4: User Story 2 — Pedir inscripción con el prerrequisito claro (P1) · lote A

- [ ] T024 [US2] `apps/api/src/vida-de-servicio/solicitudes.service.ts` + `solicitudes.controller.ts`: `POST /vida-de-servicio/solicitudes/me` y `DELETE …/me` (FR-008, FR-010, FR-011, FR-012; edad < 12 → `EDAD_INSUFICIENTE_PARA_PEDIR_SOLO`), `POST /vida-de-servicio/solicitudes` en nombre de (FR-013, `vida_servicio.inscribir_en_nombre`). Bloquea la fila de la Persona (carrera de doble pedido). Emite `solicitud_creada`.
- [ ] T025 [US2] `apps/api/src/vida-de-servicio/mi-vida-de-servicio.service.ts`: `GET /vida-de-servicio/me` → `EstadoMiVidaDeServicio` (todos los casos del contrato; `anterior` sin motivos ni comentarios).
- [ ] T026 [US2] Integración `apps/api/test/integration/solicitud-vs.integration-spec.ts`: US2 escenarios 1, 3–8 (cumple por individual, por grupal, por Completitud Manual — esta con un registro sembrado por Prisma si la 006 no mergeó —; no cumple → 422; ediciones abiertas; sin edición abierta acepta `null` y con edición abierta lo rechaza; doble pendiente → 409 incluso en paralelo; activa/completada → 409; dada de baja → permite; en nombre de deja `creadoPorId`; Discipulador → 403 en nombre de; menor de 12 → 422) y los tres motivos de `no_cumple` (escenario 2).
- [ ] T027 [US2] Web: habilitar la card de Vida de Servicio en `apps/web/src/app/(app)/mi-camino/` (dentro de la card de la 006, o sección provisoria) con cada estado de `EstadoMiVidaDeServicio` (FR-009, FR-025, FR-026): mensaje por motivo con enlace a Vida Nueva y mención de "Ya lo hice"; "Quiero anotarme" → elección de edición (preelegida si hay una) o "para la próxima edición"; pendiente con "Retirar mi pedido" (confirmación neutra, D151); rechazada/baja con "¿y ahora qué?" y volver a pedir. Usa `estado-semana` (T015) para el resumen de semanas.
- [ ] T028 [US2] E2e `apps/web/e2e/vida-de-servicio-pedir.spec.ts` `@celular`: la Persona apta pide y ve "Recibimos tu pedido", retira y vuelve a pedir; la Persona sin Vida Nueva ve el motivo y no ve el botón (SC-001); `axe` claro y oscuro.
- [ ] T029 [P] [US2] Checklist `docs/15` — **card de Vida de Servicio en Mi camino** (todos sus estados).

---

## Phase 5: User Story 3 — Revisar los pedidos (P1) · lote A

- [ ] T030 [US3] API: `GET /vida-de-servicio/solicitudes/:id`, `POST …/aprobar` y `…/rechazar` en `solicitudes.service.ts` (FR-015, FR-016, FR-017, FR-018): aprobar revalida prerrequisito y ausencia de Inscripción activa, exige Grupo en curso de Vida de Servicio (cerrada la inscripción no impide), crea la Inscripción con `solicitudVidaServicioId`; bloquea Solicitud y Persona. Emite `solicitud_aprobada` / `solicitud_rechazada`. `GET /solicitudes` (módulo de T013) suma la unión con `tipo` (FR-014).
- [ ] T031 [US3] Integración `apps/api/test/integration/aprobar-vs.integration-spec.ts`: US3 escenarios 2–6 (detalle con la vía del prerrequisito; aprobar crea Inscripción `activa` y la Persona ve el estado `en_curso`; prerrequisito perdido → 422; rechazar → la Persona puede volver a pedir; dos aprobaciones simultáneas → una sola Inscripción; aprobar a quien ya estuvo en esa misma edición → `EDICION_YA_CURSADA`, y en otra edición sí); bandeja: `tipo` filtra, sin `tipo` trae las dos ordenadas y paginadas (escenario 1). SC-002: ninguna Inscripción de VS sin prerrequisito (afirmación sobre todas las vías: me, en nombre de, aprobar).
- [ ] T032 [US3] Backoffice `apps/backoffice/src/app/solicitudes/`: mostrar el filtro por tipo (FR-014, deja de estar oculto) y la columna/etiqueta de tipo; cada fila enlaza a su detalle según el tipo. Nueva pantalla `apps/backoffice/src/app/solicitudes/vida-de-servicio/[id]/`: Persona, cómo cumple el prerrequisito, edición pedida, selector de edición en curso, "Aprobar inscripción" / "Rechazar" (motivo opcional). Si la Solicitud se creó en nombre de, lo dice (D97, `docs/15` Backoffice).
- [ ] T033 [US3] Backoffice `apps/backoffice/src/app/personas/`: acción "Pedir Vida de Servicio en su nombre" en el perfil (FR-013), con el nombre visible durante la acción (`docs/15`), deshabilitada con la razón si no cumple el prerrequisito.
- [ ] T034 [US3] E2e `apps/backoffice/e2e/solicitudes-vs.spec.ts`: filtra por tipo, abre una Solicitud de VS, aprueba eligiendo edición; rechaza otra; pide en nombre de una Persona sin app; `axe` claro y oscuro.
- [ ] T035 [P] [US3] Checklist `docs/15` — **bandeja de Solicitudes con filtro por tipo**.
- [ ] T036 [P] [US3] Checklist `docs/15` — **detalle de Solicitud de Vida de Servicio**.
- [ ] T037 [P] [US3] Checklist `docs/15` — **perfil de Persona, acción en nombre de** (lo que cambia).

---

## Phase 6: User Story 4 — Cargar el material de cada semana (P1) · lote C

- [ ] T038 [US4] `apps/api/src/vida-de-servicio/contenido.service.ts`: `PUT /vida-de-servicio/mis-grupos/:grupoId/semanas/:numero` multipart (FR-020, FR-022, FR-023: tipo por contenido con `sharp`/firma PDF, tamaño, cantidad, texto alternativo de imágenes, URL `https://`), subida antes de la transacción con compensación; primera carga con fecha alcanzada → `liberacionAvisadaEn` + `contenido_liberado`; editar no re-avisa. `marcarLiberacionesDeHoy(hoy)` (research #4) con `UPDATE … RETURNING`. `GET …/semanas/:numero` del Líder. Autorización por Liderazgo vigente (FR-019) y `GRUPO_NO_EN_CURSO` en finalizados (FR-037).
- [ ] T039 [US4] `apps/api/src/vida-de-servicio/archivos.controller.ts`: `GET /vida-de-servicio/archivos/:archivoId` con las tres vías de autorización y los headers de `contracts/persona-api.md` (FR-024).
- [ ] T040 [US4] Integración `apps/api/test/integration/contenido-vs.integration-spec.ts`: US4 escenarios 2–9 (cualquier Líder vigente carga/edita, queda quién; fecha futura no visible para la Persona; fecha hoy visible; fecha pasada sin material → `sin_material`, al cargar queda liberada y emite una vez; editar no emite; archivo grande/tipo falso con extensión `.pdf` rechazados; un no-inscripto, un Líder de otra edición y una Persona dada de baja (semana posterior) reciben 404 en el archivo; Líder ajeno → 404 en carga). `marcarLiberacionesDeHoy` dos veces en paralelo → un solo evento por Contenido. SC-003 y SC-006.
- [ ] T041 [US4] Web `apps/web/src/app/(app)/mis-grupos/[grupoId]/semanas/[numero]/`: formulario de material (título, texto, archivos con texto alternativo para imágenes, enlaces con texto), estado de la semana con `estado-semana`, "Guardar material", mensajes por campo; a 360 px, botones en la zona del pulgar (FR-043).
- [ ] T042 [US4] E2e `apps/web/e2e/mis-grupos-material.spec.ts` `@celular`: el Líder carga material en una semana futura y en una pasada; la Persona inscripta ve solo la pasada; un archivo de 16 MB muestra el error con el límite; `axe` claro y oscuro.
- [ ] T043 [P] [US4] Checklist `docs/15` — **cargar material de una semana**.

---

## Phase 7: User Story 5 — Seguir mi Vida de Servicio (P1) · lote A

- [ ] T044 [US5] API: `GET /vida-de-servicio/me/semanas/:numero` en `mi-vida-de-servicio.service.ts` con `semanasVisibles` (FR-021, FR-034) y la asistencia propia en `GET /vida-de-servicio/me` (FR-031).
- [ ] T045 [US5] Integración `apps/api/test/integration/mi-vida-de-servicio.integration-spec.ts`: US5 escenarios 1–4 (semanas en orden con su estado; asistencia propia sin datos de otros; completada sigue viendo todo; baja ve hasta `cerradaEn` y no lo posterior) y US5 escenario 5 (Persona sin app: el estado existe y lo ve cuando entra — por API con su token).
- [ ] T046 [US5] Web `apps/web/src/app/(app)/mi-camino/vida-de-servicio/` (semanas + "Viniste 5 de 6 encuentros" + fechas de falta) y `semanas/[numero]/` (contenido: texto con enlaces, archivos con nombre y tamaño que abren por la API, enlaces con su texto; imágenes con su texto alternativo, D83). Completada: mensaje y paso siguiente (Ministerios, sin enlace hasta que exista).
- [ ] T047 [US5] E2e — **flujo crítico** `apps/web/e2e/vida-de-servicio-flujo.spec.ts` `@celular`: pedir (Persona) → aprobar (por API como Admin) → material cargado por API → la Persona abre la semana liberada y el PDF; `axe` claro y oscuro (Principio VI/VII).
- [ ] T048 [P] [US5] Checklist `docs/15` — **Mi camino → Vida de Servicio (semanas y asistencia)**.
- [ ] T049 [P] [US5] Checklist `docs/15` — **contenido de una semana (Persona)**.

---

## Phase 8: User Story 6 — Tomar asistencia (P2) · lote C

- [ ] T050 [US6] `apps/api/src/vida-de-servicio/asistencia.service.ts`: `GET`/`PUT /vida-de-servicio/mis-grupos/:grupoId/asistencia/:fecha` y la ruta de Admin (FR-027, FR-028): upsert idempotente del Encuentro sin capítulos y de una Asistencia por Inscripción `activa` en esa fecha; `FECHA_FUTURA`, `FECHA_ANTERIOR_AL_INICIO`, `INSCRIPCION_AJENA`. `faltasPorInscripcion(grupoId)` (una consulta agrupada) para T052 y T061.
- [ ] T051 [US6] Integración `apps/api/test/integration/asistencia-vs.integration-spec.ts`: US6 escenarios 1–4 (presentes por defecto, ausentes marcados; dos Líderes en la misma fecha → un solo Encuentro, el segundo corrige; faltas acumuladas y `alertaFaltas` desde 2; tomar asistencia no libera y liberar no crea Encuentro, FR-030); quien se inscribió después no suma faltas de antes (edge case).
- [ ] T052 [US6] Web `apps/web/src/app/(app)/mis-grupos/[grupoId]/asistencia/`: fecha (hoy por defecto), lista de inscriptos con interruptor presente/ausente de un toque y 44 px, contador en vivo ("28 presentes, 2 ausentes") y "Guardar asistencia" fijo en la zona del pulgar; faltas con ícono + texto (FR-029).
- [ ] T053 [US6] E2e `apps/web/e2e/mis-grupos-asistencia.spec.ts` `@celular`: 30 inscriptos sembrados, el Líder marca 2 ausentes y guarda en un solo envío; quien llega a 2 faltas aparece destacado con texto; `axe` claro y oscuro. SC-004 (sin scroll horizontal, un solo envío).
- [ ] T054 [P] [US6] Checklist `docs/15` — **tomar asistencia**.

---

## Phase 9: User Story 7 — Bajas (P2) · lotes C (proponer) y B (resolver)

- [ ] T055 [US7] Lote C — `apps/api/src/vida-de-servicio/mis-grupos.service.ts`: `POST …/inscripciones/:id/baja/proponer` (FR-032) con `tipo` y comentario. Emite `baja_propuesta`.
- [ ] T056 [US7] Lote B — `ediciones.service.ts`: confirmar (con tipo corregible), rechazar y baja directa (FR-033), con `cerradaEn`. Emite `baja_aplicada` / `baja_rechazada`.
- [ ] T057 [US7] Integración `apps/api/test/integration/bajas-vs.integration-spec.ts`: US7 escenarios 1–5 (propuesta no cambia el estado; confirmar con tipo propuesto y con tipo corregido; rechazar vuelve a `activa` con el motivo para el Líder; baja directa del Admin; después de la baja, una semana nueva no es visible); doble propuesta → 409.
- [ ] T058 [US7] Lote C — en `apps/web/src/app/(app)/mis-grupos/[grupoId]/` (inscriptos): "Proponer baja" por Persona con elección "Dada de baja" / "Abandonó" explicada en palabras, comentario opcional, confirmación neutra (D151); muestra baja propuesta y rechazada con su motivo.
- [ ] T059 [US7] Lote B — en el detalle de edición del backoffice: confirmar (con selector de tipo) / rechazar, y "Dar de baja" / "Registrar abandono" directo con confirmación en rojo + ícono (irreversible, D151).
- [ ] T060 [US7] E2e: `apps/web/e2e/mis-grupos-baja.spec.ts` `@celular` (el Líder propone) y `apps/backoffice/e2e/bajas-vs.spec.ts` (el Admin la ve en pendientes —US7 escenario 6— y la confirma); `axe` en los dos temas.

---

## Phase 10: User Story 8 — Finalizar y habilitar para Ministerio (P2) · lotes C (proponer) y B (confirmar)

- [ ] T062 [US8] Lote C — `POST …/finalizacion/proponer` en `mis-grupos.service.ts` con `sePuedeProponerFinalizacion` (FR-035). Emite `finalizacion_propuesta`. En `apps/web/src/app/(app)/mis-grupos/[grupoId]/`: "Proponer cerrar la edición" visible solo desde la última fecha, con el rechazo y su motivo si lo hubo.
- [ ] T063 [US8] Lote B — `POST …/finalizacion/confirmar` y `…/rechazar` en `ediciones.service.ts` (FR-036): en una transacción, cierra el Grupo con motivo completado, `activa` → `completada` con `cerradaEn`, y `alCompletarCategoria(…,'vida_de_servicio')` por cada una; rechaza con `BAJAS_PROPUESTAS_SIN_RESOLVER` listándolas. Emite `finalizacion_confirmada` por Persona / `finalizacion_rechazada`. En el detalle de edición del backoffice: "Confirmar el cierre" (rojo + ícono, irreversible) / "Rechazar".
- [ ] T064 [US8] Integración `apps/api/test/integration/finalizacion-vs.integration-spec.ts`: US8 escenarios 1–6 (proponer antes → 409 con `desde`; confirmar con `activa`, `dada_de_baja` y `abandono` → solo la `activa` completada y con `apto_ministerio`; bajas propuestas bloquean; rechazar y volver a proponer; Persona que ya tenía `apto_ministerio` y un rol de cargo los conserva sin duplicar (H-139); en finalizado, asistencia/material/bajas/cronograma/Líderes → `GRUPO_NO_EN_CURSO` y el material sigue visible). SC-005.
- [ ] T065 [US8] Integración `apps/api/test/integration/completitud-vs.integration-spec.ts` (FR-042): `alCompletarCategoria` con `vida_de_servicio` otorga `apto_ministerio`; con `vida_nueva` no (FR-022 de la 004). Si la 006 ya mergeó, además: confirmar un "Ya lo hice" de Vida de Servicio deja la card en `completada` y la Persona con el rol — y cablear la llamada en el servicio de la 006 en el mismo commit.
- [ ] T066 [US8] E2e `apps/backoffice/e2e/finalizacion-vs.spec.ts`: con una edición sembrada en su última semana y una finalización propuesta por API, el Admin confirma; en Personas, la inscripta activa muestra Apto para Ministerio y la dada de baja no; `axe` en los dos temas.

---

## Phase 11: User Story 9 — Seguimiento desde el backoffice (P3) · lote B

- [ ] T061 [US9] Backoffice `apps/backoffice/src/app/grupos/vida-de-servicio/[id]/` (parte de lectura): Líderes vigentes e historial, cronograma con `estado-semana`, inscriptos con estado, faltas (alerta con texto + ícono) y teléfono, material de cada semana en lectura (con descarga por la API), finalización y bajas propuestas; el Pastor sin ningún control de gestión (FR-038, D64).
- [ ] T067 [US9] Pendientes: `apps/api/src/pendientes/` suma `vidaDeServicio` (FR-039) y `apps/backoffice/src/app/tarjeta-pendientes.tsx` los muestra con enlace al detalle; `apps/backoffice/src/app/grupos/` acepta `pendiente=finalizacion|baja` para Vida de Servicio.
- [ ] T068 [US9] Quitar `lider_curso` (FR-040): `apps/api/src/persona/roles.service.ts` y `persona.service.ts` consultan `gruposServicioActivosDe(tx, personaId)` con la fila bloqueada (D137, H-142) y se lo pasan a `puedeQuitarRol`; el panel de roles de `apps/backoffice/src/app/personas/` nombra cada edición con enlace a su detalle. Integración en `apps/api/test/integration/roles-lider-curso.integration-spec.ts`: con edición en curso bloquea y nombra; finalizada o ya sacado del Grupo, permite.
- [ ] T069 [US9] E2e `apps/backoffice/e2e/edicion-vs-lectura.spec.ts`: el Pastor abre una edición y no ve botones de gestión; el Admin ve la tarjeta de pendientes con la finalización y la baja; el bloqueo de `lider_curso` muestra la edición enlazada; `axe` en los dos temas.
- [ ] T070 [P] [US9] Checklist `docs/15` — **detalle de edición, lectura** (Admin y Pastor).
- [ ] T071 [P] [US9] Checklist `docs/15` — **tarjeta de pendientes del Inicio** (lo que cambia).
- [ ] T072 [P] [US9] Checklist `docs/15` — **panel de roles de Personas** (bloqueo de `lider_curso`).

---

## Phase 12: Pantallas del Líder — listado y detalle (comparten US4, US6, US7, US8) · lote C

- [ ] T073 [US4] `GET /vida-de-servicio/mis-grupos` y `GET …/:grupoId` en `mis-grupos.service.ts` (FR-019): solo Liderazgos vigentes, recorte por identidad (D134), teléfono solo de `activa` (Pregunta 3). Integración `apps/api/test/integration/mis-grupos.integration-spec.ts`: un Líder no ve ediciones de otro (SC-006); un Líder sacado del Grupo deja de verlo; un Admin sin `lider_curso` no tiene "mis grupos" (D134).
- [ ] T074 [US4] Web `apps/web/src/app/(app)/mis-grupos/` (listado: próxima semana, semanas vencidas sin material, alertas de faltas; vacío "Todavía no tenés ediciones a cargo") y `[grupoId]/` (cronograma con `estado-semana` que lleva a cargar material, "Tomar asistencia", inscriptos con faltas y teléfono como `tel:`, finalización). 360 px primero (FR-043).
- [ ] T075 [US4] E2e `apps/web/e2e/mis-grupos.spec.ts` `@celular`: el Líder 1 ve su edición y no la del Líder 2; sin scroll horizontal a 320 px; `axe` claro y oscuro.
- [ ] T076 [P] [US4] Checklist `docs/15` — **Mis grupos (listado)**.
- [ ] T077 [P] [US4] Checklist `docs/15` — **detalle de mi grupo (Líder)**.

---

## Phase 13: Polish & Cross-Cutting

- [ ] T078 `apps/api/prisma/seed-demo.ts` (FR-045, D120): edición en curso a medio liberar con dos Líderes e inscriptos en los cuatro estados, alguien con 3 faltas, una baja propuesta, una edición finalizada con Aptas para Ministerio, una Persona bloqueada por prerrequisito, una con pedido "para la próxima edición"; datos hostiles (título de 120 caracteres, texto de 10.000 con enlaces, archivo con nombre de 200, nombre de edición de 80). Prefijo `demo-`.
- [ ] T079 Unit `apps/api/test/unit/eventos-vida-de-servicio.spec.ts` (extender T012): cada transición de los contratos emite el evento de `contracts/eventos.md` con destinatario, prioridad y disparador (FR-041, SC-008), con el servicio real y un espía sobre `emitirEventoVidaDeServicio`.
- [ ] T080 Recorrer `quickstart.md` entero a mano y anotar en el PR lo que no coincida.
- [ ] T081 Las tres suites en verde (`pnpm --filter api run test`, `pnpm --filter api run test:e2e`, e2e de `apps/web` —incluido `celular`— y `apps/backoffice`) y lint + typecheck de todo el monorepo. Recién entonces, abrir la revisión manual (D152).

---

## Cobertura: criterio → test

| Criterio | Test |
|---|---|
| US1 1–6 | T018 (integración), T021 (e2e) |
| US2 1–8 | T026 (integración), T028 (e2e) |
| US3 1–6 | T031 (integración), T034 (e2e) |
| US4 1–9 | T040, T073 (integración), T042, T075 (e2e) |
| US5 1–5 | T045 (integración), T047 (e2e crítico) |
| US6 1–4 | T051 (integración), T053 (e2e) |
| US7 1–6 | T057 (integración), T060 (e2e) |
| US8 1–6 | T064, T065 (integración), T066 (e2e) |
| US9 1–4 | T018/T061 (listado), T068 (integración), T069 (e2e) |
| Edge cases | T003 (reglas), T026 (grupal, menor de 12), T031 (edición cerrada), T051 (inscripto tarde), T009 (Liderazgo VS no es discipulado) |
| SC-001 | T028 |
| SC-002 | T031 |
| SC-003 | T040, T047 |
| SC-004 | T053 |
| SC-005 | T064 |
| SC-006 | T040, T073, T075 |
| SC-007 | T047 + T053 + T066 (el ciclo completo en el sistema) y T080 |
| SC-008 | T079 |

## Dependencies & Execution Order

- **Phase 1–2 (lote 0)** bloquean todo.
- **US1** (B) no depende de otra historia. **US2/US3/US5** (A) crean ediciones con `crearEdicionPorApi` (T010), sin esperar a la pantalla de B.
- **US4/US6** y las partes Líder de **US7/US8** (C) usan `crearEdicionPorApi` e `inscribirPorApi`.
- **T073–T074** (detalle del Líder) van antes de T041, T052, T058 y T062, dentro de C.
- **T056, T059, T063** (B) necesitan las propuestas de C solo en sus e2e: las crean por API.
- **T061** (lectura del detalle) completa la pantalla de T020: misma sesión B, después.
- **T078–T081** al final, en una sola sesión.
- La numeración no es el orden: T061 (Phase 11) quedó antes de T062 por cómo se armaron las fases; el orden lo dan las fases y esta sección.
- **FR-043 y FR-044** (celular y definición de terminado) son transversales: los cubren las convenciones de arriba, las tareas de checklist por pantalla y los e2e `@celular`.

## Lotes (sesiones en paralelo que no se pisan)

**Lote 0 — primero y solo:** T001–T016. Todo lo que toca `packages/shared-types`, `packages/ui`,
`schema.prisma` y la migración, seeds y helpers de e2e, `storage/`, el esqueleto de
`vida-de-servicio/` (`prerrequisito.ts`, `efectos.ts`, `eventos.ts`), los cambios mínimos a la 004
(`discipulados-activos.ts`, `encuentros.service.ts`, `baja.service.ts`), los módulos movidos
(`solicitudes/`, `pendientes/`), `nav.ts` de las dos apps, `playwright.config.ts` de la web y la
estructura de los `es.json`. Ningún lote paralelo agrega decisiones: si alguno necesita una, para y lo
anota para Echu.

| Lote | Tareas | Archivos propios |
|---|---|---|
| **A — Persona y Solicitudes** | T024–T037, T044–T049 | `vida-de-servicio/solicitudes.*`, `mi-vida-de-servicio.service.ts`, `apps/web/src/app/(app)/mi-camino/`, `apps/backoffice/src/app/solicitudes/`, la acción de `apps/backoffice/src/app/personas/` (T033), namespaces `vidaDeServicio` y `solicitudesServicio` |
| **B — Ediciones (Admin)** | T017–T023, T056, T059, T061, T063–T072 | `vida-de-servicio/ediciones.service.ts`, `grupos-vs.controller.ts`, `apps/api/src/pendientes/`, `persona/roles.service.ts` (T068), `apps/backoffice/src/app/grupos/`, `tarjeta-pendientes.tsx`, el panel de roles de `personas/` (T068), namespaces `edicionesServicio` e `inicio.pendientes.vidaDeServicio` |
| **C — Líder** | T038–T043, T050–T055, T057, T058, T060, T062, T073–T077 | `vida-de-servicio/contenido.service.ts`, `archivos.controller.ts`, `asistencia.service.ts`, `mis-grupos.*`, `apps/web/src/app/(app)/mis-grupos/`, namespace `misGrupos` |

- **Cruces resueltos así**: `apps/backoffice/src/app/personas/` lo tocan A (T033, acción en el perfil)
  y B (T068, panel de roles): son componentes distintos; A primero si hay conflicto de imports.
  `faltasPorInscripcion` es de C (T050) y la usa B (T061): B la consume cuando C mergea, o la lee de
  la misma consulta que deja C en `asistencia.service.ts` (no la reescribe). T057 (integración de
  bajas) cubre C y B: va en B, después de T055.
- **Después de los tres**: T078–T081.

## Implementation Strategy

- **MVP = lote 0 + US1 + US2 + US3 + US4 + US5**: abrir edición, pedir, aprobar, cargar material y
  verlo. Con eso Vida de Servicio ya reemplaza el WhatsApp del material semanal.
- Después: US6 (asistencia, reemplaza la planilla), US7 (bajas), US8 (cierre y Apto para Ministerio:
  sin esto nadie llega a Ministerios), US9 (seguimiento).
- Cada lote cierra con sus tests en verde y un commit por cambio coherente. Sin push salvo pedido.
