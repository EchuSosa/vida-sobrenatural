# Tasks: Eventos — cartelera, inscripciones, cupo, lista de espera y pagos

**Input**: Design documents from `/specs/011-eventos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: la Constitución los exige (Principio VI): unit para toda regla con ramas, integración
para lo que cambia estado contra la base (cupo, promoción, pago rechazado), e2e con axe en claro y
oscuro para el flujo crítico (Principio VII). **Cada requisito (FR) y cada criterio (SC) tiene al
menos una tarea de test**: ver la tabla "Cobertura" al final.

**Organización**: por historia de usuario, en orden de prioridad (US1, US2, US3 son P1; US4, US5,
US6, US8 son P2; US7 es P3). Cada pantalla nueva o modificada lleva su tarea de checklist de
`docs/15-guia-ux-ui.md` (D114). Al final, **Lotes** agrupa las tareas en sesiones paralelas que no
se pisan; el **lote 0** es secuencial y va primero.

**Convenciones que valen para todas las tareas** (no se repiten en cada una):
- Permisos solo con `@RequierePermiso` / `requerirPermiso` contra `CATALOGO_PERMISOS` (D132). Las
  acciones de la propia Persona se autorizan por registro en el servicio; lo ajeno responde 404.
- Errores Problem Details con `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50). Prisma con `select` explícito; listados con `Pagina<T>` (H-42).
- Toda operación que crea o mueve una Inscripción usa `conBloqueoDeEvento()` y, si libera lugar,
  `promoverDesdeLista()` de `motor-cupo.ts` (lote 0). Nadie reimplementa el conteo ni la promoción.
- Sucesos con `SucesosEventoService.emitir()` **después** del commit (`contracts/eventos-dominio.md`).
- Textos por `next-intl` (rioplatense, voseo), colores solo de tokens (D118), estados con texto +
  ícono (D81). Botones con `Button` + `useEnvio` (H-57); formularios con `useValidacionCampos` +
  `ResumenErrores` (H-50). En Next, "cargando" es `loading.tsx` y "error" es `error.tsx`.
- `apps/web`: tamaños de D150 (16 px en etiquetas, botones y ayudas; `Button` de 44 px); las
  pantallas de la Persona se diseñan a 360 px primero y sus e2e llevan `@celular`.
- Cancelar una inscripción usa confirmación **neutra** (D151); eliminar un Evento, destructiva.

---

## Phase 1: Setup

- [ ] T001 Verificar que la rama `011-eventos` está al día con `main`, que `.specify/feature.json` apunta a `specs/011-eventos`, y si ya mergearon la 007, la 010 o la 012: si la 010 cambió la bandeja de Solicitudes, adaptar T020 a su forma (research #12); si la 007 cambió la pantalla de ingreso, adaptar T046 a ella; si la 012 ya tiene `NotificacionService`, T014 conecta ahí en vez de solo loguear. Si hay que agregar una decisión, mirar el último número de `docs/05-decisiones.md` (D89, D103).

---

## Phase 2: Foundational — **lote 0** (secuencial, bloquea todo)

### Tipos, reglas puras y catálogos (`packages/shared-types`)

- [ ] T002 **[Lote 0 global: enums, límites y tipos MIME hechos; los tipos de respuesta y las dos funciones puras → lote A/B de la 011, en el mismo archivo]** [P] Crear `packages/shared-types/src/eventos.ts` según `data-model.md` § Tipos: enums como uniones de string, `EventoPublico`, `EventoResumen`, `EventoDetalle`, `InscripcionEventoResumen`, `MiInscripcionEvento`, `PagoResumen`, `PagoEnBandeja`, límites (`EVENTO_NOMBRE_MAX`, `EVENTO_DESCRIPCION_MAX`, `EVENTO_LUGAR_MAX`, `INSTRUCCIONES_PAGO_MAX`, `DIAS_RECORDATORIO_MAX = 60`), `MIME_TIPOS_COMPROBANTE_PERMITIDOS`, `COMPROBANTE_TAMANO_MAXIMO_BYTES`, `MIME_TIPOS_FLYER_PERMITIDOS`, `FLYER_TAMANO_MAXIMO_BYTES`, y las funciones puras `estadoPagoDeInscripcion()` (FR-024) y `estadoInscripcionDeEvento()` (FR-002, FR-004, FR-005, FR-046). Exportar desde `index.ts`.
- [ ] T003 **[Lote 0 global: → con T002]** [P] Unit tests en `apps/api/test/unit/eventos-estados.spec.ts`: `estadoPagoDeInscripcion` (sin costo → `no_aplica`; sin pagos → `sin_pago`; uno pendiente; uno verificado; rechazado + nuevo pendiente; último rechazo expuesto) y `estadoInscripcionDeEvento` (sin inscripción, abierta, lista de espera, cupo completo, ya empezó → cerrada, cancelado, bautismo → `solo_admin`). Cubre FR-002, FR-004, FR-005, FR-024, FR-046.
- [ ] T004 **[Lote 0 global: `instanteEnArgentina` hecho; `formatearInicioEvento` y el test → lote B]** [P] En `packages/shared-types/src/formato.ts`: `instanteEnArgentina(fechaCivil, hora)` y `formatearInicioEvento(inicio, fin, locale)` ("sábado 14 de noviembre, 19:00" / rango de días), junto a `diaCivilEnArgentina` (research #15). Unit test en `apps/api/test/unit/instante-argentina.spec.ts`: 23:30 del 14 en AR es 02:30Z del 15; rango de varios días.
- [x] T005 **[Lote 0 global: test en `lote-0-global.spec.ts`]** [P] Crear `packages/shared-types/src/navegacion.ts` con `destinoSeguro(valor): string` (research #11). Unit test en `apps/api/test/unit/destino-seguro.spec.ts`: `/eventos/x?anotarme=1` pasa; `//evil.com`, `https://evil.com`, `/\evil`, `javascript:`, vacío y `undefined` → `/inicio`. Cubre FR-020.
- [x] T006 **[Lote 0 global: reemplazado por `CATALOGO_AVISOS` (D197): eventos `evento.*`, destinatarios `evento_inscriptos`/`evento_confirmados`/`todas_sin_inscripcion`]** [P] Crear `packages/shared-types/src/sucesos-evento.ts` exactamente como `contracts/eventos-dominio.md`. Exportar.
- [x] T007 **[Lote 0 global: `TipoSolicitud` vive en `bandeja.ts` (D178); el test del Pastor está en `lote-0-global.spec.ts`]** Extender `packages/shared-types/src/permisos.ts`: `'eventos.gestionar': ['admin']`, `'eventos.papelera.ver': ['admin']`, `'inscripciones_evento.gestionar': ['admin']`, `'pagos.verificar': ['admin']` (research #14). En `discipulado.ts`, `TipoSolicitud` suma `'inscripcion_evento' | 'pago'`. Test en `apps/api/test/unit/permisos-eventos.spec.ts`: el Pastor tiene `eventos.ver` y ninguno de los cuatro nuevos (FR-009).
- [x] T008 **[Lote 0 global: hecho, con traducciones]** Extender `packages/shared-types/src/error-code.ts` con los códigos de `contracts/eventos-api.md`, `inscripciones-api.md` y `pagos-api.md` (cada uno con comentario del FR), sin reutilizar ninguno con otro significado (Principio X); los de campo van bajo `VALIDACION`. Traducciones de todos en `errors` de los dos `es.json`, diciendo cómo seguir (H-50).

### Base de datos

- [x] T009 **[Lote 0 global: en la migración única `20261008120000_lote_0_global`]** Extender `apps/api/prisma/schema.prisma` según `data-model.md`: enums, `Evento`, `InscripcionEvento`, `Pago`, relaciones nombradas con `Persona` y `Sede`, índices, `@@map`.
- [ ] T010 **[Lote 0 global: SQL a mano en la migración única; el test de restricciones → lote A]** Crear la migración con `pnpm --filter api exec prisma migrate dev --create-only --name eventos` y agregar a mano los CHECKs de `data-model.md` y los dos índices únicos parciales (`inscripciones_evento_una_abierta`, `pagos_uno_pendiente_por_inscripcion`), patrón H-140. Test de integración en `apps/api/test/integration/eventos-constraints.integration-spec.ts`: cada CHECK rechaza su caso (incluido el de bautismo, FR-045) y los índices impiden dos abiertas / dos pendientes (FR-021, FR-030).
- [ ] T011 **[Lote 0 global: `limpiar-e2e.ts` ya borra Pago → InscripcionEvento → Evento `e2e-` (por nombre o Sede); `sembrar-e2e-eventos.ts`, fixtures y helpers → lote A]** Extender `apps/api/scripts/limpiar-e2e.ts` (Pago → InscripcionEvento → Evento de Personas/Eventos `e2e-`) y crear `apps/api/scripts/sembrar-e2e-eventos.ts` (Eventos fixture `e2e-`: informativo, con cupo 2 y lista, con aprobación, con costo, de bautismo, cancelado, pasado) + `apps/api/test/integration/eventos-fixtures.ts` (constructores por Prisma para los tests de integración). Sumar un helper `sembrarEventosE2E()` a `apps/web/e2e/` y `apps/backoffice/e2e/helpers.ts`.
- [ ] T012 **[Lote 0 global: → lote A]** En `apps/api/src/sede/sede.service.ts`, contar Eventos como datos relacionados de una Sede (no se puede eliminar, D119). Extender el test de integración de sedes existente con ese caso.

### Motor de cupo, almacenamiento y costura de avisos (`apps/api`)

- [ ] T013 **[Lote 0 global: → lote B (el primero que inscribe); el lote A lo necesita solo para cancelar]** Crear `apps/api/src/evento/motor-cupo.ts` (research #1, #3; `contracts/inscripciones-api.md` § Reglas): `conBloqueoDeEvento(prisma, eventoId, fn)` (transacción interactiva con `SELECT … FOR UPDATE`), `contarOcupados(tx, eventoId)`, `decidirEstadoInicial(evento, ocupados)` (pura), `liberaLugar(estado)` (pura), `promoverDesdeLista(tx, evento) → SucesoEvento[]`, `posicionEnLista(tx, inscripcion)`. Unit tests en `apps/api/test/unit/motor-cupo.spec.ts` de las dos puras (con y sin cupo, aprobación, lista, lleno sin lista → `CUPO_LLENO`, bautismo). Integración en `apps/api/test/integration/motor-cupo.integration-spec.ts`: **20 inscripciones concurrentes con cupo 10 → exactamente 10 ocupan, el resto en lista en orden de llegada (SC-003, FR-016)**; promoción de uno, de dos, a `pendiente` con aprobación, nada si cancelado o ya empezó (FR-018, SC-004); posición en lista (FR-017).
- [x] T014 **[Lote 0 global: reemplazado por `NotificacionesService.emitir(tx, …)` (D197): sin servicio propio]** Crear `apps/api/src/evento/sucesos.service.ts` (`SucesosEventoService.emitir`, research #13; si la 012 ya mergeó, delegar en su servicio además de loguear). Unit test en `apps/api/test/unit/sucesos-evento.spec.ts`: el log tiene nombre, tipo de destinatario e ids, y ningún otro campo (FR-050, Principio X).
- [x] T015 **[Lote 0 global: hecho sin renombrar `ImagenPortadaService` (el perfil `FLYER` y el rename → lote A); test en `lote-0-global.integration-spec.ts`]** Generalizar `apps/api/src/storage/` (research #6, #7): `StorageService.subir({ …, area })`, `leer(area, ruta)`, `eliminar(area, ruta)`; `LocalStorageProvider` con una carpeta por área bajo `STORAGE_DIR` (`portadas/` conserva su ruta y su URL); `main.ts` sirve como estáticos **solo** `portadas` y `flyers`. Renombrar `ImagenPortadaService` a `ImagenPublicaService.procesar(buffer, perfil)` con los perfiles `PORTADA` (valores actuales) y `FLYER` (1080×1350, lado corto mínimo 600, sin recorte). Actualizar `libro.service.ts`. **Los tests de libros/portadas existentes pasan sin cambios.** Test nuevo en `apps/api/test/integration/storage-areas.integration-spec.ts`: no existe ninguna ruta estática que sirva `comprobantes` (FR-032, SC-005).
- [ ] T016 **[Lote 0 global: → lote C]** Crear `apps/api/src/evento/comprobante.ts`: detección de tipo por firma (JPG, PNG, WebP, PDF), tamaño máximo, re-codificación de imágenes con `sharp` sin metadatos, PDF tal cual (research #6). Unit test en `apps/api/test/unit/comprobante.spec.ts`: cada tipo válido; un ejecutable con extensión `.pdf` → `COMPROBANTE_TIPO_INVALIDO`; > 5 MB → `COMPROBANTE_TAMANO_EXCEDIDO`; una imagen con EXIF de ubicación sale sin EXIF (FR-031).
- [ ] T017 **[Lote 0 global: → lote A]** Crear `apps/api/src/evento/slug.ts` con `slugDeEvento(nombre, existe)` (research #9). Unit test en `apps/api/test/unit/slug-evento.spec.ts`: tildes y ñ, signos, 120 caracteres → 60, colisión → `-2`, `-3` (FR-011).
- [ ] T018 **[Lote 0 global: `EventoModule` vacío registrado; cada lote crea SUS archivos (no hacen falta stubs: son archivos nuevos de cada uno)]** Crear `apps/api/src/evento/evento.module.ts` registrado en `app.module.ts`, con **archivos vacíos** (clase sin métodos) para cada controller/servicio de un lote: `eventos-gestion.*` (A), `eventos-publicos.*` y `inscripcion-propia.*` (B), `mis-eventos.*` y `pagos-persona.*` (C), `inscriptos.*`, `pagos-admin.*` y `eventos-consultas.service.ts` (D). Exporta `motor-cupo`, `SucesosEventoService` y `EventosConsultasService`.
- [ ] T019 **[Lote 0 global: `@nestjs/throttler` instalado; la configuración por módulo → lote B]** Límite de pedidos (research #10): si la 007 no agregó `@nestjs/throttler`, agregarlo con un límite por defecto para los endpoints públicos de Eventos y los de subida (flyer, comprobante). Test en `apps/api/test/integration/eventos-limites.integration-spec.ts`: el pedido N+1 en la ventana responde 429 (FR-051, `docs/13`).
- [x] T020 **[Lote 0 global: reemplazado por D178: vista `solicitudes_bandeja` + `BandejaService` + `RegistroFuentesSolicitudes`; las fuentes `inscripcion_evento` y `pago` las registra el lote D; el endpoint lo generaliza la 013 (lote 1)]** Extraer la bandeja (research #12): `apps/api/src/solicitudes/bandeja.service.ts` con la interfaz `FuenteSolicitudes` (`tipo`, `contar`, `listar`), la mezcla para "Todos" y la fuente `discipulado` (lo que hoy hace `solicitud-discipulado.service.ts#listar`); `GET /solicitudes` pasa a un `SolicitudesController` en ese módulo. Las fuentes `inscripcion_evento` y `pago` se registran vacías (devuelven 0) y las completa el lote D. **Los tests de la bandeja de la 004 pasan sin cambios.** Test nuevo en `apps/api/test/integration/bandeja-fuentes.integration-spec.ts`: con dos fuentes de prueba, "Todos" pagina bien a través de páginas (página 2 = filas 11–20 del orden global) (FR-034).

### Interfaz compartida, navegación y mensajes

- [ ] T021 **[Lote 0 global: → lote B (`campo-archivo` lo usa también la 008: el primero que llegue lo crea en `packages/ui`, ver specs/IMPLEMENTACION.md)]** [P] Crear `packages/ui/src/components/estado-inscripcion-badge.tsx` (estado de Inscripción y de pago, texto + ícono Lucide, tokens, textos por prop — H-151) y `packages/ui/src/components/campo-archivo.tsx` (etiqueta visible, ayuda con tipos y tamaño, nombre del archivo elegido, error por campo con `aria-describedby`, operable con teclado, `accept` por prop). Exportar. Unit/render test en `packages/ui/test/` de que el estado nunca va sin texto (D81) y de que el error queda asociado al input (FR-031).
- [ ] T022 **[Lote 0 global: → lote B]** [P] Crear `apps/web/src/components/eventos/tarjeta-evento.tsx` (la usan la cartelera pública y Mis eventos: nombre, `formatearInicioEvento`, lugar, costo/"Sin costo", estado de inscripción con texto + ícono, flyer con `next/image` y `alt`, o `PlaceholderImagen`).
- [ ] T023 **[Lote 0 global: → lote A, en su bloque de `nav.ts`]** Extender `apps/backoffice/src/config/nav.ts` con `/eventos/[id]` (`eventos.ver`, `enMenu: false`) y `/eventos/papelera` (`eventos.papelera.ver`, `enMenu: false`); crear el esqueleto de `apps/backoffice/src/app/eventos/[id]/page.tsx` que compone `datos-evento.tsx` (lote A) e `inscriptos-evento.tsx` (lote D), creados acá como stubs vacíos, cada uno con su propia carga. Correr `pnpm --filter backoffice run lint` (regla `pantalla-declara-permiso`).
- [x] T024 **[Lote 0 global: namespaces creados; los pendientes van en `inicio.pendientes.extra.<clave>`]** Crear los namespaces vacíos, cada uno en su bloque: `apps/backoffice/src/messages/es.json` → `eventos.gestion` (A), `eventos.inscriptos` y `eventos.pagos` (D), `solicitudes.tipos` (D), `inicio.pendientes.eventos` (D); `apps/web/src/messages/es.json` → `eventos.publico` y `eventos.inscripcion` (B), `misEventos` (C). Reconstruir `packages/shared-types` y `packages/ui` (H-33) y correr lint y typecheck de las cinco piezas.
- [x] T025 **[Lote 0 global: hecho]** Agregar el proyecto `celular` (`devices['Pixel 7']`, `grep: /@celular/`) a `apps/web/playwright.config.ts` (research #16). Verificar que la suite de `apps/web` sigue verde.

**Checkpoint**: migra, siembra, el motor de cupo pasa la prueba de concurrencia, portadas y bandeja de la 004 siguen verdes. El lote 0 se commitea antes de abrir los paralelos.

---

## Phase 3: User Story 2 — Crear y editar un Evento desde el backoffice (P1) — lote A

- [ ] T026 [US2] Implementar en `apps/api/src/evento/eventos-gestion.service.ts` y `.controller.ts`: `GET /eventos` (filtros, búsqueda, orden y totales — FR-009), `GET /eventos/:id`, `POST /eventos` (con `slugDeEvento`, FR-010, FR-011), `PATCH /eventos/:id` con `conBloqueoDeEvento` y las reglas de FR-014; si sube o quita el cupo, `promoverDesdeLista` (FR-018); si cambian `inicio`/`fin`/`lugar` con Inscripciones abiertas, suceso `evento_modificado` (FR-050). DTOs en `apps/api/src/evento/dto/`.
- [ ] T027 [US2] Flyer: `PUT /eventos/:id/flyer` y `DELETE /eventos/:id/flyer` con `ImagenPublicaService` perfil `FLYER` y área `flyers`; el archivo anterior se elimina (FR-012).
- [ ] T028 [P] [US2] Integración en `apps/api/test/integration/eventos-gestion.integration-spec.ts`: crear con todos los campos y con los mínimos; cada error de campo de FR-010; slug fijo al renombrar (FR-011); los cinco bloqueos de FR-014; subir cupo con lista promueve en orden (FR-018); quitar cupo promueve a todos; `evento_modificado` solo con inscriptos; el Pastor recibe 403 en escritura (FR-009); flyer sin `descripcionImagen` → error de campo, tipo/tamaño inválido → su código, reemplazar borra el archivo anterior (FR-012).
- [ ] T029 [US2] Pantalla `apps/backoffice/src/app/eventos/page.tsx` (+ `loading.tsx`, `error.tsx`): `TablaDatos` con nombre, fecha, tipo, estado (texto + ícono), ocupados/cupo, pendientes y pagos a verificar; filtros próximos/pasados/cancelados/todos y tipo, búsqueda y página en la URL (FR-009, `docs/15`); columnas con prioridad responsive; acción principal "Crear un Evento"; enlace a la papelera.
- [ ] T030 [US2] Formulario de Evento en modal (alta) y en el detalle (edición): `apps/backoffice/src/app/eventos/formulario-evento.tsx` con `CampoFecha` + `CampoHora`, los campos condicionales (aprobación, lista y recordatorio solo con inscripción; lista solo con cupo; instrucciones solo con costo; en tipo "Bautismo", ocultos los que no aplican — FR-045), `CampoArchivo` para el flyer con su texto alternativo, errores por campo con resumen (H-50). Al crear, la confirmación ofrece el paso siguiente ("Ver QR", o "Subir flyer" si no tiene — `docs/15` §Backoffice).
- [ ] T031 [US2] Detalle — sección de datos: `apps/backoffice/src/app/eventos/[id]/datos-evento.tsx`: datos, flyer, acciones (Editar, Cancelar/Reactivar, Eliminar — US7), y para Eventos con inscripción el QR (SVG generado en el servidor con `qrcode` y `WEB_PUBLIC_URL`), "Copiar link" y "Descargar QR" (FR-013). Route handler `apps/backoffice/src/app/eventos/[id]/qr.png/route.ts` con `requerirPermiso('eventos.ver')` (`contracts/eventos-api.md`). Agregar `qrcode` a `apps/backoffice/package.json` y `WEB_PUBLIC_URL` a `apps/backoffice/.env.local.example` (D85: nunca escrita en el código).
- [ ] T032 [US2] E2E `apps/backoffice/e2e/eventos-gestion.spec.ts` con axe en claro y oscuro: crear un Evento con inscripción, cupo, costo y flyer; sin texto alternativo no guarda y el foco va al resumen; el detalle muestra QR + link y la descarga devuelve un PNG; renombrar no cambia el link (FR-010–FR-013). Variante con la sesión del Pastor: sin botones de acción (FR-009).
- [ ] T033 [US2] Checklist de `docs/15` sobre **el listado de Eventos** del backoffice (una acción principal, cuatro estados, tabla a 320 px sin scroll horizontal, filtros en la URL, contraste en los dos temas). Anotar el resultado en el PR.
- [ ] T034 [US2] Checklist de `docs/15` sobre **el formulario de Evento** (alta y edición): etiquetas visibles, opcionales marcados, errores por campo que dicen cómo corregir, `useEnvio`, orden de botones, teclado y lector de pantalla, contraste en los dos temas.
- [ ] T035 [US2] Checklist de `docs/15` sobre **el detalle del Evento** (sección de datos y QR): el QR siempre con link (D83), "qué pasa después" de cada acción, cuatro estados.

---

## Phase 4: User Story 7 — Cancelar, reactivar o eliminar un Evento (P3) — lote A

- [ ] T036 [US7] En `eventos-gestion.service.ts`/`.controller.ts`: `POST /eventos/:id/cancelar` (suceso `evento_cancelado`, FR-040), `/reactivar` (FR-041, `EVENTO_YA_PASO`), `/eliminar` (solo sin Inscripciones, `EVENTO_CON_INSCRIPCIONES`, D119 — FR-042), `GET /eventos/papelera`, `/restaurar`. Todas las consultas normales filtran `eliminadoEn` (FR-043).
- [ ] T037 [P] [US7] Integración en `apps/api/test/integration/eventos-ciclo.integration-spec.ts`: cancelar conserva las Inscripciones, impide inscribirse y promover, y emite `evento_cancelado` con destinatario `inscriptos_evento`; reactivar; reactivar uno pasado falla; eliminar con una Inscripción cancelada igual falla; eliminar sin inscripciones → no aparece en `GET /eventos` ni en los públicos (404); restaurar (FR-040–FR-043).
- [ ] T038 [US7] UI: diálogos en `datos-evento.tsx` — cancelar (nombra el Evento y la cantidad de inscriptos), eliminar (`ConfirmDestructiveDialog`; deshabilitado y explicado con inscripciones, ofreciendo cancelar); pantalla `apps/backoffice/src/app/eventos/papelera/page.tsx` (+ `loading.tsx`, `error.tsx`) con "Restaurar", patrón de `sedes/papelera`.
- [ ] T039 [US7] E2E `apps/backoffice/e2e/eventos-ciclo.spec.ts` con axe: cancelar y ver "Cancelado" en la página pública; reactivar; eliminar uno sin inscripciones y restaurarlo desde la papelera; "Eliminar" deshabilitado con explicación en uno con inscripciones (FR-040–FR-043).
- [ ] T040 [US7] Checklist de `docs/15` sobre **la papelera de Eventos** y sobre **los diálogos de cancelar y eliminar** (D151: cancelar el Evento es reversible → no rojo; eliminar → destructivo con ícono).

---

## Phase 5: User Story 8 — Evento de bautismo (P2) — lote A (API y formulario) + lote B (página pública)

- [ ] T041 [US8] En `eventos-gestion.service.ts`: con `tipo = bautismo`, forzar la configuración de FR-045 (o rechazar con `CONFIG_BAUTISMO_INVALIDA` si el cuerpo trae otra); `GET /eventos/bautismo/proximos` (FR-048).
- [ ] T042 [P] [US8] Integración en `apps/api/test/integration/eventos-bautismo.integration-spec.ts`: crear con costo o lista → error; `próximos` trae solo bautismos publicados futuros; cambiar el tipo con inscripciones → `EVENTO_CON_INSCRIPCIONES` (FR-014, FR-045, FR-048). (La auto-inscripción rechazada y la inscripción del Admin se prueban en T050 y T079.)

---

## Phase 6: User Story 1 — Ver la cartelera y la página de un Evento (P1) 🎯 MVP — lote B

- [ ] T043 [US1] Implementar `apps/api/src/evento/eventos-publicos.service.ts`/`.controller.ts`: `GET /eventos/publicos` y `GET /eventos/publicos/:slug` (`contracts/eventos-api.md`): cartelera solo publicados futuros no eliminados, orden por inicio, paginada; página por slug incluye cancelados y pasados; eliminado → 404; nunca inscriptos; `lugar` resuelto con la Sede (FR-001, FR-002, FR-005, FR-043, FR-046).
- [ ] T044 [P] [US1] Integración en `apps/api/test/integration/eventos-publicos.integration-spec.ts`: qué entra y qué no a la cartelera; orden; slug de un cancelado y de un pasado responde con su estado; eliminado 404; la respuesta no tiene ningún campo de Persona (FR-001, FR-002, FR-005, FR-043, FR-046).
- [ ] T045 [US1] Pantallas públicas: `apps/web/src/app/(publica)/eventos/page.tsx` (reemplaza el placeholder; + `loading.tsx`, `error.tsx`; `revalidate = 60`; `TarjetaEvento`; estado vacío con enlace a "Seguinos"; `Paginacion`) y `apps/web/src/app/(publica)/eventos/[slug]/page.tsx` (+ `loading.tsx`, `not-found.tsx`; `generateMetadata` con Open Graph y flyer o imagen por defecto; JSON-LD `Event` con `eventStatus`; info clave como texto; flyer con `alt`; estados "Cancelado" / "Ya pasó"; en bautismo, texto y enlace a Mi camino sin "Anotarme" — FR-002–FR-006, FR-046). Miga de pan (`docs/15`).
- [ ] T046 [US1] `apps/web/src/app/sitemap.ts` suma los Eventos publicados no eliminados; el Inicio público (`apps/web/src/app/(publica)/page.tsx`) muestra los próximos tres con `TarjetaEvento` en lugar de la tarjeta estática, con estado vacío (FR-001, FR-006).
- [ ] T047 [US1] E2E `apps/web/e2e/eventos-publico.spec.ts` (`@celular`) con axe en claro y oscuro: cartelera con Eventos fixture en orden; página con fecha, lugar, costo y cupo como texto y `alt` en el flyer; informativo sin "Anotarme"; cancelado y pasado; bautismo sin "Anotarme" y con enlace a Mi camino; eliminado → 404; `og:title` y JSON-LD presentes; sitemap con el slug (FR-001–FR-006, FR-043, FR-046, SC-006).
- [ ] T048 [US1] Checklist de `docs/15` sobre **la cartelera pública** (cuatro estados, estado vacío amable, celular a 360 px, contraste en los dos temas).
- [ ] T049 [US1] Checklist de `docs/15` sobre **la página pública del Evento** (información como texto, flyer con `alt`, estado con texto + ícono, botón deshabilitado explicado, "qué pasa después").
- [ ] T049a [US1] Checklist de `docs/15` sobre **el Inicio público** con los próximos Eventos (pantalla modificada).

---

## Phase 7: User Story 3 — Anotarme a un Evento (P1) 🎯 MVP — lote B

- [ ] T050 [US3] Implementar `apps/api/src/evento/inscripcion-propia.service.ts`/`.controller.ts`: `POST /eventos/:id/inscripciones/me` (con `conBloqueoDeEvento` + `decidirEstadoInicial`; Persona `activa`; `EVENTO_YA_EMPEZO`, `EVENTO_CANCELADO`, `EVENTO_NO_ADMITE_INSCRIPCION`, `EVENTO_SOLO_INSCRIBE_ADMIN`, `INSCRIPCION_EVENTO_YA_ABIERTA` incluida la violación del índice; suceso `inscripcion_creada`) y `GET /eventos/:id/mi-inscripcion` (FR-015–FR-017, FR-019, FR-021, FR-046, FR-051).
- [ ] T051 [P] [US3] Integración en `apps/api/test/integration/inscripcion-propia.integration-spec.ts`: confirmada / pendiente / lista de espera / `CUPO_LLENO`; ya empezó; cancelado; informativo; bautismo → 403; dos pedidos simultáneos de la misma Persona → una sola abierta (FR-021); Persona `pendiente_tutor` rechazada (FR-015); volver a anotarse después de cancelar crea una nueva al final de la lista; `mi-inscripcion` de otra Persona nunca se ve (FR-051).
- [ ] T052 [US3] Isla `apps/web/src/components/eventos/accion-inscripcion.tsx` en la página del Evento: sin sesión, "Anotarme" lleva al ingreso con `destino` (FR-020); con sesión, consulta `mi-inscripcion`: muestra su estado con `EstadoInscripcionBadge` o "Anotarme" → paso de confirmación → resultado con "qué sigue" (fecha, lugar, instrucciones de pago y "Subir comprobante" si hay costo; posición si queda en lista) (FR-015, FR-017, FR-019); con `?anotarme=1` abre la confirmación; botón deshabilitado y explicado si está lleno sin lista o cerrado (FR-004).
- [ ] T053 [US3] Volver al Evento (research #11): `apps/web/src/app/(publica)/ingresar/page.tsx` redirige a `destinoSeguro(destino)` si la Persona está `activa`; el `callbackUrl` del ingreso lleva el `destino`; el registro lo arrastra por sus pasos y `registro/listo` ofrece "Seguir con la inscripción". Si la 007 ya rehízo el ingreso, engancharlo ahí (T001) (FR-020).
- [ ] T054 [US3] E2E `apps/web/e2e/eventos-inscripcion.spec.ts` (`@celular`) con axe en claro y oscuro: tres Personas al Evento de cupo 2 con lista → dos confirmadas, la tercera "lugar 1 de la lista"; Evento con aprobación → pendiente con "te avisamos"; lleno sin lista → botón deshabilitado con explicación; sin sesión → ingresar → vuelve al Evento con la confirmación abierta (SC-001); `?destino=https://…` → `/inicio` (FR-015–FR-021).
- [ ] T055 [US3] Checklist de `docs/15` sobre **el paso de confirmación y el resultado de anotarse** (isla de la página del Evento): una acción principal, `useEnvio`, "qué pasa después", 44 px y 16 px (D150), lector de pantalla anuncia el resultado.

---

## Phase 8: User Story 4 — Mis eventos: seguir y cancelar mis inscripciones (P2) — lote C

- [ ] T056 [US4] Implementar `apps/api/src/evento/mis-eventos.service.ts`/`.controller.ts`: `GET /mis-inscripciones-evento?cuando=` (con `estadoPago`, `posicionEnLista`, motivo de rechazo o cancelación, Evento resumido) y `POST /inscripciones-evento/:id/cancelar` (propia, antes del inicio, `conBloqueoDeEvento`, `motivoCancelacion = persona`, `promoverDesdeLista`, sucesos) (FR-018, FR-022–FR-024, FR-051).
- [ ] T057 [P] [US4] Integración en `apps/api/test/integration/mis-eventos.integration-spec.ts`: listado propio con estado de pago y posición; cancelar confirmada con lista → promueve la primera (confirmada o pendiente según aprobación) y emite `inscripcion_promovida`; cancelar estando en lista → los de atrás suben y no hay promoción; cancelar después del inicio → `EVENTO_YA_EMPEZO`; cancelar una ajena → 404; cancelar una cancelada → `INSCRIPCION_NO_ABIERTA` (FR-018, FR-022–FR-024, FR-051).
- [ ] T058 [US4] Pantalla `apps/web/src/app/(app)/mis-eventos/page.tsx` (reemplaza el placeholder; + `loading.tsx` con esqueletos, `error.tsx` con "Reintentar"): "Mis inscripciones" (próximas primero, `EstadoInscripcionBadge`, "qué sigue" de `docs/15` por estado, mensaje amable en rechazada/cancelada con a quién consultar, acceso a las pasadas) y la cartelera de próximos con `TarjetaEvento`; estado vacío con "Ver eventos" (FR-023). Diálogo de cancelar neutro (D151) con "Sí, cancelar inscripción" / "No, mantenerla", y el aviso de devolución si tenía un pago verificado (FR-022).
- [ ] T059 [US4] E2E `apps/web/e2e/mis-eventos.spec.ts` (`@celular`) con axe en claro y oscuro: estados confirmada sin pago, pendiente y lista de espera con su texto; cancelar la confirmada → la de la lista pasa a confirmada (se verifica con su sesión); estado vacío (FR-018, FR-022–FR-024).
- [ ] T060 [US4] Checklist de `docs/15` sobre **Mis eventos** (`/mis-eventos`): cuatro estados, una acción principal por tarjeta de contorno (botón de lista), qué pasa después, celular a 360 px con D150, contraste en los dos temas.
- [ ] T061 [US4] Checklist de `docs/15` sobre **el diálogo de cancelar inscripción** (neutro D151, textos sin "Cancelar" genérico, foco al abrir y al cerrar).

---

## Phase 9: User Story 5 — Pagar: subir el comprobante y que el Admin lo verifique (P2) — lote C (Persona) + lote D (Admin)

### Persona — lote C

- [ ] T062 [US5] Implementar `apps/api/src/evento/pagos-persona.service.ts`/`.controller.ts`: `POST /inscripciones-evento/:id/pagos` (multipart; Inscripción propia `confirmada` en Evento con costo; `comprobante.ts`; área `comprobantes`; `PAGO_PENDIENTE_EXISTENTE` incluida la violación del índice; suceso `pago_registrado`) y `GET /pagos/:id/comprobante` (dueña o `pagos.verificar`, si no 404; cabeceras de `contracts/pagos-api.md`) (FR-030–FR-032, FR-051).
- [ ] T063 [P] [US5] Integración en `apps/api/test/integration/pagos-persona.integration-spec.ts`: registrar con cada medio; sin comprobante → error de campo; Inscripción pendiente o en lista → `INSCRIPCION_NO_CONFIRMADA`; Evento sin costo → `EVENTO_SIN_COSTO`; con el Evento ya empezado se permite; segundo pendiente → `PAGO_PENDIENTE_EXISTENTE`; la Inscripción sigue confirmada (D148, FR-030); **comprobante: la dueña lo ve, otra Persona 404, sin sesión 401, el Admin lo ve, el Pastor 404** (FR-032, SC-005).
- [ ] T064 [US5] `apps/web/src/app/api/comprobantes/[pagoId]/route.ts` (reenvía el stream con la sesión) y `apps/web/src/components/eventos/dialogo-comprobante.tsx` desde Mis eventos y desde el resultado de anotarse: instrucciones de pago del Evento, monto (por defecto el costo), medio, fecha, `CampoArchivo` con los tipos permitidos; errores por campo; al enviar, "Recibimos tu comprobante. El equipo lo revisa y te avisamos" (FR-024, FR-030, FR-031).
- [ ] T065 [US5] E2E `apps/web/e2e/pago-comprobante.spec.ts` (`@celular`) con axe en claro y oscuro: subir un PDF y ver "Pago en revisión"; un archivo no permitido muestra el error en el campo; el formulario se completa **solo con teclado** (FR-030, FR-031, `docs/13`).
- [ ] T066 [US5] Checklist de `docs/15` sobre **el diálogo de subir comprobante** (una acción principal "Enviar comprobante", ayuda con tipos y tamaño, error que dice cómo corregir, lector de pantalla, D150).

### Admin — lote D

- [ ] T067 [US5] Implementar `apps/api/src/evento/pagos-admin.service.ts`/`.controller.ts`: `GET /pagos`, `POST /pagos/:id/verificar` (FR-033), `POST /pagos/:id/rechazar` con motivo obligatorio → en una transacción con `conBloqueoDeEvento`: Pago `rechazado`, Inscripción `cancelada (pago_rechazado)`, `promoverDesdeLista` (FR-035, D148), y `POST /inscripciones-evento/:id/pagos/en-nombre` (nace `verificado`, comprobante opcional — FR-036). Completar la fuente `pago` de la bandeja (T020).
- [ ] T068 [P] [US5] Integración en `apps/api/test/integration/pagos-admin.integration-spec.ts`: verificar registra quién y cuándo y emite `pago_verificado`; rechazar sin motivo → error de campo; rechazar cancela la Inscripción, libera el lugar y promueve a la primera de la lista (SC-004) con los sucesos `pago_rechazado` e `inscripcion_promovida`; resolver uno ya resuelto → `PAGO_NO_PENDIENTE`; en nombre sin comprobante queda verificado con `creadoPorId` del Admin; la fuente `pago` de la bandeja lista los pendientes (FR-033–FR-036).
- [ ] T069 [US5] UI backoffice: en `apps/backoffice/src/app/solicitudes/` las filas de tipo "Pago" (Persona, Evento, monto, fecha) con su detalle en panel (`Sheet`): visor del comprobante (imagen inline o PDF embebido con "Descargar", vía `apps/backoffice/src/app/api/comprobantes/[pagoId]/route.ts`), "Verificar pago" (principal) y "Rechazar pago" con motivo obligatorio y confirmación que dice que se libera el lugar (FR-032–FR-035). En el detalle del Evento, "Registrar pago" en nombre (FR-036) mostrando a nombre de quién se actúa.
- [ ] T070 [US5] E2E `apps/backoffice/e2e/pagos.spec.ts` con axe en claro y oscuro: con el comprobante subido por T065 (o sembrado), filtrar "Pago" en la bandeja, ver el comprobante, verificar; con otro, rechazar con motivo y comprobar en el detalle del Evento que la Inscripción quedó cancelada y la primera de la lista confirmada; registrar un pago en efectivo en nombre de la Persona sin acceso (FR-032–FR-036).
- [ ] T071 [US5] Checklist de `docs/15` sobre **el panel de verificación de pago** en la bandeja (acción principal "Verificar pago", rechazo con motivo y consecuencia explicada, visor accesible).

---

## Phase 10: User Story 6 — Gestionar los inscriptos de un Evento (P2) — lote D

- [ ] T072 [US6] Implementar `apps/api/src/evento/inscriptos.service.ts`/`.controller.ts`: `GET /eventos/:id/inscripciones` (por estado, lista en orden, `estadoPago`, `diasSinPago`, `promovidaSinVer` — FR-025), `POST /eventos/:id/inscripciones` en nombre (FR-027, FR-047), `/aprobar`, `/rechazar` (promueve), `/aprobar-lote` (cada una en su transacción, resumen — FR-026), `/dar-de-baja` (promueve — FR-027), `/promocion-vista`, `GET /personas/:id/inscripciones-evento` (FR-048). Completar la fuente `inscripcion_evento` de la bandeja (T020).
- [ ] T073 [P] [US6] Integración en `apps/api/test/integration/inscriptos.integration-spec.ts`: aprobar/rechazar y sus sucesos; rechazar libera y promueve; lote con una ya resuelta → `{ aprobadas: 2, fallidas: [INSCRIPCION_NO_PENDIENTE] }`; inscribir en nombre aplica cupo/lista/aprobación y guarda `creadoPorId`, emite `inscripcion_creada` con `enNombreDeOtro`; inscribir a una Persona no `activa` → `PERSONA_NO_ACTIVA`; dar de baja después del inicio está permitido para el Admin (Edge Cases) y promueve solo antes del inicio; `diasSinPago` y `promovidaSinVer` correctos; la fuente `inscripcion_evento` lista las pendientes; `GET /personas/:id/inscripciones-evento` exige `eventos.ver` (FR-025–FR-027, FR-048, FR-051).
- [ ] T074 [US6] UI `apps/backoffice/src/app/eventos/[id]/inscriptos-evento.tsx`: pestañas por estado con totales (ocupados/cupo, en espera), `TablaDatos` paginada con `EstadoInscripcionBadge` de inscripción y pago, "falta el pago, hace N días", marca "Subió desde la lista de espera" con "Ya le avisé" (FR-025); selección y "Aprobar seleccionadas" con resumen del lote (`docs/16`); "Rechazar" con motivo opcional; "Dar de baja" (confirmación neutra); "Anotar a una Persona" con el buscador de Personas existente (`personas.buscar`) y el nombre visible durante toda la acción (FR-026, FR-027, `docs/15` §Backoffice). El Pastor ve todo sin acciones (FR-009).
- [ ] T075 [US6] Bandeja: en `apps/backoffice/src/app/solicitudes/` mostrar el filtro por tipo (ya hay más de uno) y las filas "Inscripción a Evento" que llevan al detalle del Evento en la pestaña de pendientes (FR-034). Inicio del backoffice: en `PendientesAdminService` y la tarjeta de `apps/backoffice/src/app/page.tsx`, "Inscripciones a Eventos por aprobar" y "Pagos por verificar" con su enlace (FR-034).
- [ ] T076 [P] [US6] Extender el test de integración de `PendientesAdminService` con los dos contadores nuevos (FR-034).
- [ ] T077 [US6] E2E `apps/backoffice/e2e/eventos-inscriptos.spec.ts` con axe en claro y oscuro: aprobar dos en lote y ver el resumen con una fallida (otra pestaña la rechazó antes); rechazar una y ver la promoción; anotar a la Persona sin acceso con el aviso "Estás anotando a …"; dar de baja una confirmada con lista; la bandeja muestra el filtro por tipo y las pendientes; el Inicio cuenta pendientes y pagos (FR-025–FR-027, FR-034).
- [ ] T078 [US6] Checklist de `docs/15` sobre **la sección de inscriptos del detalle del Evento** (acciones en lote con resumen, botones de contorno por fila, celular sin scroll horizontal, "en nombre de" visible).
- [ ] T078a [US6] Checklist de `docs/15` sobre **la bandeja de Solicitudes** (pantalla modificada: filtro por tipo visible, filas de los tipos nuevos).
- [ ] T078b [US6] Checklist de `docs/15` sobre **el Inicio del backoffice** (pantalla modificada: contadores nuevos con texto + ícono y enlace).
- [ ] T079 [US8] Integración en `apps/api/test/integration/inscriptos-bautismo.integration-spec.ts`: el Admin inscribe a una Persona a un Evento de bautismo → `confirmada`; lleno → `CUPO_LLENO` (sin lista); aparece en `GET /personas/:id/inscripciones-evento` y en `GET /mis-inscripciones-evento` de esa Persona (FR-047, FR-048).

---

## Phase 11: Recordatorios para la 012 — lote D

- [ ] T080 Implementar `apps/api/src/evento/eventos-consultas.service.ts`: `destinatariosEventoProximo(eventoId)` y `eventosParaRecordatorioInscripcion(hoy)` (`contracts/eventos-dominio.md`). Integración en `apps/api/test/integration/eventos-consultas.integration-spec.ts`: solo confirmadas; excluye cancelados, eliminados y bautismos para el recordatorio a todos; el día exacto en zona AR; con cupo completo no se recuerda (FR-050).

---

## Phase 12: Polish & Cross-Cutting — **lote E** (una sola sesión, al final)

- [ ] T081 Ampliar `apps/api/prisma/seed-demo.ts` con los escenarios de research #17 (D99, D120), incluidos los datos hostiles, con flyers de prueba de `specs/revision-manual/imagenes-de-prueba/` si sirven o generados con `sharp`.
- [ ] T082 E2E del flujo crítico completo `apps/web/e2e/eventos-flujo-critico.spec.ts` (`@celular`, cruzando backoffice por API o helpers): Admin crea Evento con cupo 1, lista y costo → Persona A se anota → Persona B queda en lista → A cancela → B confirmada → B sube comprobante → Admin verifica → B ve "Pago verificado"; axe en claro y oscuro en cada pantalla de la Persona (SC-007, SC-006).
- [ ] T083 Medir SC-002 a mano con la quickstart (escenario 4) y anotar el tiempo en el PR; recorrer `quickstart.md` completa.
- [ ] T084 Correr las tres suites en verde: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`, y los e2e de `apps/web` (incluido `celular`) y `apps/backoffice` (CLAUDE.md, Governance). Lint y typecheck de las cinco piezas.
- [ ] T085 Preparar (sin aplicar en la rama si hay otras specs abiertas) los "Cambios a docs al mergear" de `plan.md` y la numeración de D188–D196 (la DN-9 de esta spec quedó unificada en D178, con la precisión D196), para aplicarlos en el merge.

---

## Dependencies & Execution Order

- **Phase 1–2 (lote 0)** bloquea todo.
- **US2** (lote A) no depende de ninguna historia; las demás usan Eventos fixture (T011), así que **no esperan a A**.
- **US1** y **US3** (lote B) solo necesitan el lote 0.
- **US4** y la parte Persona de **US5** (lote C) necesitan Inscripciones: las arma `eventos-fixtures.ts` por Prisma o el helper e2e, sin esperar a B.
- La parte Admin de **US5** y **US6** (lote D) usan Pagos e Inscripciones fixture; T070 puede reutilizar el comprobante de T065 si C mergeó antes, si no lo siembra.
- **US7** y **US8** van con A (mismo servicio); la página pública del bautismo (FR-046) está en T045 (B).
- **T080** solo necesita el lote 0.
- **Lote E** va último.

## Lotes (sesiones en paralelo que no se pisan)

**Lote 0 — primero y solo:** T001–T025. Todo `packages/shared-types`, `packages/ui`, `schema.prisma`
y su migración, los scripts de e2e, `motor-cupo.ts`, `sucesos.service.ts`, `comprobante.ts`,
`slug.ts`, `storage/` (con el ajuste de `libro.service.ts`), `evento.module.ts` con los archivos
vacíos, `solicitudes/bandeja.service.ts`, `sede.service.ts`, `tarjeta-evento.tsx`, el esqueleto de
`eventos/[id]/page.tsx`, `nav.ts`, la estructura de los `es.json` y `apps/web/playwright.config.ts`.

Después, **cuatro sesiones en paralelo**, cada una solo en sus archivos y su namespace:

| Lote | Tareas | Archivos propios |
|---|---|---|
| **A — Gestión de Eventos** | T026–T042 | `evento/eventos-gestion.*`, `evento/dto/` (los de gestión), `apps/backoffice/src/app/eventos/page.tsx`, `formulario-evento.tsx`, `[id]/datos-evento.tsx`, `[id]/qr.png/`, `papelera/`, `apps/backoffice/package.json` (`qrcode`), sus tests, namespace `eventos.gestion` |
| **B — Público e inscripción** | T043–T055 | `evento/eventos-publicos.*`, `evento/inscripcion-propia.*`, `apps/web/src/app/(publica)/eventos/`, `(publica)/page.tsx`, `(publica)/ingresar/`, `(publica)/registro/` (solo el `destino`), `sitemap.ts`, `components/eventos/accion-inscripcion.tsx`, sus tests, namespaces `eventos.publico` y `eventos.inscripcion` |
| **C — Mis eventos y pago de la Persona** | T056–T066 | `evento/mis-eventos.*`, `evento/pagos-persona.*`, `apps/web/src/app/(app)/mis-eventos/`, `apps/web/src/app/api/comprobantes/`, `components/eventos/dialogo-comprobante.tsx`, sus tests, namespace `misEventos` |
| **D — Inscriptos, verificación y bandeja** | T067–T080 | `evento/inscriptos.*`, `evento/pagos-admin.*`, `evento/eventos-consultas.service.ts`, las fuentes de `solicitudes/`, `discipulado/pendientes-admin.service.ts`, `apps/backoffice/src/app/eventos/[id]/inscriptos-evento.tsx`, `apps/backoffice/src/app/solicitudes/`, `apps/backoffice/src/app/api/comprobantes/`, `apps/backoffice/src/app/page.tsx`, sus tests, namespaces `eventos.inscriptos`, `eventos.pagos`, `solicitudes.tipos`, `inicio.pendientes.eventos` |

- **Cruces resueltos así**: el diálogo de comprobante (C) se abre también desde el resultado de
  anotarse (B): B deja el botón "Subir comprobante" como enlace a `/mis-eventos?pagar={id}` y C
  abre el diálogo con ese parámetro — nadie importa el componente del otro. El detalle del Evento
  del backoffice está partido en dos archivos desde el lote 0 (A y D). "Registrar pago en nombre"
  (T069) vive en `inscriptos-evento.tsx` (D), no en `datos-evento.tsx` (A).
- **Lote E — al final, una sesión:** T081–T085.

## Implementation Strategy

- **MVP = lote 0 + US2 + US1 + US3**: el Admin carga Eventos con QR, la cartelera y la página
  pública funcionan, y la gente se anota con cupo y lista de espera. Con eso el Google Form del
  culto ya no hace falta.
- Después, por valor: US4 (liberar lugar es lo que hace funcionar la lista), US5 (campamentos con
  costo), US6 (eventos con aprobación y personas sin app), US8 (lo pide la 010), US7.
- Cada lote cierra con sus tests en verde y un commit por cambio coherente, en español. Sin push
  salvo pedido.

## Cobertura: cada requisito y criterio con su test

| Requisito / criterio | Tareas de test |
|---|---|
| FR-001 | T044, T047 |
| FR-002, FR-003 | T003, T044, T047 |
| FR-004 | T003, T047, T054 |
| FR-005 | T003, T044, T047 |
| FR-006 | T047 |
| FR-009 | T007, T028, T032 |
| FR-010 | T028, T032 |
| FR-011 | T017, T028, T032 |
| FR-012 | T028, T032 |
| FR-013 | T032 |
| FR-014 | T010, T028, T042 |
| FR-015 | T013, T051, T054 |
| FR-016 / SC-003 | T013 |
| FR-017 | T013, T051, T054 |
| FR-018 / SC-004 | T013, T028, T057, T068, T073 |
| FR-019 | T051, T054 |
| FR-020 | T005, T054 |
| FR-021 | T010, T051 |
| FR-022 | T057, T059 |
| FR-023 | T059 |
| FR-024 | T003, T057, T059 |
| FR-025 | T073, T077 |
| FR-026 | T073, T077 |
| FR-027 | T073, T077 |
| FR-030 | T010, T063, T065 |
| FR-031 | T016, T021, T065 |
| FR-032 / SC-005 | T015, T063, T070 |
| FR-033, FR-034 | T020, T068, T076, T077, T070 |
| FR-035 | T068, T070 |
| FR-036 | T068, T070 |
| FR-040 – FR-043 | T037, T039, T044 |
| FR-045 | T010, T042 |
| FR-046 | T003, T044, T047, T051 |
| FR-047, FR-048 | T042, T073, T079 |
| FR-050 | T014, T028, T037, T080 |
| FR-051 | T019, T051, T057, T063, T073 |
| SC-001 | T054 |
| SC-002 | T083 (medición manual) |
| SC-006 | T047, T082 |
| SC-007 | T082 |
