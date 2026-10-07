# Implementation Plan: Mi camino por etapas, historial previo, el Discipulador en la web app y alta de adultos por el Admin

**Branch**: `006-mi-camino-etapas` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-mi-camino-etapas/spec.md`

## Summary

Cinco piezas que salen de la revisión manual de la 004 y de D142–D145/D150–D151:

1. **Mi camino por etapas** (`apps/web`): `/mi-camino` pasa a ser cuatro cards (Vida Nueva, Vida
   de Servicio, Ministerio, Bautismo) alimentadas por un endpoint nuevo, `GET /camino/me`, que
   devuelve el **estado de cada etapa** calculado en el momento. La regla de cada etapa es una
   función pura en `packages/shared-types/src/camino.ts`; tres de las cuatro quedan
   `proximamente`. Lo que hoy es Mi camino (la tarjeta de Vida Nueva de la 004) se muda a
   `/mi-camino/vida-nueva`, sin cambio de comportamiento.
2. **Historial previo**: dos modelos nuevos, `DeclaracionHistorial` (lo que la Persona declara
   con "Ya lo hice", con la forma común de las Solicitudes) y `CompletitudManual` (lo que cuenta),
   ambos por **etapa** y no por Curso. Un servicio de la API, `CaminoService`, es el único lugar
   que responde "¿completó esta etapa?" (FR-016) — las specs de Vida de Servicio, Ministerio y
   Bautismo le suman su fuente. La declaración entra a la bandeja de Solicitudes como un segundo
   tipo.
3. **El Discipulador en la web app**: `mis-discipulados`, `mis-discipulados/[id]` y
   `mi-disponibilidad` se **mueven** de `apps/backoffice` a `apps/web/src/app/(app)/`, contra la
   misma API. Lo que el Admin también usa (`PedirEnNombreDe`) baja a `packages/ui`. Navegación: un
   selector "Mi camino · Mis discipulados" dentro de Mi camino (cinco pestañas intactas), y un
   aviso de pendientes en Inicio. El backoffice saca los ítems, redirige las rutas viejas y
   muestra una pantalla terminal "Lo tuyo está en la app".
4. **Permisos** (D143): `personas.alta`, `personas.editar_email`, `historial.resolver` y
   `completitud_manual.gestionar` nuevos, solo `admin`. `solicitudes.crear_en_nombre` y
   `personas.buscar` siguen en `discipulador`, ahora consumidos desde la web app.
5. **Alta de adultos** (D145, Flujo 12): `POST /personas/alta` con los mismos campos y
   validaciones del registro (extraídas a un solo lugar), email opcional, aviso de posible
   duplicado (409 `POSIBLE_DUPLICADO` con las coincidencias, reintento con
   `confirmarPosibleDuplicado: true`) y `PATCH /personas/:id/email`. `Persona.email` pasa a
   `String? @unique`.

**Esta corrida es solo documentación**: spec, plan, research, data-model, contratos, quickstart y
tasks. No se escribe código.

## Technical Context

**Language/Version**: TypeScript en Node.js 22+, el stack del monorepo. Sin lenguaje nuevo.

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js +
`next-intl` (`apps/web`, `apps/backoffice`); `packages/shared-types` (tipos, permisos, códigos de
error, reglas puras); `packages/ui` (`Button`, `useEnvio`, `useValidacionCampos`,
`ResumenErrores`, `MensajeErrorCampo`, `EditorDeFranjas`, `ConfirmDestructiveDialog`,
`EstadoVacio`, `CampoTelefono`, `CampoFecha`). **No se agrega ninguna dependencia.**

**Storage**: PostgreSQL vía Prisma. Dos modelos nuevos (`DeclaracionHistorial`,
`CompletitudManual`), tres enums nuevos (`EtapaCamino`, `EstadoDeclaracion`,
`OrigenCompletitud`), `Persona.email` opcional, y en SQL dentro de la migración los índices únicos
parciales (una declaración `pendiente` y una Completitud vigente por Persona y etapa) y los
índices de `Persona.telefono` y `Persona.fechaNacimiento` para el aviso de duplicado (patrón
H-140). Ver `data-model.md`.

**Testing**: Jest unit e integración (`apps/api`), Jest en `packages/shared-types` para las
reglas puras, y Playwright con `axe` en los dos temas en `apps/web` y `apps/backoffice`. La web
app suma un proyecto **`celular`** de Playwright (hoy solo lo tiene el backoffice), porque las
pantallas del Discipulador se usan en el teléfono (FR-027, SC-005).

**Target Platform**: Docker Compose local, igual que el resto (D130).

**Project Type**: la web application existente. Extiende `apps/api`, `apps/web`,
`apps/backoffice`, `packages/shared-types` y `packages/ui`, sin proyectos nuevos.

**Performance Goals**: sin meta propia. `GET /camino/me` es una consulta por fuente (Solicitud
abierta, Inscripción de Vida Nueva, declaraciones, Completitudes) para una sola Persona, en
paralelo; la búsqueda de duplicados usa índices sobre `telefono` y sobre `fechaNacimiento`, y
compara nombre y apellido normalizados en la API entre las pocas Personas con esa misma fecha —
sin extensión `unaccent` (research #7).

**Constraints**:
- La regla de habilitación de cada etapa vive en **una función pura** (`reglaDeEtapa`, en
  `shared-types`) y la consulta "¿completó?" en **un servicio** (`CaminoService.completoEtapa`, en
  la API). Ni las pantallas ni otros servicios las reimplementan (Principio XI).
- Pedir Vida Nueva, declararla y registrar su Completitud quedan **serializados** bloqueando la
  fila de la Persona (`FOR UPDATE`, patrón D137/H-142), para que no coexistan un pedido y una
  declaración por una carrera.
- La API del Discipulador **no cambia** (pedido del spec, FR-020). Los únicos cambios a endpoints
  existentes son: el pedido de Vida Nueva rechaza por historial (FR-017), la bandeja de
  Solicitudes suma un tipo (FR-012) y las respuestas que incluyen `email` lo vuelven `string |
  null` (FR-038).
- Ninguna regla de acceso se declara fuera de `CATALOGO_PERMISOS` (D132); "es tu declaración" lo
  decide el servicio (Principio V).
- Ninguna declaración ni Completitud escribe roles (FR-019).

**Scale/Scope**: 2 modelos nuevos, 4 permisos nuevos, ~11 endpoints nuevos, 3 que cambian; en
`apps/web`, 1 pantalla rehecha (Mi camino), 1 nueva (`/mi-camino/vida-nueva`), 3 movidas
(`/mis-discipulados`, `/mis-discipulados/[id]`, `/mi-disponibilidad`) y 1 que suma un aviso
(Inicio); en `apps/backoffice`, 1 detalle nuevo (`/solicitudes/historial/[id]`), 1 alta nueva
(`/personas/nueva`), 2 modificadas (bandeja de Solicitudes, Personas) y 1 pantalla terminal; 4
rutas que pasan a redirigir.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec o ADR antes del código? | PASA — la spec se deriva de D142–D145, D147, D150–D151 y de `docs/04`/`07`. Las cinco decisiones nuevas de este plan quedan escritas abajo con su porqué, para numerarse al mergear. Corrida solo de documentación. |
| II. Terminología | ¿Nombres canónicos? | PASA — **Completitud Manual** y **Persona** como en `docs/04`. La entidad nueva **Declaración de Historial** se agrega a `docs/04` al mergear (Cambios a docs). En pantalla, "Mi camino", "Ya lo hice", "Registrado por la iglesia"; nunca el nombre del modelo (FR-040). |
| III. Soft delete | ¿Se borra algo? | PASA — una declaración retirada o rechazada es un estado; anular una Completitud es `anuladaEn`/`anuladaPorId`; mover pantallas borra **código**, no datos. |
| IV. Simplicidad | ¿Algo sin spec? | PASA con una nota — `EtapaCamino` incluye `vida_de_servicio`, `ministerio` y `bautismo`, que no tienen flujo: se modelan porque D144 pide "Ya lo hice" en **cada** card y `docs/04` define la Completitud Manual como la vía de los prerrequisitos de esas etapas. No se construye ninguno de sus pedidos, ni roles, ni la habilitación de Bautismo por el Admin. |
| V. Seguridad | ¿Autorización por registro? | PASA en diseño — `GET /camino/me` y las declaraciones propias se recortan por la sesión (D134); resolver y registrar es `admin`; el alta es `admin` (D143); las pantallas del Discipulador en la web app exigen permiso y la API ya valida pertenencia. El alta registra consentimiento presencial y autor (D78, `docs/03` trazabilidad). |
| VI. Testing | ¿Reglas con ramas testeadas? | A CUBRIR en `tasks.md` — unit de `reglaDeEtapa` (las cuatro etapas), `estadoDeEtapa`, `puedeDeclarar`, normalización de teléfono/nombre y detección de duplicados; integración de declarar/confirmar/rechazar/retirar, registrar/anular, la carrera pedido↔declaración, el rechazo del pedido por historial, el alta con y sin email y con duplicado; e2e de los tres flujos críticos (FR-042). |
| VII. Accesibilidad | ¿WCAG y axe en los dos temas? | A CUBRIR en `tasks.md` — checklist de `docs/15` por pantalla (D114), axe claro/oscuro, proyecto `celular` nuevo en `apps/web`, estados con texto + ícono (D81). |
| VIII. Experiencia consistente | ¿Cuatro estados, una acción principal, `useEnvio`? | A CUBRIR en `tasks.md`, por pantalla. Confirmaciones reversibles neutras (D151), tamaños de D150. |
| IX. Idiomas | ¿Textos por next-intl, claves estables? | A CUBRIR — etapas y estados como claves (`EtapaCamino`, `EstadoEtapa`); los subtítulos de Primeros pasos se **reusan** por clave (una sola fuente de texto). |
| X. Errores | ¿Un código por regla nueva? | PASA en diseño — diez códigos nuevos listados en `data-model.md` y `contracts/` (`DECLARACION_YA_PENDIENTE`, `ETAPA_YA_COMPLETADA`, `ETAPA_EN_CURSO`, `DECLARACION_NO_PENDIENTE`, `COMPLETITUD_NO_VIGENTE`, `HISTORIAL_VIDA_NUEVA_EN_REVISION`, `VIDA_NUEVA_COMPLETADA_POR_HISTORIAL`, `POSIBLE_DUPLICADO`, `ALTA_MENOR_DE_EDAD`, `EMAIL_YA_CARGADO`). Se reutilizan los que significan lo mismo (`EMAIL_DUPLICADO`, `VALIDACION`, `NO_ENCONTRADO`, `EDAD_INSUFICIENTE_PARA_PEDIR_SOLO`). |
| XI. Una sola fuente de verdad | ¿Nada duplicado? | PASA en diseño — reglas de etapa en `shared-types`; "¿completó?" en `CaminoService`; validaciones del registro extraídas para registro y alta; `PedirEnNombreDe` en `packages/ui` (lo usan Admin y Discipulador); `tienePermisoSesion` deja de ser del backoffice; los subtítulos de las etapas, una clave por etapa usada por Primeros pasos y Mi camino. Las pantallas del Discipulador se **mueven**, no se copian. |

Sin violaciones. **Re-chequeo después del diseño:** sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/006-mi-camino-etapas/
├── spec.md
├── plan.md              # este archivo
├── research.md          # Fase 0 — 14 decisiones
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 — escenarios de validación
├── contracts/
│   ├── camino-api.md          # estado de etapas, declarar, retirar
│   ├── historial-admin-api.md # bandeja, resolver, registrar/anular Completitud
│   ├── personas-alta-api.md   # alta, aviso de duplicado, agregar email, email opcional
│   ├── navegacion.md          # web app (selector, rutas, aviso), backoffice (ítems, redirecciones, terminal)
│   └── eventos.md             # la costura para notificaciones (spec 012)
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── camino.ts                 # NUEVO: EtapaCamino, ETAPAS_CAMINO (orden), EstadoEtapa,
│                             #   reglaDeEtapa(), estadoDeEtapa(), puedeDeclarar(), ETAPAS_CONSTRUIDAS
├── persona.ts                # email: string | null; DatosAltaPersona; CoincidenciaDuplicado;
│                             #   normalizarTelefono(), normalizarNombre() (los usa la API)
├── registro.ts               # NUEVO: validaciones del registro extraídas (registro + alta)
├── permisos.ts               # 4 permisos nuevos; tienePermisoSesion pasa acá (genérico)
├── error-code.ts             # 10 códigos nuevos
├── eventos-historial.ts      # NUEVO: eventos de FR-018
└── index.ts

packages/ui/src/components/
├── pedir-en-nombre-de.tsx    # MOVIDO desde apps/backoffice/src/components/ (Admin + Discipulador)
└── card-etapa.tsx            # NUEVO: la card de una etapa (sin Next; recibe el enlace por prop)

apps/api/
├── prisma/schema.prisma      # DeclaracionHistorial, CompletitudManual, enums; Persona.email opcional
├── prisma/migrations/<fecha>_camino_historial_email_opcional/   # + SQL de índices parciales
├── prisma/seed-demo.ts       # FR-043
└── src/
    ├── camino/               # NUEVO módulo
    │   ├── camino.module.ts
    │   ├── camino.service.ts        # completoEtapa(), estadoDeEtapas(); la ÚNICA fuente de FR-016
    │   ├── camino.controller.ts     # GET /camino/me, POST/DELETE /camino/me/declaraciones
    │   ├── historial-admin.service.ts / .controller.ts  # resolver, registrar, anular
    │   └── eventos.ts
    ├── solicitud-discipulado/       # crear(): rechazo por historial (FR-017); bandeja: tipo nuevo
    └── persona/                     # alta, duplicados, agregar email; email opcional en selects

apps/web/src/
├── app/(app)/mi-camino/             # page.tsx rehecho: cards + selector
│   ├── vida-nueva/                  # NUEVO: lo que era mi-camino-cliente.tsx (004)
│   └── selector-mi-camino.tsx
├── app/(app)/mis-discipulados/      # MOVIDO desde apps/backoffice (+ [id])
├── app/(app)/mi-disponibilidad/     # MOVIDO desde apps/backoffice
├── app/(app)/inicio/page.tsx        # aviso de pendientes del Discipulador
├── config/nav-app.ts                # rutasRelacionadas de Mi camino; SUBNAV_MI_CAMINO por permiso
├── auth.ts                          # requerirPermiso() en la web app (mismo resolutor del catálogo)
└── messages/es.json                 # miCamino.etapas.*, misDiscipulados.*, miDisponibilidad.* (movidos)

apps/backoffice/src/
├── app/solicitudes/                 # bandeja con tipo "Historial previo"; historial/[id]/ NUEVO
├── app/personas/                    # "Dar de alta", "Registrar una etapa hecha", "Agregar email",
│   └── nueva/                       #   "Sin acceso a la app"; NUEVO formulario de alta
├── app/mis-discipulados/, mi-disponibilidad/, mis-grupos/   # pasan a redirect (page.tsx de 5 líneas)
├── app/page.tsx + not-found.tsx     # pantalla terminal "Lo tuyo está en la app"
└── config/nav.ts                    # sin los tres ítems; entradas de las rutas nuevas
```

**Structure Decision**: se extiende la web application existente. El código de la 004 que solo usa
el Discipulador se mueve con `git mv` (conserva la historia) de `apps/backoffice/src/app/` a
`apps/web/src/app/(app)/`, y se ajusta a la web app (cliente de API, `next-intl` de la web,
tamaños de D150). Lo que usan las dos apps baja a `packages/ui`.

## Dependencias con otras specs

| Depende de | Qué usa | Estado |
|---|---|---|
| **004** Vida Nueva / Discipulado | `EstadoMiDiscipulado`, `GET /discipulado/me`, el pedido (`POST /discipulado/solicitudes[/me]`), la bandeja `GET /solicitudes`, toda la API del Discipulador, las pantallas que se mueven. | En `main`. |
| **005** Roles, permisos y acceso | `CATALOGO_PERMISOS`, `PermisosGuard`, `RolesDeEstadoService.otorgarRolDeEstado` (para `miembro_registrado` en el alta), `itemDeAterrizaje`. | En `main`. |
| **001** Fase de Bienvenida | El formulario y las validaciones del registro (Flujo 2), `CampoTelefono`, el normalizado de teléfono (D90). | En `main`. |
| **007** Ingreso con código por email | "Si después se le agrega un email, entra con el código" (D145). Esta spec **no** depende de 007 para nada propio; 007 **sí** tiene que convivir con `Persona.email` opcional (ver nota abajo). | En paralelo (`origin/007-ingreso-codigo-email`). |
| **012** Notificaciones | Envía los eventos de FR-018. | Futura. |
| Specs de **Vida de Servicio**, **Ministerio** y **Bautismo** | **Consumen** lo de esta spec: `CaminoService.completoEtapa`, `reglaDeEtapa`, y sacan su etapa de `ETAPAS_CONSTRUIDAS`/`proximamente`. Bautismo construye la habilitación por el Admin (D147). Vida de Servicio construye Mis grupos en la web app (D142). | Futuras. |

**Nota de coordinación con 007:** si 007 se mergea antes, su búsqueda de Persona por email ya no
puede asumir `email` no nulo en los tipos (`string | null`); si se mergea después, al rebasear
tiene que tomar el `schema.prisma` con `email String?`. Ninguna de las dos specs cambia el
significado de la otra: 007 busca por un email concreto, que nunca coincide con un `NULL`.

**Nota de coordinación con D150:** si otra spec implementa antes el `Button` de 44 px y la letra
de 16 px como default de `apps/web`, la tarea T005 de esta spec se reduce a usarlo; si no, la hace
esta spec (y actualiza `docs/15`).

## Paralelización (para `/speckit-tasks`)

- **Lote 0 — base (secuencial, una sola sesión):** `packages/shared-types` (`camino.ts`,
  `registro.ts`, `persona.ts`, permisos, códigos, eventos, `tienePermisoSesion` genérico);
  `schema.prisma` + migración + SQL; el módulo `camino` registrado con `CaminoService.completoEtapa`
  (lo usan A y D); `PedirEnNombreDe` a `packages/ui`; `CardEtapa` en `packages/ui`; el proyecto
  `celular` de Playwright en `apps/web`; `requerirPermiso` en `apps/web/src/auth.ts`; D150 si
  falta; las entradas de `nav.ts`/`nav-app.ts`; los namespaces de los dos `es.json`; fixtures y
  seed base.
- **Lote A — Mi camino e historial (Persona):** `apps/api/src/camino/` (controller y
  `estadoDeEtapas`), `apps/web/src/app/(app)/mi-camino/` (cards, `vida-nueva/`, "Ya lo hice") y
  sus tests.
- **Lote B — historial (Admin):** `historial-admin.*`, la bandeja (tipo nuevo, filtro visible),
  `apps/backoffice/src/app/solicitudes/historial/[id]`, "Registrar una etapa hecha" en Personas, y
  el rechazo por historial en `solicitud-discipulado` (FR-017).
- **Lote C — Discipulador a la web app:** mover `mis-discipulados`, `[id]`, `mi-disponibilidad`
  a `apps/web`; selector; aviso en Inicio; redirecciones y pantalla terminal del backoffice;
  mover los e2e del Discipulador.
- **Lote D — alta de adultos y email opcional:** `apps/api/src/persona/` (alta, duplicados,
  email), `apps/backoffice/src/app/personas/nueva/`, "Sin acceso a la app" y "Agregar email", la
  auditoría de usos de `email` (FR-038).

Dependencias reales entre lotes: B y D tocan los dos `apps/backoffice/src/app/personas/` — B suma
una acción en la fila y D otra; se coordinan en `personas-cliente.tsx` (o B va después de D). A
y B comparten `camino.service.ts`, que el lote 0 deja con `completoEtapa`; A le agrega
`estadoDeEtapas` y B no lo toca. C no comparte archivos con A, B ni D salvo `es.json` (namespaces
separados que deja el lote 0). El e2e "declarar → confirmar → Mi camino actualizado" cruza A y B:
va al final.

## Decisiones nuevas (se numeran al mergear)

No se editó `docs/05-decisiones.md` (lo editan todas las sesiones en paralelo). Estas cinco
decisiones se le agregan al mergear, con el número que siga:

1. **La Completitud Manual se registra por etapa del camino, no por Curso.** Hay un valor
   `EtapaCamino` (`vida_nueva`, `vida_de_servicio`, `ministerio`, `bautismo`) y tanto la
   Declaración de Historial como la Completitud Manual lo usan como clave. Para las etapas que son
   Cursos, la etapa corresponde a `Curso.categoria` (Vida Nueva individual y grupal cuentan igual,
   como ya dice `docs/04`). **Por qué:** D144 pide "Ya lo hice" en **cada** card, y Bautismo y
   Ministerio no son Cursos — no hay Curso al que colgarles la Completitud. Atarla a `cursoId`
   además obligaría a elegir entre la variante individual y la grupal de Vida Nueva para algo que
   la Persona hizo en otra iglesia, donde la distinción no existe. Enmienda la redacción de
   `docs/04` ("marcó a una Persona como si hubiera completado un Curso") en la forma, no en el
   fondo: sigue siendo la vía de excepción para destrabar prerrequisitos.
2. **"Ya lo hice" crea una Declaración de Historial con la forma común de las Solicitudes, y
   confirmarla crea la Completitud Manual; son dos entidades, no una con estado.** **Por qué:** la
   declaración es lo que la Persona *dice* (puede retirarse, rechazarse y volver a pedirse, con
   historial); la Completitud es lo que el sistema *cuenta* para los prerrequisitos (FR-016). Si
   fueran una sola fila con estado, cada consulta de prerrequisito tendría que filtrar "confirmada
   y no anulada" y las Completitudes que el Admin registra directamente (Flujo 9, sin
   declaración) tendrían que fingir una declaración. Con la forma común (`personaId`, `estado`,
   `creadoPorId`, `revisadoPorId`, fecha) la declaración entra a la bandeja unificada sin un caso
   especial, que es para lo que D31 mantuvo esa forma.
3. **Una única consulta "¿completó esta etapa?" en la API (`CaminoService.completoEtapa`), que
   cada spec de etapa extiende con su fuente "por el sistema", y una única regla de habilitación
   por etapa en `shared-types` (`reglaDeEtapa`).** **Por qué:** `docs/04` dice que el prerrequisito
   se chequea "por ambos caminos" — si cada spec (Vida de Servicio, Ministerio, Bautismo) escribe
   su propio chequeo, la Completitud Manual se va a olvidar en alguna, y es exactamente la vía de
   excepción que nadie prueba en el camino feliz. La regla pura vive en `shared-types` porque Mi
   camino la necesita para el texto ("se habilita cuando completes Vida Nueva") y la API para
   rechazar, y no pueden discrepar (D132 aplicado a reglas de negocio, Principio XI).
4. **Lo del Discipulador en la web app va dentro de Mi camino, con un selector "Mi camino · Mis
   discipulados"; las cinco pestañas no cambian.** Mi disponibilidad se abre desde Mis
   discipulados; el Inicio muestra un aviso cuando hay pendientes; la pestaña Mi camino queda
   marcada en las tres rutas. **Por qué:** `docs/14` fija cinco pestañas y una sexta solo para
   algunos rompe la barra para todos. Mi camino ya es "lo mío en el proceso", y acompañar a otros
   es parte de ese mismo proceso (es la etapa Red de `docs/12`); Perfil es configuración personal
   y "Más" son páginas públicas (H-37). El selector escala: la spec de Vida de Servicio suma "Mis
   grupos" del Líder de curso en el mismo lugar. Pendiente de confirmación de Echu (pregunta 1).
5. **El backoffice no tiene pantallas personales.** Con D142, `mis-discipulados`,
   `mi-disponibilidad` y el cascarón de `mis-grupos` salen del backoffice; sus rutas redirigen a la
   web app, y quien no tiene ningún ítem aterriza en una pantalla terminal "Lo tuyo está en la
   app" (nunca un error ni un bucle, H-134). La URL de la web app la recibe el backoffice por
   variable de entorno (`NEXT_PUBLIC_WEB_APP_URL`). **Por qué:** D142 dice que Discipuladores y
   Líderes usan la web app "para todo lo suyo"; dejar Mis grupos como cascarón vacío en el
   backoffice contradiría eso y haría que el Líder de curso aterrice en una pantalla sin nada. Las
   redirecciones existen porque esas URLs ya están en favoritos y en mensajes de WhatsApp de la
   revisión manual.

Decisiones menores, solo en `research.md` (no van a `docs/05`): normalización para duplicados
(#7), forma del 409 de duplicado (#8), reutilización de textos de Primeros pasos (#3), D150 en
la web app (#12).

## Cambios a docs al mergear

- `docs/04-dominio-entidades.md`: agregar **Declaración de Historial**; precisar **Completitud
  Manual** (por etapa, origen `declaracion`/`admin`, anulable, una vigente por Persona y etapa);
  sumar la Declaración al "Patrón común de Solicitudes"; y en Persona dejar `email` opcional sin
  la salvedad "cuando el alta la hace el Admin" (ya lo dice).
- `docs/diagrama-er.mermaid`: las dos entidades nuevas y sus relaciones con Persona.
- `docs/03-roles-permisos.md`: en **Discipulador**, quitar "Puede dar de alta Personas (… adultos,
  Flujo 12)" (D143) y "acceso a back office limitado a lo suyo" → "usa la web app (D142)"; en
  **Líder de curso**, ídem; en **Admin**, sumar "confirmar el historial previo (D144)".
- `docs/07-flujos-casos-de-uso.md`: Flujo 12 — actor "Admin" (sin "o Discipulador", D143), paso
  2 con el aviso de posible duplicado (D145); Flujo 9 — la Completitud Manual por etapa y su
  anulación; Flujo 3 paso 4 — "entra a la web app" en vez de "al back office"; un apartado nuevo
  (o un paso en el Flujo 9) para el historial previo: declarar → revisar → confirmar/rechazar.
- `docs/14-navegacion.md`: §2, el selector "Mi camino · Mis discipulados" y el aviso de Inicio;
  §3, quitar las filas **Discipulador** y **Líder de curso** del menú del backoffice, y en Admin
  "Personas (incluye alta de adultos, D97)" queda igual; anotar la pantalla terminal.
- `docs/15-guia-ux-ui.md`: el glosario ("Ya lo hice", "Registrado por la iglesia", "Historial
  previo"), y la sección Celular con D150 (si la implementa esta spec, T005).
- `docs/02-alcance-mvp.md`: "Alta de Personas adultas por el Admin" (sin "o un Discipulador").
- `docs/12-contenido-bienvenida.md`: el texto provisorio de Bautismo, marcado D98, si Echu no da
  otro (pregunta 3).
- `docs/05-decisiones.md`: las cinco decisiones de arriba, numeradas.

## Complexity Tracking

Sin violaciones de la Constitución que justificar.
