# Tasks: Backoffice del Admin — bandeja unificada, perfil de Persona, catálogos y métricas

**Input**: `/specs/013-backoffice-admin/` — spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: los pide la Constitución (Principio VI) y esta corrida: **cada criterio tiene su test**. Cada tarea de test
nombra los escenarios (`H1.3` = Historia 1, escenario 3) o requisitos que cubre. La tabla "Cobertura" al final
verifica que no quede ninguno sin test.

**Organización**: por **lotes** que se implementan en sesiones paralelas sin pisarse (plan.md → Paralelización). El
Lote 0 es secuencial y bloquea todo. Cada pantalla nueva o modificada tiene su tarea de checklist de
`docs/15-guia-ux-ui.md` (D114), marcada **[CHECKLIST]**.

**Convenciones que valen para todas las tareas** (no se repiten):
- Permisos solo con `@RequierePermiso` / `requerirPermiso` contra `CATALOGO_PERMISOS` (D132). Nunca un rol literal.
- Errores en Problem Details con `code` de `error-code.ts`; los de campo bajo `VALIDACION` con
  `errors: [{ campo, code }]` (H-50).
- Prisma con `select` explícito; listados paginados con `Pagina<T>`; paginado/búsqueda/orden en la API y en la URL
  (`?pagina=` 1-based, redirect si es inválido) — `docs/15`, listados.
- Textos por `next-intl` en rioplatense con voseo (D84). Colores solo de tokens (D118). Estados en texto + ícono (D81).
- Botones de acción con `Button` + `useEnvio` (H-57); validación con `useValidacionCampos` + `ResumenErrores` (H-50).
- En Next, "cargando" es `loading.tsx` y "error" es `error.tsx`; los bloques del Inicio usan `Suspense` + un
  error boundary por bloque.
- Confirmaciones de acciones reversibles neutras, no rojas (D151); la reforzada de D38 escribe el nombre.
- **Celular (D150)**: las pantallas marcadas `@celular` se diseñan a 360 px primero, con 16 px en etiquetas, botones y
  ayudas (14 px solo metadatos) y áreas táctiles de 44 px; sus e2e corren también en el proyecto `celular`.
- Commits en español, uno por cambio coherente, con el pie de `CLAUDE.md`. Un test que rompe por un cambio de modelo se
  arregla en el mismo commit.

Formato: `- [ ] T### [P] [Lote] Descripción — cubre: …`. `[P]` = paralelizable dentro de su lote.

---

## Lote 0 — Compartido (secuencial, bloquea todos los demás)

- [x] T000 **[Lote 0 global: preguntas respondidas (7/10); la Pregunta 3 cambió a D214 (`congregaDesde`)]** [L0] **Compuerta**: no arrancar `/speckit-implement` sin las respuestas de Echu a las cinco "Preguntas para
  Echu" de la spec (Principio I). Si alguna respuesta difiere de la recomendación aplicada, actualizar spec, plan y
  tasks antes de seguir (ej. si la Pregunta 1 dice que "Contanos" va en otra spec, se saca el Lote 5). — cubre:
  Principio I

- [x] T001 **[Lote 0 global: D178 y D207–D213 numeradas; las siete ramas de la vista ya están (D178)]** [L0] Verificar `main` actualizado, que `.specify/feature.json` apunta a `specs/013-backoffice-admin`, y qué
  specs de 006–011 ya están mergeadas: anotar en el PR de implementación qué ramas de la vista y qué secciones del
  perfil se conectan en esta corrida (plan.md → Dependencias). Mirar el último número de `docs/05` antes de numerar
  D178 y D207–D213 (la DN-1 de esta spec quedó unificada en D178, con la precisión D207) (D89, D103). — cubre: plan
- [x] T002 **[Lote 0 global: con los siete tipos; `discipulado.ts` lo importa de `bandeja.ts`]** [L0] `packages/shared-types/src/bandeja.ts`: `TipoSolicitud` (movido desde `discipulado.ts`, que lo
  reexporta), `TIPOS_SOLICITUD`, `ESTADOS_POR_TIPO`, `ESTADOS_ABIERTOS`, `esAbierta`, `FiltroAbiertas`, `OrdenBandeja`
  (`espera|fecha|persona`), `SolicitudBandeja`, `ConteoAbiertas`, `BANDEJA_PAGINA = 20` (`contracts/bandeja-api.md`).
  Exportar desde `index.ts`. — cubre: FR-001–FR-003, FR-007
- [x] T003 **[Lote 0 global: en `lote-0-global.spec.ts` (abiertas de cada tipo ⊂ sus estados, D186, D196); los casos por estado de discipulado → lote 1]** [P] [L0] Unit `apps/api/test/unit/es-abierta.spec.ts`: para `discipulado`, `pendiente` y `propuesta` →
  abierta; `aprobada`, `rechazada`, `retirada` → resuelta; un estado desconocido → error de tipo/`false`. — cubre: FR-003
- [x] T004 **[Lote 0 global: `iniciales`; lote 2: el resto, `INVERSO_RELACION` movido; `RelacionDesde` = qué es el familiar para la Persona del perfil]** [L0] `packages/shared-types/src/perfil-persona.ts`: `PerfilPersona`, `RelacionFamiliarVista`,
  `RelacionDesde`, `GrupoEnPerfil`, `relacionDesde(tipo, lado)`, `INVERSO_RELACION` **movido** desde
  `apps/api/src/persona/persona.service.ts` (que pasa a importarlo), `iniciales(nombre, apellido)`. — cubre: FR-011,
  FR-014, research #6
- [x] T005 **[Lote 2]** [P] [L0] Unit `apps/api/test/unit/relacion-desde.spec.ts`: cada tipo desde los dos lados (`tutor` →
  "tutor de"/"a cargo de", `hijo_a` ↔ `padre_madre`, `conyuge` y `hermano_a` simétricas); `iniciales` con tildes,
  apellidos compuestos y nombre vacío. Y que el test existente de duplicado espejo de `persona.service` siga verde. —
  cubre: FR-014, H2.5
- [x] T006 **[Lote 4: también `cumpleanosEsteAnio`, `festejoEnAnio`, `sumarDias`]** [P] [L0] `packages/shared-types/src/cumpleanos.ts`: `Cumpleanero`, `proximoCumpleanos(fechaNacimiento,
  hoy)` → `{ fecha, dia, cumple, esHoy }`, `CUMPLEANOS_DIAS_SEMANA = 7`, `CUMPLEANOS_PAGINA = 50`; reusa
  `hoyEnArgentina` (no otra implementación). — cubre: FR-030–FR-033
- [x] T007 **[Lote 4]** [P] [L0] Unit `apps/api/test/unit/proximo-cumpleanos.spec.ts`: hoy es el cumpleaños (`esHoy`, `cumple`
  correcto); mañana; 29/2 en año bisiesto (29) y no bisiesto (28); 31/12 con hoy 28/12 (cruza año); `hoy` calculado a
  las 02:30 UTC del día 7 da el 6 en Argentina. — cubre: H4.1, H4.2, H4.3, FR-032, FR-033
- [x] T008 **[Lote 0 global: `Metricas`, constantes de comentarios y `CURSOS_RECONOCIDOS`; lote 6: `CursoListado`/`CursoDetalle` y demás; los tipos de comentarios → lote 5]** [P] [L0] `packages/shared-types/src/metricas.ts` (`Metricas`; `RangoCongregacion`/`ORDEN_RANGO_CONGREGACION`/`rangoCongregacion` ya en `persona.ts`, D214),
  `comentario.ts` (tipos de `contracts/comentarios-api.md`, `COMENTARIO_TEXTO_MAX = 2000`,
  `COMENTARIOS_POR_HORA_SIN_SESION = 5`, `COMENTARIOS_POR_HORA_CON_SESION = 20`), `curso.ts` (`CursoListado`,
  `CursoDetalle`, `CURSOS_RECONOCIDOS` con las dos combinaciones de Vida Nueva, `CURSO_DESCRIPCION_MAX = 500`). —
  cubre: FR-022–FR-024, FR-041, FR-043, FR-052, FR-056
- [x] T009 **[Lote 0 global: hecho, test en `lote-0-global.spec.ts`]** [L0] `permisos.ts`: `comentarios.ver` [admin, pastor], `comentarios.gestionar` [admin], `cursos.gestionar`
  [admin], `cursos.papelera.ver` [admin], `personas.editar` [admin]. `error-code.ts`: `CURSO_INACTIVO`,
  `CURSO_TIENE_GRUPOS`, `CURSO_NO_RECONOCIDO`, `CURSO_YA_EXISTE` (y `DEMASIADOS_PEDIDOS` si la 007 no lo trajo
  todavía — una sola definición). Los códigos de campo nuevos (`TEXTO_INVALIDO`, `CONTACTO_INVALIDO`) no van al
  catálogo. Extender el test existente del catálogo de permisos para que el
  Pastor no tenga ningún `.gestionar`/`.editar` nuevo. — cubre: FR-061, SC-008
- [x] T010 **[Lote 0 global: en la migración única `20261008120000_lote_0_global` (CHECK, índice `personas_mes_nacimiento_idx` y la vista con las siete ramas)]** [L0] Prisma (`data-model.md`): `ComentarioApp` + `TipoComentario` + `AppOrigen` (o el de la 007),
  `Curso.descripcion/eliminadoEn/eliminadoPor`; migración con los CHECK de §1. Migración aparte `--create-only` con el
  índice de expresión de cumpleaños (§4) y la vista `solicitudes_bandeja` desde
  `apps/api/prisma/vistas/solicitudes_bandeja.sql` con la rama de Discipulado (§3). Comentario en `schema.prisma` junto a
  `fechaNacimiento` y en el modelo `SolicitudDiscipulado` apuntando a la vista. — cubre: FR-001, FR-025, FR-030,
  FR-040–FR-047, FR-051–FR-056
- [x] T011 **[Lote 1: `bandeja-vista.integration-spec.ts`, un registro por tipo y estado de los siete tipos]** **[Lote 0 global: coherencia sobre las filas existentes en `lote-0-global.integration-spec.ts`; el test exhaustivo (un registro por tipo y estado) → lote 1]** [L0] Integración `apps/api/test/integration/bandeja-vista.integration-spec.ts` (**test de coherencia**,
  research #3): por cada tipo de `TIPOS_SOLICITUD` y cada estado de `ESTADOS_POR_TIPO`, insertar un registro y verificar
  que la vista lo devuelve con `abierta === esAbierta(tipo, estado)` y `esperaDesde` correcto (Discipulado con propuesta
  vigente → `propuestaEn`). — cubre: FR-003, FR-007, SC-002
- [x] T012 **[Lote 2 `AvatarPersona`, lote 3 `BarraProporcion`, con tests en `packages/ui/test`]** [P] [L0] `packages/ui`: `AvatarPersona` (foto con `alt="Foto de <nombre>"`, `onError` → iniciales; iniciales
  sobre `--secondary`/`--secondary-foreground` con contraste medido en los dos temas, D118, `docs/17`), `BarraProporcion`
  (barra horizontal `aria-hidden`, ancho %, token `--primary`, sin animación con `prefers-reduced-motion`). Exportar. —
  cubre: FR-011, FR-018, FR-023, H2.1
- [X] T013 **[Lote 0 global: → lote 5; hecho en el lote 5, con `textosFormularioComentario` para que las dos apps armen los textos igual]** [P] [L0] `packages/ui`: `FormularioComentario` (research #11) — tipo (radio con texto), texto con contador,
  "Pueden contactarme" que, sin sesión, despliega email/teléfono (`CampoTelefono`), errores por campo con
  `ResumenErrores`, `useEnvio`; recibe `enviar(datos)`, `conSesion`, `paginaOrigen`; estado de confirmación con "qué
  pasa después"; le pasa `navigator.userAgent` a `resumirNavegador` y toma `ultimoRequestId()` (T017). Va en
  `packages/ui/src/components/`. Sin conectar a ninguna app todavía. — cubre: FR-041, FR-042, FR-045
- [ ] T014 **[Lote 0 global: → cada lote, en el bloque de la 013 en `nav.ts`; lote 2: `/personas/[id]` (el smoke de axe lo abre con una Persona real); lote 5: `/comentarios` y `/comentarios/[id]`; `solicitudes.ts` ya estaba]** [L0] `apps/backoffice/src/config/nav.ts`: rutas nuevas (`/personas/[id]`, `/personas/[id]/editar`,
  `/cumpleanos`, `/comentarios`, `/comentarios/[id]`, `/cursos`, `/cursos/[id]`, `/cursos/papelera`) con su permiso y
  `enMenu: false`; `/sedes` pasa a `enMenu: false`; `aria-current` en Catálogos para `/sedes*` y `/cursos*` (research
  #13). `apps/backoffice/src/config/solicitudes.ts`: `RUTA_DETALLE_SOLICITUD` e `ICONO_TIPO_SOLICITUD` con
  `discipulado`. Ajustar `axe-todas-las-rutas.spec.ts` y `enlaces-alcanzables.ts` para que recorran las rutas nuevas
  con ids del seed de e2e. — cubre: FR-006, FR-060
- [x] T015 **[Lote 0 global: namespaces vacíos creados]** [L0] Mensajes: namespaces vacíos con las claves base en `apps/backoffice/src/messages/es.json` (`bandeja`,
  `perfil`, `inicio`, `metricas`, `cumpleanos`, `comentarios`, `cursos`, `catalogos`) y `apps/web/src/messages/es.json`
  (`comentarios`), incluidos tipos y estados de Discipulado para la bandeja. — cubre: FR-064

- [x] T016 **[Lote 1: Solicitudes de Discipulado; lote 2: `PERSONA_LISTADO_SELECT` y `PersonaListado`. Los `PersonaBreve` de Grupos quedan sin foto: los Grupos no muestran avatar]** [L0] `PersonaBreve` suma `fotoUrl: string | null` (`discipulado.ts`); sumar `fotoUrl` a
  `PERSONA_LISTADO_SELECT` y a los `select` que arman `PersonaBreve` en la API (resúmenes de Solicitudes, Grupos);
  `PersonaListado` también. Actualizar en el mismo commit los tests que comparan objetos exactos. — cubre: FR-018,
  FR-011
- [X] T017 **[Lote 0 global: → lote 5; hecho en el lote 5]** [L0] `packages/shared-types`: `resumirNavegador(userAgent)` en `comentario.ts` y `ultimoRequestId()` en
  `api-client.ts` (`apiFetch` recuerda en memoria el `requestId` del último Problem Details). Unit
  `apps/api/test/unit/resumir-navegador.spec.ts` (Chrome Android, Safari iOS, Firefox escritorio, cadena vacía, user
  agent desconocido → "Otro") y `ultimo-request-id.spec.ts` (se actualiza con cada error, no con respuestas OK). —
  cubre: FR-042

**Checkpoint L0**: `pnpm --filter api run test` y `test:e2e` verdes, `packages/shared-types` reconstruido (H-33).

---

## Lote 1 — Bandeja unificada (Historia 1, P1)

- [x] T020 **[Lote 1: `BandejaController` + `ListarBandejaDto`; el registro es `RegistroFuentesSolicitudes` del lote 0 (no un token multi-provider)]** [L1] `apps/api/src/bandeja/`: `FuenteSolicitudes` + token `FUENTES_SOLICITUDES` (multi-provider);
  `BandejaService.listar(filtros)` sobre la vista con `$queryRaw` (ids + tipo, orden con desempate por `id`), hidrata
  por tipo preservando el orden; `conteoAbiertas()`. `BandejaController`: `GET /solicitudes` (se muda desde
  `solicitud-discipulado.controller.ts`, misma ruta) y `GET /solicitudes/conteo-abiertas`, con la compatibilidad de
  `estado=` de la 004 (`contracts/bandeja-api.md`). DTO con validación de `tipo`/`estado`/`take`. **Borrar las copias
  que reemplaza** (Principio XI): el `ESTADOS_ABIERTOS` local del controller de la 004, `OrdenBandeja` de la API y de
  `apps/backoffice/src/app/solicitudes/constantes.ts` (pasan a importar el de `bandeja.ts`), `estadosDelFiltro`, y
  `SolicitudResumen` (queda como alias de `SolicitudBandeja` o se reemplaza en sus usos). — cubre: FR-001–FR-005,
  FR-008
- [x] T021 **[Lote 1: en `solicitud-discipulado/fuente-bandeja.ts`; `resumenes` del servicio pasa a público]** [L1] `SolicitudDiscipuladoService`: implementar `FuenteSolicitudes` (`resumenes(ids)` = el `resumenes`
  actual, con `extra.propuestaVigente`) y registrarla; borrar su `listar` (lo reemplaza la bandeja) actualizando sus
  tests en el mismo commit. — cubre: FR-007, FR-008
- [x] T022 **[Lote 1: H1.2 con fuente de prueba sobre la rama `bautismo` que la vista ya tiene, sin tocar la vista]** [L1] Integración `bandeja.integration-spec.ts`: H1.1 (4 abiertas, orden por espera), H1.5 (resueltas con
  revisor y fecha), H1.7 (`creadoPor`), H1.8 (45 abiertas → páginas de 20, `total` 45, última página con 5), búsqueda por
  "nombre apellido", `persona=`, `filtro=todas`, `tipo` inválido → 400 con `errors[campo=tipo]`, `estado` que no es del
  tipo → 400, Pastor 200 en lectura, Discipulador 403. Con un **tipo de prueba** registrado solo en el test (fuente
  falsa + rama extra de la vista creada en la base de test) para H1.2: mezcla, filtro por tipo y orden entre tipos. —
  cubre: H1.1, H1.2, H1.5, H1.7, H1.8, FR-004, FR-005, SC-001
- [x] T023 **[Lote 1: verdes; única aserción movida: `propuestaVigente` → `extra.propuestaVigente` (forma del contrato)]** [P] [L1] Integración: los tests de la 004 sobre `GET /solicitudes` (filtros por estado, "propuesta a X")
  siguen verdes sin cambios de aserción. — cubre: FR-008
- [x] T024 **[Lote 1: sin el enlace al perfil ni el avatar, que llegan con el lote 2; "Ver" lleva al detalle]** [L1] Backoffice `app/solicitudes/`: la pantalla pasa a la forma base — columnas Tipo (solo si hay más de un
  tipo), Persona (avatar + enlace al perfil), Estado (texto + ícono, por tipo), Pedida, Espera ("hace N días"), Cargada
  por, Revisada por; filtro Abiertas/Resueltas/Todas, filtro de tipo solo con >1 tipo, filtro de estados solo con un
  tipo elegido, búsqueda y orden con `ControlesTabla` + `useControlesTablaUrl`; fila → `RUTA_DETALLE_SOLICITUD[tipo]`;
  vuelta a página 1 al cambiar filtros. Columnas que colapsan según `docs/15` (identificación y estado nunca se ocultan).
  Estado vacío por filtro ("No hay nada esperando una respuesta" en Abiertas). Días de espera con el `diasDesde`
  existente. — cubre: FR-002, FR-004–FR-006, H1.3, H1.4
- [x] T025 **[Lote 1: `bandeja.spec.ts`; el "nombre → perfil" de H1.4 se suma en el lote 2]** [L1] E2E `apps/backoffice/e2e/bandeja.spec.ts`: H1.1, H1.3 (sin filtro de tipo con un solo tipo), H1.4 (fila
  → detalle de Discipulado; nombre → perfil), H1.5, H1.6 (Pastor sin acciones), "hace N días" visible en cada fila (FR-002), `?pagina=99` → redirect a la última,
  cambio de filtro → `pagina=1`; axe claro y oscuro; 320 px sin scroll. — cubre: H1.1, H1.3–H1.6, FR-062, SC-007
- [x] T026 **[Lote 1: `solicitudes.spec.ts` sigue igual — sus selectores ya calzan con la bandeja nueva]** [L1] Adaptar `solicitudes.spec.ts` (004) a los textos nuevos de la bandeja sin perder sus casos. — cubre:
  FR-008
- [x] T027a **[Lote 2: "Ver el perfil de…"; `checklists/lote-2-pantallas.md`]** [L1] [CHECKLIST] Pantalla **Solicitud de Discipulado (detalle)** modificada (nombre enlazado al perfil):
  checklist de `docs/15` sobre lo tocado. — cubre: FR-062
- [x] T027 **[Lote 1: `checklists/lote-1-pantallas.md`]** [L1] [CHECKLIST] Pantalla **Solicitudes (bandeja)**: aplicar y tildar el checklist de `docs/15` (una acción
  principal — no tiene: decirlo; estados de carga/vacío/error/éxito; feedback; tono; teclado y lector de pantalla;
  contraste claro/oscuro incl. `hover`). — cubre: FR-062

---

## Lote 2 — Perfil de Persona (Historia 2, P1)

- [x] T030 **[Lote 2: `persona/perfil-persona.{service,controller}.ts`; suma `quitar` para el panel de roles; un id que no es uuid también es 404]** [L2] API `GET /personas/:id/perfil` (`personas.ver`) con `select` explícito: datos de FR-011, `usaLaApp`,
  `altaPor`, consentimiento, tutor solo si es menor, roles separados (`ROLES_DE_CARGO` vs. el resto), relaciones en las
  dos direcciones con `relacionDesde`; 404 `NO_ENCONTRADO`; nunca notas ni campos técnicos
  (`contracts/perfil-persona-api.md`). — cubre: FR-011, FR-012, FR-014, FR-015, FR-017
- [x] T031 **[Lote 2]** [L2] API `GET /personas/:id/grupos` (`personas.ver`): Inscripciones (cursados) y Liderazgos (a cargo), 20 más
  recientes de cada uno + totales, con Curso y estados. — cubre: FR-013
- [x] T032 **[Lote 2]** [L2] Integración `perfil-persona.integration-spec.ts`: Persona con Google (foto) y sin; H2.2 (dos Solicitudes
  y un Grupo finalizado, vía bandeja `persona=`), H2.3 (Discipulador con Grupos a cargo vigentes y pasados), H2.4 (menor
  con tutor registrado y tutor por texto), H2.5 (relación guardada desde el otro lado), H2.7 (la respuesta no contiene
  `notas` en ningún nivel — se verifica serializando y buscando la clave), Persona con `activo = false` → 200 con
  `activo: false`, id inexistente → 404, Pastor 200, Discipulador 403, límite de 20 + totales. — cubre: H2.2–H2.5, H2.7,
  H2.8, FR-013, FR-017
- [x] T033 **[Lote 2: la acción "Pedir Vida Nueva en su nombre" usa el `PedirEnNombreDe` existente con la Persona fija]** [L2] Backoffice `app/personas/[id]/` (`page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`): cabecera con
  `AvatarPersona`, nombre, edad, Sede, estado y marcas ("Dada de baja", "No usa la app", "Pendiente de tutor") en texto +
  ícono; secciones Datos, Roles (con acceso al panel de roles y al historial existentes de `personas-cliente.tsx`,
  extraídos a componentes reutilizables sin duplicarlos), Historial de Solicitudes (bandeja `persona=`, "Ver todas en
  la bandeja"), Grupos cursados, Grupos a cargo, Relaciones Familiares (enlace a cada perfil). Cada sección con
  `Suspense` y su propio error con "Reintentar". `SECCIONES_PERFIL` (lista registrable, research #5). Acciones en nombre
  de la Persona: "Pedir Vida Nueva en su nombre" (`pedir-en-nombre-de.tsx`, si tiene `solicitudes.crear_en_nombre`),
  con el nombre de la Persona visible (D97). Miga de pan Personas › Nombre. `@celular`. — cubre: FR-010–FR-016, H2.1,
  H2.6, H2.9
- [x] T034 **[Lote 2: `EnlacePersona` único]** [L2] Backoffice `app/personas/`: columna con `AvatarPersona` y el nombre como enlace al perfil; el resto del
  listado sin cambios. Enlazar al perfil también los nombres de Grupos, detalle de Solicitud y Pendientes de tutor. —
  cubre: FR-010, FR-018
- [x] T035 **[Lote 2: fixtures con ids fijos en `sembrar-e2e/013-backoffice.ts`]** [L2] E2E `apps/backoffice/e2e/perfil-persona.spec.ts`: desde el listado al perfil (avatar en la fila, FR-018); H2.1 (foto con alt; sin
  foto, iniciales), el Admin abre el panel de roles y el historial desde el perfil (FR-012) y ve "Pedir Vida Nueva en
  su nombre" con el nombre de la Persona visible (FR-016), H2.2, H2.3, H2.4, H2.6 (Pastor: contacto visible, sin botones de gestión), H2.8 (id inexistente → "No
  encontramos esta Persona" con enlace), Persona con `activo = false` muestra "Dada de baja" (FR-017), H2.9 `@celular` (360 px sin scroll, tamaño de letra de etiquetas y botones
  ≥ 16 px y alto ≥ 44 px medidos con `getComputedStyle`/`boundingBox`); axe claro y oscuro. — cubre: H2.1–H2.4, H2.6,
  H2.8, H2.9, FR-063, SC-003, SC-007
- [x] T036 **[Lote 2: `checklists/lote-2-pantallas.md`]** [L2] [CHECKLIST] Pantalla **Perfil de Persona**: checklist de `docs/15` + D150. — cubre: FR-062, FR-063
- [x] T037a **[Lote 2: `checklists/lote-2-pantallas.md`]** [L2] [CHECKLIST] Pantallas **Grupos (listado)**, **Grupo (detalle)** y **Pendientes de tutor**, modificadas
  por T034 (nombres enlazados al perfil): checklist de `docs/15` sobre lo tocado, una por una. — cubre: FR-062
- [x] T037 **[Lote 2: `checklists/lote-2-pantallas.md`]** [L2] [CHECKLIST] Pantalla **Personas (listado)** modificada: checklist de `docs/15` (avatar en celular, foco
  y lector de pantalla del enlace). — cubre: FR-062

---

## Lote 3 — Inicio y métricas (Historia 3, P2)

- [x] T040 **[Lote 3: `inicio/metricas.service.ts`]** [L3] API `apps/api/src/inicio/`: `GET /inicio/metricas` (`inicio.ver`) con las tres consultas de research #7;
  los cuatro rangos de D214 siempre presentes, calculados desde `congregaDesde` con `rangoCongregacion`; Sedes no eliminadas con `activa`. — cubre: FR-022–FR-025
- [x] T041 **[Lote 3: los conteos exactos en una Sede propia (otros specs corren en paralelo); H3.2 exacto y H3.4 en el unit `metricas.spec.ts`]** [L3] Integración `metricas.integration-spec.ts`: H3.1 (120 activas, 8 pendientes de tutor y 3 con
  `activo = false` → 120; incluye un menor activado y una Persona sin email), H3.2 (los cuatro rangos de D214 en orden, uno en 0, con `congregaDesde` sembrado para cada rango), H3.3
  (Sede inactiva presente con `activa: false`; Sede eliminada ausente), H3.4 (base sin Personas activas → todo 0, sin
  error), Pastor 200, Discipulador 403. Cotejar contra `COUNT` directo. — cubre: H3.1–H3.4, SC-005
- [x] T042 **[Lote 3: los bloques piden sus datos desde el navegador (`useDatosApi`) para cargar y fallar solos; el de comentarios espera al lote 5]** [L3] Backoffice `app/page.tsx` + `app/inicio/`: cuatro bloques independientes (`BloquePendientes`,
  `BloqueMetricas`, `BloqueCumpleanos`, `BloqueComentarios`), cada uno con `Suspense`, esqueleto, vacío y error con
  "Reintentar" que no tumba a los otros. Pendientes: `conteo-abiertas` por tipo con enlace a
  `/solicitudes?tipo=X`, la `TarjetaPendientes` existente y la cantidad de Pendientes de tutor. Métricas: número grande
  de Personas activas; tabla de rangos y de Sedes con cantidad y porcentaje en texto + `BarraProporcion`; ayuda "Contado desde el año
  en que cada Persona empezó a venir" (A6, D214). Los bloques de cumpleaños y comentarios se conectan en los
  lotes 4 y 5 (si no están, el bloque no se muestra). El cálculo de porcentajes con total 0 devuelve 0 sin dividir. Migrar a next-intl el h1 y los textos fijos. Pastor igual, sin
  acciones. `@celular`. — cubre: FR-020–FR-024, FR-064, H3.5, H3.6
- [x] T043 **[Lote 3]** [L3] E2E `apps/backoffice/e2e/inicio.spec.ts`: H3.2 (cuatro rangos con número y % visibles como texto), H3.4
  (con `page.route` sobre `GET /inicio/metricas` devolviendo `personasActivas: 0` y todo en 0: estado vacío, sin
  "NaN"), H3.5 (con `page.route` sobre `GET /solicitudes/conteo-abiertas` devolviendo `{discipulado: 5, bautismo: 2}`:
  "5 de Discipulado · 2 de Bautismo", cada uno enlaza a `/solicitudes?tipo=…`; con todo en 0, el mensaje), H3.6 (interceptar `GET /inicio/metricas` con 500: el bloque muestra error y
  "Reintentar", los otros se ven), `@celular` 360 px; axe claro y oscuro. — cubre: H3.2, H3.4–H3.6, FR-020, FR-063
- [x] T044 **[Lotes 3 y 4: `checklists/lote-3-4-pantallas.md`]** [L3] [CHECKLIST] Pantalla **Inicio**: checklist de `docs/15` + D150 (cuatro estados **por bloque**). —
  cubre: FR-062, FR-063

---

## Lote 4 — Cumpleaños (Historia 4, P2)

- [x] T050 **[Lote 4: `inicio/cumpleanos.{service,controller}.ts`]** [L4] API `GET /personas/cumpleanos?mes=` (`personas.ver`, paginado de a 50) y `GET /inicio/cumpleanos-semana`
  (`inicio.ver`) (`contracts/inicio-api.md`), con el índice de expresión; filtro `estado = activa`, `activo = true`;
  29/2 → 28/2 en no bisiesto calculado con `proximoCumpleanos`. — cubre: FR-030–FR-033
- [x] T051 **[Lote 4: con el reloj fijado en el servicio]** [L4] Integración `cumpleanos.integration-spec.ts`: H4.1 (orden por día y apellido, `cumple`, `esHoy`), H4.3
  (29/2 en febrero de un año no bisiesto aparece día 28), H4.4 (`mes=12`), H4.5 (`pendiente_tutor` y `activo = false`
  ausentes), semana que cruza fin de mes y fin de año (reloj fijado en el test), `mes=13` → 400. — cubre: H4.1, H4.3–H4.5,
  FR-031, SC-005
- [x] T052 **[Lote 4]** [L4] Backoffice `app/cumpleanos/` (`page.tsx`, `loading.tsx`, `error.tsx`): selector de mes (enlaces reales,
  mes actual por defecto, `?mes=` inválido → redirect al actual), tabla Nombre (avatar + enlace al perfil), Día, Cumple,
  Teléfono (enlace `tel:`), marca "Hoy" con ícono; vacío "Nadie cumple años en <mes>". `BloqueCumpleanos` del Inicio:
  hoy y próximos 7 días, vacío "Nadie cumple años esta semana" con enlace al mes. `@celular`. — cubre: FR-030, FR-031,
  H4.6
- [x] T053 **[Lote 4: H4.2 queda en la integración (el reloj del navegador no mueve a la API); el e2e usa una Persona sembrada que cumple hoy]** [L4] E2E `apps/backoffice/e2e/cumpleanos.spec.ts` con reloj fijado (`page.clock`): H4.1, H4.2 (23:30 del 6/10
  en Argentina → "Hoy" es el 6), H4.6 (bloque vacío con enlace), `?mes=abc` → redirect; `@celular`; axe claro y
  oscuro. — cubre: H4.1, H4.2, H4.6, FR-063
- [x] T054 **[Lotes 3 y 4: `checklists/lote-3-4-pantallas.md`]** [L4] [CHECKLIST] Pantalla **Cumpleaños**: checklist de `docs/15` + D150. — cubre: FR-062, FR-063

---

## Lote 5 — "Contanos qué te parece" (Historia 5, P2) — requiere la 007 en `main`

- [X] T060 **[Lote 5: `POST /comentarios` también exige `X-Internal-Secret` (lo llama el servidor de Next, como la 007), así el límite por origen no se saltea; sesión opcional con `SesionOpcionalGuard`; enlace del email con `BACKOFFICE_URL`]** [L5] API `apps/api/src/comentario/`: `POST /comentarios` público con sesión opcional (guard que acepta token
  si viene), lee `X-Origen-Cliente` y guarda solo la huella (helper de la 007), valida DTO (`contracts/comentarios-api.md`,
  códigos de campo según `validation-exception-factory`), descarta datos de contacto si hay sesión, límite por ventana de una hora
  (5 por huella sin sesión, 20 por Persona con sesión) → `429 DEMASIADOS_PEDIDOS` con `reintentarEn`; la regla cruzada de
  contacto con `AppException('VALIDACION')` y `{campo: 'contacto', code: 'CONTACTO_INVALIDO'}`; después de
  confirmar, email con `EmailService` a `EMAIL_COMENTARIOS_DESTINO` (asunto sin datos sensibles), falla capturada a
  Sentry sin texto ni contacto. Documentar la variable en `.env.example` y en `docs/11` vía "Cambios a docs". — cubre:
  FR-040–FR-044, A8, A9
- [X] T061 **[Lote 5]** [L5] API listado `GET /comentarios`, `GET /comentarios/conteo-sin-revisar`, `GET /comentarios/:id`
  (`comentarios.ver`), `POST|DELETE /comentarios/:id/revisado` (`comentarios.gestionar`, idempotentes: marcar uno ya revisado no cambia quién ni cuándo). — cubre: FR-046,
  FR-047
- [X] T062 **[Lote 5]** [P] [L5] Unit `comentario-limites.spec.ts`: cálculo de `reintentarEn` (el más viejo de la ventana sale en N
  segundos), umbral exacto 5/6 y 20/21, sin sesión vs. con sesión; validación de contacto (acepta sin email ni teléfono
  → `CONTACTO_INVALIDO` en el campo `contacto`; con sesión ignora el contacto enviado). — cubre: FR-041, FR-043, H5.3, H5.5
- [X] T063 **[Lote 5]** [L5] Integración `comentarios.integration-spec.ts` (con `EmailServiceFalso` de la 007): H5.1 (sin sesión,
  guarda página, navegador, requestId, huella y **no** la IP), H5.2 (con sesión, `personaId` y sin contacto propio),
  H5.3, H5.4 (vacío y 2001 caracteres → `errors[campo=texto, code=TEXTO_INVALIDO]`), H5.5 (sexto en la hora → 429), H5.6 (email enviado con
  asunto sin texto; `EmailService` que falla → igual 201 y guardado), H5.7 (marcar y deshacer, idempotente, registra
  quién), H5.8 (Pastor: listado 200, marcar 403). — cubre: H5.1–H5.8, SC-006
- [X] T064 **[Lote 5: acción de servidor en `(publica)/contanos/acciones.ts`; `EnlaceContanos` arma el `?desde=`]** [L5] Web: página `/contanos` (pública, `noindex`, `loading`/`error`) con `FormularioComentario`; el envío pasa
  por un route handler/server action de `apps/web` que lee la sesión con `auth()` (si hay, adjunta el token de API como
  el resto de la app, D135, y `conSesion` oculta los campos de contacto) y manda `X-Origen-Cliente` como en la 007; enlace "Contanos qué te parece" en el pie de página y en Perfil
  (`docs/14`). Mandar `paginaOrigen` desde el enlace (`?desde=`) sin query string. `@celular`. — cubre: FR-040, FR-042,
  FR-045, FR-063
- [X] T065 **[Lote 5: el detalle es una lista con `dl`, no tabla; `MenuUsuario` suma la prop `acciones`]** [L5] Backoffice: "Contanos qué te parece" en el menú de usuario (abre `Sheet` con `FormularioComentario`);
  `app/comentarios/` listado (filtro Sin revisar/Revisados/Todos y tipo, paginado de a 20, extracto, quién o "Sin
  sesión", "Acepta contacto" con ícono) y `app/comentarios/[id]` (texto completo como texto plano, datos técnicos,
  contacto si lo aceptó, "Marcar como revisado"/"Deshacer" con toast); `BloqueComentarios` del Inicio (cantidad sin
  revisar + 5 más recientes, vacío "No hay comentarios nuevos"). Miga de pan Comentarios › <fecha> en el detalle (la
  miga arranca en la sección, nunca en Inicio — `docs/15`). El ítem del menú de usuario se suma como prop opcional de
  `MenuUsuario` (`packages/ui`), sin cambiar el menú de la web. — cubre: FR-040,
  FR-046–FR-048
- [X] T066 **[Lote 5]** [L5] E2E `apps/web/e2e/contanos.spec.ts`: H5.1 (sin sesión, desde el pie: confirmación con qué pasa después),
  H5.3, H5.4 (resumen arriba con enlace y foco, texto no se borra), H5.5 (mensaje con minutos en palabras), H5.2 en la web (con sesión: sin campos de contacto, queda asociado a
  la Persona), `@celular`; axe claro y oscuro. — cubre: H5.1–H5.5, FR-045, FR-063
- [X] T067 **[Lote 5]** [L5] E2E `apps/backoffice/e2e/comentarios.spec.ts`: el comentario enviado en la web aparece en "Sin revisar"
  y en el bloque del Inicio (SC-006); H5.7; un texto con `<b>hola</b>` se ve literal (FR-048); H5.8 (Pastor sin botón);
  enviar desde el menú de usuario del backoffice queda con `app = backoffice` y la Persona; axe claro y oscuro. — cubre:
  H5.2, H5.7, H5.8, FR-048, SC-006
- [X] T068a **[Lote 5: `checklists/lote-5-pantallas.md`]** [L5] [CHECKLIST] **Pie de página** y **Perfil** de la web, modificados con el enlace nuevo: checklist de
  `docs/15` sobre lo tocado (enlace real, foco, contraste, 44 px). — cubre: FR-062, FR-063
- [X] T068 **[Lote 5: `checklists/lote-5-pantallas.md`]** [L5] [CHECKLIST] Pantalla **/contanos (web)** y el `Sheet` del menú de usuario: checklist de `docs/15` + D150.
  — cubre: FR-062, FR-063
- [X] T069 **[Lote 5: `checklists/lote-5-pantallas.md`]** [L5] [CHECKLIST] Pantallas **Comentarios (listado)** y **Comentario (detalle)**: checklist de `docs/15`. —
  cubre: FR-062

---

## Lote 6 — Catálogos y Cursos (Historia 6, P3)

- [x] T070 **[Lote 6: `curso/`; `exigirActivo` exportado por `CursoModule`]** [L6] API `apps/api/src/curso/` (`contracts/cursos-api.md`): listado con `gruposEnCurso`/`tieneGrupos`, detalle,
  `disponibles-para-alta`, alta acotada a `CURSOS_RECONOCIDOS` (restaurar si está en la papelera), `PATCH` sin
  categoría/tipo/modalidad, `DELETE` lógico con `CURSO_TIENE_GRUPOS`, papelera y restaurar. `CursoService.exigirActivo(
  cursoId, tx)` → `CURSO_INACTIVO` si `activo = false` o `eliminadoEn` no es nulo. `GET /catalogos/resumen`. — cubre: FR-050–FR-056
- [x] T071 **[PR de ajustes `ajustes-dni-curso-sedes`, aprobado por Echu el 2026-10-08: la llamada va en la rama que crea el Grupo; texto de `CURSO_INACTIVO` para el Discipulador en la web app (la 006 movió la pantalla). Unit en `propuesta-aceptar-declinar.spec.ts`; la integración no apaga el Curso de Vida Nueva individual porque lo comparten las demás suites en paralelo]** [L6] Llamar `exigirActivo` en la aceptación de propuesta de la 004 (`propuestas.service.ts`, rama sin
  `grupoDestinoId` que crea el Grupo, dentro de la misma transacción); la rama "sumar a este Grupo" no se bloquea.
  Traducir `CURSO_INACTIVO` en la pantalla donde el Discipulador acepta (backoffice hoy; web app si la 006 ya la movió).
  — cubre: FR-054
- [x] T071a **[Con T071: `checklists/lote-6-pantallas.md`]** [L6] [CHECKLIST] Pantalla del Discipulador **donde acepta una propuesta**, modificada por T071 (mensaje de
  error nuevo): checklist de `docs/15` sobre lo tocado. — cubre: FR-062
- [x] T072 **[Lote 6]** [P] [L6] Unit `curso-alta.spec.ts`: combinación reconocida libre → ok; existente → `CURSO_YA_EXISTE`;
  eliminada → restaurar; no reconocida → `CURSO_NO_RECONOCIDO`. — cubre: FR-056
- [x] T073 **[Lote 6: sobre "Vida Nueva grupal" (el individual lo comparten otros tests); "aceptar una propuesta → CURSO_INACTIVO" espera a T071, `exigirActivo` se prueba directo]** [L6] Integración `cursos.integration-spec.ts`: H6.2 (listado con Grupos en curso), H6.3 (inactivar con Grupos
  en curso: los Grupos siguen; aceptar una propuesta nueva → `CURSO_INACTIVO`, la propuesta queda sin aceptar y la Solicitud sigue abierta), H6.4
  (eliminar con un Grupo finalizado → 409), H6.5 (papelera y restaurar), Curso eliminado → `exigirActivo` rechaza,
  sumar a un Grupo en curso de un Curso inactivo sigue funcionando, `PATCH` con `categoria` → 400, H6.6 (Pastor:
  GET 200, escritura 403), `catalogos/resumen`. — cubre: H6.2–H6.6, FR-052, FR-054
- [x] T074 **[Lote 6; el tramo Catálogos en las migas de Sedes llegó con T077]** [L6] Backoffice `app/catalogos/`: tarjetas por catálogo con activos/total y enlace (Sedes, Cursos; las demás
  cuando existan), textos a next-intl. `app/cursos/` (listado con filtro activos/todos, columnas de FR-051, alta en modal
  con las combinaciones disponibles), `app/cursos/[id]` (editar nombre y descripción; Inactivar con confirmación simple
  o reforzada según `gruposEnCurso` — neutra, D151; Reactivar; Eliminar deshabilitado con explicación y oferta de
  inactivar si `tieneGrupos`), `app/cursos/papelera`. Migas Catálogos › Cursos › Nombre; sumar el tramo Catálogos a
  las migas de Sedes. Cada ruta con `loading`/`error` (y `not-found` en el detalle). — cubre: FR-050–FR-055, FR-060
- [x] T075 **[Lote 6]** [L6] E2E `apps/backoffice/e2e/cursos.spec.ts`: H6.1 (Catálogos sin tarjetas de lo que no existe), H6.3
  (confirmación reforzada: el botón se habilita solo con el nombre exacto), H6.4 (botón deshabilitado con su
  explicación), H6.5, H6.6 (Pastor); Sedes sigue accesible desde Catálogos con su miga; axe claro y oscuro. — cubre:
  H6.1, H6.3–H6.6, FR-060
- [x] T076 **[Lote 6: `checklists/lote-6-pantallas.md`]** [L6] [CHECKLIST] Pantallas **Catálogos**, **Cursos (listado)**, **Curso (detalle)** y **Papelera de
  Cursos**: checklist de `docs/15`, cada una por separado. — cubre: FR-062
- [x] T077 **[PR de ajustes `ajustes-dni-curso-sedes`, aprobado por Echu el 2026-10-08: `/sedes` con `enMenu: false`, Catálogos marcado en `/sedes` y `/cursos` (`rutasRelacionadas` + `esItemActual`), miga "Catálogos ›" en listado, detalle y papelera; e2e en `cursos.spec.ts` y `sedes.spec.ts`]** [L6] [CHECKLIST] Pantallas de **Sedes** (listado, detalle, papelera) modificadas solo en la miga de pan y el
  menú: verificar el ítem del checklist de navegación (miga, `aria-current`) y que el resto no cambió. — cubre: FR-060

---

## Lote 7 — Edición de datos de una Persona (Historia 7, P3) — requiere la 006 en `main`

- [ ] T080 [L7] Primero, extraer la regla de D133 que hoy está en línea en `RolesService.otorgarRol` a
  `esMenorDeEdad(fechaNacimiento, hoy)` (`packages/shared-types/src/persona.ts`) con su unit test, y que `otorgarRol`
  la use (sin cambio de comportamiento: sus tests siguen verdes). Después, API `PATCH /personas/:id` (`personas.editar`):
  DTO parcial del alta de la 006; D133 con esa función; email normalizado como exige la 007 y único
  (`EMAIL_DUPLICADO`); email vacío solo si la 006 ya lo hizo opcional (D145). — cubre: FR-057, FR-058
- [ ] T081 [L7] Integración `persona-editar.integration-spec.ts`: H7.2 (fecha que vuelve menor a un Discipulador → 409
  con el código existente), H7.3 (email de otra Persona → 409), edición válida devuelve `PerfilPersona` actualizado,
  H7.5 (Pastor 403). — cubre: H7.2, H7.3, H7.5
- [ ] T082 [L7] Backoffice `app/personas/[id]/editar/` (o `Sheet` desde el perfil, según cómo la 006 haya resuelto el
  alta — mismo patrón): reusa el formulario de la 006 en modo edición con los valores actuales; toast "Guardamos los
  cambios" y vuelta al perfil; "Editar datos" solo con `personas.editar`. — cubre: FR-057, H7.1, H7.4
- [ ] T083 [L7] E2E `apps/backoffice/e2e/persona-editar.spec.ts`: H7.1, H7.2 (error explicado), H7.4, H7.5 (Pastor sin
  botón); axe claro y oscuro. — cubre: H7.1, H7.2, H7.4, H7.5
- [ ] T084 [L7] [CHECKLIST] Pantalla **Editar datos de una Persona**: checklist de `docs/15`. — cubre: FR-062

---

## Lote final — cierre (después de los lotes que se implementen)

- [x] T090 **[Cumpleaños hoy, mañana, fin de mes y 29/2, Relaciones Familiares en las dos direcciones, nombres largos con tildes; los comentarios esperan al lote 5 y el Curso inactivo no se siembra (el demo usa los dos Cursos reconocidos para Grupos)]** [LF] `apps/api/prisma/seed-demo.ts` (D120): comentarios de los dos tipos, revisados y no, con y sin sesión,
  uno de 2000 caracteres y uno con HTML; Personas con cumpleaños hoy, mañana, último día del mes y 29/2; una Persona con
  historial en todos los tipos conectados y Relaciones Familiares en las dos direcciones; un Curso inactivo; nombres
  largos y con tildes. — cubre: FR-065
- [x] T091 **[Perfil y Cursos en `pastor-solo-lectura.spec.ts`; los 403 de escritura nuevos están en las integraciones de cada lote]** [LF] `pastor-solo-lectura.spec.ts`: sumar las pantallas nuevas (ningún botón de gestión) y un recorrido por
  los endpoints de escritura nuevos esperando 403. — cubre: SC-008, FR-061
- [ ] T092 [LF] `axe-todas-las-rutas.spec.ts` verde con las rutas nuevas en claro y oscuro y a 320 px. — cubre: SC-007,
  FR-062
- [x] T093 **[p95 con el seed demo, 50 pedidos por endpoint: en el PR]** [LF] Medir p95 de `GET /solicitudes`, `/personas/:id/perfil` e `/inicio/metricas` con `db:reset-demo`
  (script simple con 50 pedidos, resultado en el PR). — cubre: SC-004
- [ ] T094 [LF] Las tres suites en verde (`pnpm --filter api run test`, `pnpm --filter api run test:e2e`, e2e de
  `apps/web` y `apps/backoffice`) y pasada de `quickstart.md`. — cubre: Constitución (Governance)
- [ ] T095 **[D178 y D207–D213 ya están en `docs/05` (lote 0 global) y casi todos los cambios de `docs/02`, `04` y `14` también; se sumó el glosario de `docs/15`. Lo de "Contanos" (`docs/04`, ER, `docs/16`) espera al lote 5]** [LF] Aplicar "Cambios a docs al mergear" de `plan.md` y numerar D178 y D207–D213 (la DN-1 de esta spec quedó unificada en D178, con la precisión D207) en `docs/05` (mirando el último
  número). — cubre: Principio I

---

## Dependencias y orden

- L0 → todos. L1, L2, L4, L5, L6 en paralelo. L3 después de L0 (sus bloques de cumpleaños/comentarios se enchufan
  cuando L4/L5 cierran; el resto no espera). L7 después de L2 y de la 006. L5 después de la 007.
- Dentro de cada lote: API → integración → pantalla → e2e → checklist.
- Para cada spec de tipo (008–011) que llegue a `main`: seguir el contrato de cinco pasos de
  `contracts/bandeja-api.md` en **su** PR; T011 lo verifica.

## Cobertura (cada criterio con su test)

| Criterio | Test |
|---|---|
| H1.1, H1.5, H1.7, H1.8 | T022, T025 |
| H1.2 | T022 (tipo de prueba) |
| H1.3, H1.4, H1.6 | T025 |
| H2.1, H2.6, H2.9, FR-012, FR-016, FR-018 | T035 |
| H2.2–H2.5, H2.7, H2.8 | T032 (+ T035 para H2.2–H2.4, H2.8 en pantalla) |
| H3.1–H3.4 | T041 (+ T043 H3.2, H3.4 con respuesta simulada) |
| H3.5, H3.6 | T043 (H3.5 con dos tipos simulados) |
| H4.1–H4.6 | T007, T051, T053 |
| H5.1–H5.8 | T062, T063, T066, T067 |
| H6.1–H6.6 | T073, T075 (H6.2 en T073) |
| H7.1–H7.5 | T081, T083 |
| FR-003 / FR-007 (regla y extensión) | T003, T011 |
| FR-008 (004 sin regresión) | T023, T026 |
| FR-014 (inversas) | T005 |
| FR-018 (foto en listado) | T016, T035 |
| FR-042 (requestId, navegador) | T017, T063 |
| FR-015 (sin notas) | T032 |
| FR-054 (Curso inactivo) | T073 |
| FR-061 / SC-008 (permisos, Pastor) | T009, T091 |
| FR-062 / SC-007 (checklist, axe, 320 px) | T027, T027a, T036, T037a, T068a, T071a, T037, T044, T054, T068, T069, T076, T077, T084, T092 |
| FR-063 (D150) | T035, T043, T053, T066 |
| FR-065 (seed) | T090 |
| SC-004 | T093 |
| SC-005 | T041, T051 |
| SC-006 | T063, T067 |
