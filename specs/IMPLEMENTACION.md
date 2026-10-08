# Implementación en paralelo de las specs 006–013 (y ajustes de UX)

Mapa para las **nueve sesiones** que arrancan después de que `lote-0-global` esté en `main`: una por
spec (006, 007, 008, 009, 010, 011, 012, 013) y una de **ajustes-ux**. Cada sesión trabaja en su
rama desde `main` y abre su PR (D152). El objetivo es que dos sesiones no editen el mismo archivo, y
que lo que se comparte pase por las interfaces que ya dejó el lote 0.

Si una sesión necesita algo que este mapa no resuelve (tocar un archivo de otra, una decisión
nueva), **para y lo anota en su PR** como "Pregunta para Echu", con su recomendación.

---

## 1. Lo que ya está en `main` (lote 0 global) y nadie vuelve a hacer

| Pieza | Dónde | Qué deja resuelto |
|---|---|---|
| Modelo completo de 006–013 | `apps/api/prisma/schema.prisma`, migración única `20261008120000_lote_0_global` | Todas las tablas, enums, índices parciales y CHECK; trigger de `telefonoNormalizado`; emails normalizados; `congregaDesde` (D214); la vista `solicitudes_bandeja` con los siete tipos (D178). |
| Valores compartidos | `packages/shared-types/src/*.ts` (un archivo por spec: `camino`, `codigo-ingreso`, `vida-de-servicio`, `ministerios`, `bautismo`, `eventos`, `avisos`, `bandeja`, `comentario`, `curso`, `cumpleanos`, `metricas`, `perfil-persona`, `registro`) | Enums, límites y constantes; reglas de Mi camino (`camino.ts`); `normalizarTelefono`/`normalizarNombre`/`sonPosiblesDuplicados`; `destinoSeguro`; `instanteEnArgentina`; `rangoCongregacion`. **Todos los permisos** nuevos en `CATALOGO_PERMISOS` y **todos los códigos de error** nuevos en `error-code.ts`, con su traducción en los dos `es.json`. |
| Avisos | `avisos.ts` (`CATALOGO_AVISOS`), `apps/api/src/notificaciones/` | Un solo catálogo con los ~48 eventos de 004–011 (D197–D206); `NotificacionesService.emitir(tx, evento)` **dentro de la transacción** del cambio; `resolverDestinatarios` para los diez tipos de destinatario; textos `avisos.eventos.<dominio>.<evento>.titulo|detalle` en `apps/web`. |
| Email | `apps/api/src/email/` (`EmailService`, SMTP, `@Global`), `test/email-service-falso.ts`, Mailpit en `docker-compose.yml` y en el CI | D140. La API no arranca sin `SMTP_HOST`. |
| Bandeja | `apps/api/src/bandeja/` (`BandejaService`, `RegistroFuentesSolicitudes`, `RegistroPendientesAdmin`), `apps/backoffice/src/config/solicitudes.ts`, `bandeja.tipos/estados` | La consulta sobre la vista (orden, filtros, página, conteo); el registro de fuentes por tipo; las rutas de detalle e íconos de los siete tipos. |
| Pendientes del Inicio (backoffice) | `RegistroPendientesAdmin` + `PendientesAdmin.extra` + `tarjeta-pendientes.tsx` | Cada spec suma sus filas sin editar el servicio ni la tarjeta. |
| "¿Completó esta etapa?" | `apps/api/src/camino/consultas.ts` (`completoEtapa`, `completoPorSistema`, `completitudVigente`, `bloquearPersona`) | D155: la única consulta, para 006, 008, 009 y 010. |
| Storage por áreas | `apps/api/src/storage/` | D168: `portadas` y `flyers` públicas; `contenidos` y `comprobantes` privadas (`subirPrivado`, `leer`), bajo `.privado/` y nunca servidas como estáticas. |
| Hooks entre specs | `apps/api/src/bautismo/bautismo.service.ts`, `apps/api/src/evento/inscripcion-bautismo.ts` | `liberarAsignacionesDeEvento` y `retirarPorDeclaracion` (no-op hasta la 010); `inscribirEnBautismo` / `cancelarInscripcionBautismo` (E5, ya implementadas). |
| Un módulo por spec | `apps/api/src/{camino,codigo-ingreso,vida-de-servicio,ministerio,bautismo,evento,tareas-programadas,inicio,comentario,curso}/` | Registrados en `app.module.ts`. **Nadie vuelve a editar `app.module.ts`.** |
| Puntos de extensión de UI | ver §2 | Mi camino, Perfil de Persona, `nav.ts`, `packages/ui/src/index.ts`, Catálogos, `es.json`. |
| Seeds y fixtures | `apps/api/prisma/seed-demo/<spec>.ts`, `apps/api/scripts/sembrar-e2e/<spec>.ts`, `limpiar-e2e.ts` | Un archivo por spec ya llamado desde el `main`; `limpiar-e2e.ts` ya borra todas las tablas nuevas en orden de FK. |
| Registro | `apps/web/src/app/(publica)/registro/` | "¿En qué año empezaste a venir a la iglesia?" (D214). |
| Celular | `apps/web/playwright.config.ts` (proyecto `celular`, `@celular`), `sinScrollHorizontal` en `apps/web/e2e/helpers.ts` | D150, research #13 de la 006. |
| Variables | `.env*.example`, CI, `COMO-ARRANCAR.md` | `SMTP_*`, `EMAIL_REMITENTE`, `CODIGO_INGRESO_SECRET`, `WEB_URL`, `TAREAS_PROGRAMADAS`, `NEXT_PUBLIC_WEB_APP_URL` (backoffice, **una sola** para enlaces y QR a la web app: reemplaza `WEB_PUBLIC_URL` del plan de la 011). |

Qué quedó hecho y qué pasó a cada lote está tildado y anotado en cada `tasks.md`, con la marca
**[Lote 0 global: …]**.

---

## 2. Reglas para no pisarse

1. **Migraciones.** La de lote 0 no se edita. Si una spec necesita un cambio de esquema, crea **su**
   migración nueva (`--create-only`, timestamp posterior) y edita en `schema.prisma` solo **sus**
   modelos. Si cambia un estado de su tipo, actualiza también la rama de la vista con
   `CREATE OR REPLACE VIEW` del archivo completo `apps/api/prisma/vistas/solicitudes_bandeja.sql`
   (el test de coherencia avisa si no).
2. **Avisos.** Ninguna spec escribe en `notificaciones`. Para avisar algo:
   `await this.notificaciones.emitir(tx, { nombre, a, datos })` **dentro** de la transacción (D197);
   el nombre, el destinatario y los datos ya están tipados en `CATALOGO_AVISOS`. Agregar un evento
   nuevo = agregarlo al catálogo **y** sus textos en `avisos.eventos` (y es una Pregunta para Echu si
   cambia prioridades). Lo que va al Admin solo loguea (D201).
3. **Bandeja.** Para conectar un tipo: crear en la carpeta de la spec una `FuenteSolicitudes`
   (`tipo`, `resumenes(ids)`) y registrarla con `RegistroFuentesSolicitudes.registrar` en el
   `onModuleInit` de **su** módulo; crear la pantalla de detalle en la ruta de
   `config/solicitudes.ts` (`app/solicitudes/<tipo>/[id]/`). No se edita la vista, el servicio, la
   lista de tipos ni los textos de tipos y estados (ya están).
4. **Pendientes del Inicio del backoffice.** `RegistroPendientesAdmin.registrar({ clave, enlace,
   contar })` desde el módulo de la spec; texto en `inicio.pendientes.extra.<clave>` (clave
   `<dominio>_<que>`, sin puntos). No se edita `tarjeta-pendientes.tsx` ni
   `pendientes-admin.service.ts`.
5. **Mi camino.** La 006 es dueña de `apps/web/src/app/(app)/mi-camino/page.tsx` y de las cuatro
   cards. Lo propio de cada etapa va en `tarjeta-vida-de-servicio.tsx` (008),
   `tarjeta-ministerio.tsx` (009) y `tarjeta-bautismo.tsx` (010), con la firma de
   `acciones-etapa.ts`; la página las renderiza en la zona de acciones de su card. Las subrutas
   (`/mi-camino/vida-de-servicio`, `/mi-camino/ministerios`, …) son carpetas nuevas de cada spec.
   Cada spec de etapa suma su etapa a `ETAPAS_CONSTRUIDAS` (`camino.ts`) **en el mismo commit** que
   habilita su pedido (una línea; si choca, se resuelve dejando las dos).
6. **Perfil de Persona (backoffice).** La 013 (lote 2) arma `app/personas/[id]/page.tsx`. Las otras
   specs suman su sección en `app/personas/[id]/secciones/seccion-<x>.tsx` (ya existen vacías) y su
   línea en `SECCIONES_PERFIL` (`secciones/index.ts`), en el orden indicado ahí. **Las acciones
   nuevas sobre una Persona** (pedir en su nombre, habilitar bautismo, completitud manual…) van en
   esa sección, no en `personas-cliente.tsx`.
7. **`apps/backoffice/src/config/nav.ts`.** Cada spec agrega sus rutas en **su** línea del bloque
   comentado del final, y solo cuando la página existe (el smoke de axe recorre la lista entera: una
   ruta sin página rompe los e2e). Los permisos ya están.
8. **`es.json`.** Cada spec escribe solo en sus namespaces (ya creados vacíos: ver §3). Los textos
   de errores y de la bandeja ya están; si hace falta corregir uno, en el PR de la spec dueña del
   código.
9. **`packages/ui/src/index.ts`.** Cada spec exporta sus componentes en su bloque del final.
   `packages/shared-types/src/index.ts` ya exporta todos los archivos: los tipos nuevos de una spec
   van **dentro de su archivo**.
10. **Seeds y fixtures.** Solo en `prisma/seed-demo/<spec>.ts` y `scripts/sembrar-e2e/<spec>.ts`.
    Helpers de e2e nuevos en archivos propios (`apps/web/e2e/helpers-<spec>.ts`,
    `apps/backoffice/e2e/helpers-<spec>.ts`). Si una spec crea entidades `e2e-` de una tabla nueva
    que `limpiar-e2e.ts` no cubre, agrega su bloque ahí.
11. **`docs/05-decisiones.md`.** Ninguna sesión agrega decisiones sin mirar el último número (D89,
    D103); las decisiones de producto nuevas van como Pregunta para Echu.
12. **Antes de abrir el PR:** las tres suites en verde (`pnpm --filter api run test`,
    `pnpm --filter api run test:e2e`, e2e de web y backoffice) y la checklist de `docs/15` por
    pantalla (D114).

---

## 3. Archivos compartidos: quién toca qué

| Archivo | Quién lo toca y cómo |
|---|---|
| `schema.prisma` | Solo los modelos propios, con migración propia (§2.1). |
| `apps/api/src/app.module.ts` | Nadie (todo registrado). |
| `apps/api/src/persona/persona.service.ts` | **007**: normalizar email en edición. **012 (B)**: emitir `persona.cuenta_activada` en el punto de activación. **006 (D)** y **013 (L7)**: lo nuevo en archivos nuevos (`alta-persona.service.ts`, `edicion-persona.service.ts`), sin reescribir los métodos existentes. **010 (C)**: la habilitación de bautismo va en `bautismo/`, no acá. |
| `apps/api/src/persona/roles.service.ts` | Solo **008 (B)** (si hace falta más que lo del lote 0: `LIDER_TIENE_GRUPOS_ACTIVOS` ya está). |
| `apps/api/src/discipulado/**`, `solicitud-discipulado/**` | **012 (B)**: cambia `EventosDiscipuladoService` por `emitir` (solo las llamadas). **013 (L1)**: saca `GET /solicitudes` a `bandeja/` y registra la fuente `discipulado` en un archivo nuevo (`solicitud-discipulado/fuente-bandeja.ts`). **006 (C)**: solo si la web del Discipulador necesita un endpoint nuevo, en un archivo nuevo. |
| `apps/backoffice/src/app/solicitudes/` (004) | **013 (L1)**: `page.tsx`, `solicitudes-cliente.tsx`, `constantes.ts` (la bandeja unificada). Las demás specs: solo su carpeta de detalle `solicitudes/<tipo>/[id]/`. |
| `apps/backoffice/src/app/personas/personas-cliente.tsx` | **013 (L2)**: el nombre como enlace al perfil y el avatar. **006 (D)**: botón "Nueva Persona" arriba y acciones de email. **008 (B)**: solo el panel de roles (`RolesDialog`/`BloqueoDiscipulador`). Regiones distintas del archivo; lo demás va al Perfil (§2.6). |
| `apps/backoffice/src/app/page.tsx` (Inicio) | Solo **013 (L3/L4)**. Los pendientes de otras specs por `RegistroPendientesAdmin`. |
| `apps/backoffice/src/app/catalogos/page.tsx` | **013 (L6)** la rehace; **009 (C)** suma Ministerios en el lugar marcado. |
| `apps/backoffice/src/app/grupos/**` | **008 (B)**: ediciones de Vida de Servicio (carpetas nuevas). **013 (L2)**: nombres enlazados al perfil. |
| `apps/backoffice/src/app/{mis-discipulados,mi-disponibilidad,mis-grupos}/` | Los borra **006 (C)** (D142), con sus ítems de `nav.ts` y redirecciones. |
| `apps/web/src/app/(app)/inicio/page.tsx` | **006 (C)**: dueña (pendientes del Discipulador, y el Inicio de la app de ajustes-ux #38–#39). |
| `apps/web/src/app/(app)/layout.tsx`, `components/nav-app-bar.tsx`, `config/nav-app.ts` | **006 (C)**: `aria-current` por prefijo y `SUBNAV_MI_CAMINO`. **012 (A)**: el contador de no leídos. **008 (C)**: entrada "Mis grupos" en `SUBNAV_MI_CAMINO` después de la 006. |
| `apps/web/src/app/(publica)/ingresar/**` | **007** (dueña, incluido el parámetro `destino` con `destinoSeguro`). La 011 solo arma enlaces `/ingresar?destino=…`. |
| `apps/web/src/app/(publica)/registro/**` | En este orden: **007** (registro con email de cualquier proveedor), **ajustes-ux** (#27–#36), **011 (B)** (solo el `destino`), **006 (D)** (extracción a `registro.ts`, sin cambio visible). Cada una rebasea antes de tocarlo. |
| `apps/web/src/app/(publica)/{eventos,ministerios}/**` | **011 (B)** y **009 (C)** respectivamente (incluye sus estados vacíos, ajustes-ux #13). |
| `apps/web/src/app/(app)/{mis-eventos,avisos}/**` | **011 (C)** y **012 (A)** respectivamente (incluye ajustes-ux #48). |
| `packages/ui/src/components/ui/button.tsx`, `confirm-destructive-dialog.tsx`, `editor-de-franjas.tsx`, `campo-*.tsx` | **ajustes-ux** (D150, D151, #40–#43). Las specs usan la prop `tono` desde ya (`neutro` para lo reversible). |
| `apps/web/src/messages/es.json` | Namespaces: `etapas`, `miCamino.estados/selector`, `misDiscipulados`, `miDisponibilidad`, `inicio.pendientesDiscipulador` (006); `ingreso` (007); `vidaDeServicio`, `misGrupos` (008); `miCamino.ministerio`, `ministerios` (009); `miCamino.bautismo`, `bautismo` (010); `eventos.publico`, `eventos.inscripcion`, `misEventos` (011); `avisos` (012); `comentarios` (013). ajustes-ux: los namespaces de las pantallas que arregla (`registro`, `nav`, `footer`, `dar`, `visitanos`, …). |
| `apps/backoffice/src/messages/es.json` | `personasAlta`, `historialPrevio`, `etapasPersona`, `loTuyoEnLaApp` (006); `edicionesServicio`, `solicitudesServicio` (008); `ministerios`, `postulaciones` (009); `solicitudes.bautismo`, `eventos.bautismo`, `personas.bautismo` (010); `eventos.gestion/inscriptos/pagos` (011); `notificaciones` (012); `bandeja`, `perfil`, `metricas`, `cumpleanos`, `comentarios`, `cursos`, `catalogos` (013); `inicio.pendientes.extra.<clave>` (cada una, su clave). |
| `.github/workflows/ci.yml`, `docker-compose.yml`, `.env*.example` | Nadie, salvo una variable nueva imprescindible (y entonces en el PR se explica). |

---

## 4. Por feature

### 006 — Mi camino por etapas

- **Restante:** lote A (Mi camino por etapas + "Ya lo hice": `CardEtapa`, `camino.controller`, el
  resto de `camino.spec.ts`, restricciones del esquema), lote B (historial y Completitud Manual del
  Admin: `historial-admin.*`, detalle `solicitudes/historial/[id]`, fuente `historial` de la bandeja,
  pendientes por `RegistroPendientesAdmin`, sección `seccion-camino.tsx` del perfil), lote C
  (Discipulador en la web: `mis-discipulados`, `mi-disponibilidad`, Inicio, `requerirPermiso`,
  `PedirEnNombreDe` a `packages/ui`, borrar las pantallas del backoffice, la búsqueda del
  Discipulador acotada a Personas sin acceso — Pregunta 5), lote D (alta de adultos, email opcional,
  `registro.ts`, `sinAccesoALaApp`, `sonPosiblesDuplicados` con su test), cierre.
- **Carpetas propias:** `apps/api/src/camino/`, `apps/web/src/app/(app)/{mi-camino,mis-discipulados,mi-disponibilidad,inicio}/`,
  `apps/backoffice/src/app/personas/nueva/`, `apps/backoffice/src/app/solicitudes/historial/`.
- **Con otras:** expone `completoEtapa` (ya hecho) a 008/009/010; llama
  `BautismoService.retirarPorDeclaracion` al confirmar "Ya me bauticé" (H3); le da a la 010 la
  acción "Ya me bauticé" a través de la card (H2: la 006 la pone en la zona genérica de la card,
  la 010 no la implementa); D150 lo hace ajustes-ux (T021).

### 007 — Ingreso con código por email

- **Restante:** L3 (T010 resto, T011–T014), L3b (servicio, controller, throttling), L4 (web y
  backoffice), L5, L6.
- **Carpetas propias:** `apps/api/src/codigo-ingreso/`, `apps/api/src/email/plantillas/codigo-ingreso.ts`,
  `apps/web/src/app/(publica)/ingresar/`, la pantalla de ingreso del backoffice, NextAuth
  (`auth.ts` de las dos apps: solo el proveedor nuevo).
- **Con otras:** la 012 (lote C) y la 013 (lote 5) necesitan la 007 en `main` para mandar mails de
  verdad (el `EmailService` ya está, así que pueden programar contra él antes). La 011 usa el
  `destino` del ingreso. Es la primera en `registro/**` (§3).

### 008 — Vida de Servicio

- **Restante:** tipos y reglas puras de `vida-de-servicio.ts` con sus tests, `prerrequisito.ts`
  (sobre `completoEtapa`) y `efectos.ts` (rol `apto_ministerio`), lotes A (Persona y Solicitudes:
  fuente `vida_de_servicio`, detalle, `tarjeta-vida-de-servicio.tsx`, `/mi-camino/vida-de-servicio`),
  B (ediciones del Admin, bajas y finalización, pendientes), C (Líder: `mis-grupos` en la web,
  material, asistencia; `EstadoSemana` en `packages/ui`), sección `seccion-vida-de-servicio.tsx`.
- **Carpetas propias:** `apps/api/src/vida-de-servicio/`, `apps/web/src/app/(app)/{mi-camino/vida-de-servicio,mis-grupos}/`,
  `apps/backoffice/src/app/grupos/vida-de-servicio/`, `apps/backoffice/src/app/solicitudes/vida-de-servicio/`.
- **Con otras:** archivos privados por `StorageService.subirPrivado('contenidos', …)`; avisos
  `vida_servicio.*` por `emitir`; el rol `apto_ministerio` que otorga es lo que habilita la 009
  (`esAptaParaMinisterio`). `CampoArchivo` lo crea la primera de 008/011 que lo necesite, en
  `packages/ui` (bloque de la 011), y la otra lo reusa.

### 009 — Ministerios y Células

- **Restante:** tipos de respuesta, `reglas-postulacion.ts` y tests; lotes A (Persona:
  `tarjeta-ministerio.tsx`, `/mi-camino/ministerios`), B (revisión: fuente `postulacion`, detalle
  `solicitudes/postulacion/[id]`, en nombre de), C (catálogo, Células, página pública de
  Ministerios, entrada en Catálogos), D (cierre). Seed y fixtures en sus archivos.
- **Carpetas propias:** `apps/api/src/ministerio/` (salvo `miembros.ts`, que lee la 012),
  `apps/backoffice/src/app/ministerios/`, `apps/web/src/app/(publica)/ministerios/`.
- **Con otras:** necesita el rol `apto_ministerio` (008); mientras la 008 no esté, los fixtures se
  lo dan a mano. Avisos `ministerio.*` por `emitir`; el destinatario `ministerio` de la 012 ya lee
  `miembrosActivosDe`.

### 010 — Bautismo

- **Qué puede hacer antes de la 011:** casi todo. `Evento`, `InscripcionEvento` y la vista ya
  existen, y `inscribirEnBautismo`/`cancelarInscripcionBautismo` (E5) ya están implementadas. Sin
  la 011 en `main`: lote 0 propio (tipos, `estadoCardBautismo`, tests), **lote A** completo (pedir,
  ver estado, retirar, "no puedo"), **lote C** completo (habilitar, pedir en nombre), y del **lote B**
  aceptar/rechazar, la fuente `bautismo` de la bandeja y la asignación a un Evento creando los
  Eventos de bautismo por Prisma en los fixtures (sus propios helpers). Lo que **espera a la 011**:
  los e2e que crean el Evento desde la pantalla del backoffice (E9) y la sección
  `SeccionBautismoEvento` montada en `eventos/[id]` (E6), que se conecta cuando exista el detalle
  del Evento; la 011, a su vez, llama a `liberarAsignacionesDeEvento` al cancelar (E7).
- **Carpetas propias:** `apps/api/src/bautismo/` (con los archivos partidos de su `tasks.md`),
  `tarjeta-bautismo.tsx`, `apps/backoffice/src/app/solicitudes/bautismo/`, `seccion-bautismo.tsx`.
- **Con otras:** "¿completó Vida Nueva / ya se bautizó por historial?" sale de `completoEtapa`
  (sin puerto `HistorialPrevio`); avisos `bautismo.*` por `emitir`; implementa los dos hooks de
  `BautismoService` sin cambiarles la firma.

### 011 — Eventos

- **Restante:** tipos de respuesta y funciones puras, `formatearInicioEvento`, restricciones con
  test, fixtures `sembrar-e2e/011-eventos.ts`, `sede.service` (contar Eventos), lotes A (gestión,
  perfil `FLYER` y rename a `ImagenPublicaService`, QR con `NEXT_PUBLIC_WEB_APP_URL`, papelera,
  cancelar → `liberarAsignacionesDeEvento`), B (público e inscripción, `motor-cupo.ts` con la prueba
  de concurrencia, throttling), C (Mis eventos y comprobante privado), D (inscriptos, verificación,
  fuentes `inscripcion_evento` y `pago`, pendientes), E (cierre).
- **Carpetas propias:** `apps/api/src/evento/` (salvo `inscripcion-bautismo.ts`, que es de la 010
  aunque viva acá), `apps/backoffice/src/app/eventos/`, `apps/web/src/app/(publica)/eventos/`,
  `apps/web/src/app/(app)/mis-eventos/`, `apps/web/src/components/eventos/`.
- **Con otras:** el detalle de un Evento de bautismo monta la sección de la 010 en vez de la lista
  de inscriptos (E6); comprobantes por `subirPrivado('comprobantes', …)`; recordatorios: la 011
  deja los datos (`diasAnticipacionRecordatorio`) y la 012 (lote E) los manda.

### 012 — Notificaciones

- **Restante:** tests del catálogo (b–e) y de textos, `resolverDestinatarios` con su integración,
  seed demo (lote A); lote A (pantalla de Avisos, contador), B (conectar la 004 y la activación de
  cuenta), C (mails con reintentos y `tareas-programadas` con `ScheduleModule`; necesita la 007),
  D (avisos manuales del backoffice y sus DTOs), E (recordatorios de Eventos; necesita la 011).
- **El lote F ya no hace falta:** con el catálogo único y `emitir` en el lote 0, **cada spec emite
  sus propios eventos** en su código; la 012 no edita archivos de 006–011. Lo que queda de F es
  verificar, al cierre, que cada evento del catálogo tenga quien lo emita.
- **Carpetas propias:** `apps/api/src/notificaciones/`, `apps/api/src/tareas-programadas/`,
  `apps/api/src/email/plantillas/aviso.ts`, `apps/web/src/app/(app)/avisos/`,
  `apps/backoffice/src/app/notificaciones/`.

### 013 — Backoffice del Admin

- **Prioridad:** lote 1 (bandeja unificada) primero: es lo que las specs 006, 008–011 necesitan ver
  en pantalla; después lote 2 (Perfil de Persona, donde se enchufan las secciones).
- **Restante:** L1 (`GET /solicitudes` generalizado y `conteo-abiertas` en `bandeja/`, fuente
  `discipulado`, pantalla, test exhaustivo de la vista), L2 (perfil, `AvatarPersona`, mover
  `INVERSO_RELACION`), L3 (métricas con `rangoCongregacion`, `BarraProporcion`), L4 (cumpleaños),
  L5 ("Contanos", necesita la 007), L6 (Catálogos y Cursos), L7 (edición de datos, necesita la 006),
  cierre.
- **Carpetas propias:** `apps/api/src/{bandeja,inicio,comentario,curso}/`, `apps/backoffice/src/app/{solicitudes (la bandeja),personas/[id],cumpleanos,comentarios,cursos,catalogos}/`,
  `apps/backoffice/src/app/page.tsx`.
- **Con otras:** cada spec de tipo conecta su fuente sola (§2.3); hasta que L1 esté en `main`, sus
  e2e prueban el detalle entrando por URL.

### ajustes-ux — revisión de UX de `apps/web` (2026-09-30) + D150 + D151

Fuente: `specs/revision-manual/2026-09-30-ux-web.md`. Rama propia; tareas chicas, un commit por
hallazgo (D152).

- **D150:** `Button` de `apps/web` en 44 px por defecto y `text-base`; etiquetas, ayudas y botones
  en 16 px (14 px solo metadatos); campos `h-11`. Actualizar `docs/15` §Celular.
- **D151:** aspecto de `ConfirmDestructiveDialog` por `tono` — `destructivo` rojo + ícono,
  `neutro` sin rojo; pasar `tono="neutro"` en los usos reversibles que ya existen ("retirar el
  pedido", "Cerrar sesión") y cambiar el "Cancelar" por defecto por un texto con verbo (docs/15).
  Medir contraste de los dos tonos en claro y oscuro (H-56).
- **Hallazgos que hace esta sesión:** transversal #1–#6 (header, paneles laterales, pie, barra de
  la app, "Más"), Inicio público #7–#8, Nosotros #9–#10, Primeros pasos #11–#12, Visitanos #15–#17,
  Dar #18–#20, Palabra Profética #21, Ediciones VS #22–#23, Registro #26–#37 (errores que dicen qué
  hacer, botones apilados, campos de 44 px, ayudas, "Editar", consentimiento, "¡Listo!" → la app;
  #26 junto con la 007 si toca el botón de Google), Mi camino #40–#43 y #47 **solo dentro de
  `EditorDeFranjas` y de `mi-camino-cliente.tsx`** (la card de Vida Nueva), #45–#46, Perfil #50–#55.
- **Hallazgos que van a otra sesión:** #13 Ministerios público → 009 (C); #13 Eventos público → 011
  (B); #25 "Ingresar" → 007; #38–#39 Inicio de la app → 006 (C); #44 bloque punteado de Mi camino →
  006 (A, lo reemplazan las cards); #48 Mis eventos → 011 (C) y Avisos → 012 (A).
- **Archivos propios:** `packages/ui/src/components/{ui/button.tsx,confirm-destructive-dialog.tsx,editor-de-franjas.tsx,campo-*.tsx}`,
  `apps/web/src/components/` (header, pie, menús), `apps/web/src/app/(publica)/{page,nosotros,primeros-pasos,visitanos,dar}/**`,
  `apps/web/src/app/(app)/perfil/**`, `apps/web/src/app/(app)/mi-camino/mi-camino-cliente.tsx`,
  y `registro/**` en su turno (§3).
- **Cuidado:** cambiar el tamaño por defecto del `Button` afecta al backoffice si se hace en
  `packages/ui` sin variante: D150 es solo para `apps/web`. Correr los e2e de las dos apps.

---

## 5. Orden de merge sugerido

1. `lote-0-global`.
2. Las nueve en paralelo. Conviene que lleguen primero **013 L1** (bandeja), **007** (mails) y
   **006 A** (Mi camino por etapas), porque destraban pantallas y e2e de las demás.
3. Dependencias duras: 012 C y 013 L5 → después de 007. 012 E → después de 011. 013 L7 → después
   de 006. 010: las partes de §4 que esperan → después de 011. 009 usa el rol que da la 008 (sin la
   008, por fixtures).
4. Cada PR rebasea `main` antes de pedir revisión; si choca en un archivo de §3, gana el dueño de
   esa región y el otro adapta.
