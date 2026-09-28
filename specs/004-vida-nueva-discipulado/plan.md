# Implementation Plan: Vida Nueva / Discipulado

**Branch**: `004-vida-nueva-discipulado` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-vida-nueva-discipulado/spec.md`

## Summary

La segunda tajada del camino de integración (Bienvenida → **Vida Nueva** → Vida de Servicio →
Ministerio). Una Persona pide empezar Vida Nueva desde **Mi camino** indicando sus horarios, o
alguien del equipo lo pide en su nombre. El Admin ve el **cruce** de esos horarios con la agenda de
cada Discipulador disponible, ordenado por **reglas de asignación** (horario y género, D138) y con
uno **sugerido**, y le **propone** el discipulado a uno; el Discipulador lo **acepta** desde el
teléfono, y ahí se arman el Grupo, la Inscripción y el Liderazgo. El Discipulador registra cada
Encuentro con su Asistencia, y propone la finalización o la baja de una Persona, que el Admin
confirma o rechaza. La reasignación pasa por el mismo cruce y la misma aceptación. Un Grupo puede
tener varias Personas, hasta el máximo que su Discipulador define.

Se apoya en lo que el spec 005 dejó construido y **no lo vuelve a decidir**: el catálogo de
permisos (D132), el otorgamiento del rol `discipulador` (D131) y su auditoría, y la exclusión de
menores de los roles de cargo (D133). Además **cierra H-127**: la guarda que hoy impide quitar
`discipulador` a cualquiera pasa a bloquear solo a quien tiene discipulados activos o propuestas
pendientes, calculados en el momento (D137).

**Actualizado el 2026-09-27** con la segunda y tercera ronda de decisiones de Echu (ver
`spec.md` → Clarifications). Lo que cambió respecto de la primera versión del plan: la agenda y el
cruce (research #7, #12), la propuesta y aceptación con su entidad `PropuestaDiscipulado` (#13),
los Grupos de varias Personas (#14), la baja (#15), la edición del pedido y del Encuentro (#5,
#16), los eventos (#17) y el celular (#18).

## Technical Context

**Language/Version**: TypeScript en Node.js 22+, el mismo stack del monorepo. Sin lenguaje nuevo.

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js
(`apps/web`, `apps/backoffice`); `packages/shared-types` (tipos, permisos, códigos de error, la
fecha de hoy); `packages/ui` (`TablaDatos`, `ControlesTabla`, `Sheet`, `useEnvio`,
`useValidacionCampos`, `ResumenErrores`, `EstadoVacio`). **No se agrega ninguna dependencia.**

**Storage**: PostgreSQL vía Prisma. Once modelos nuevos (`Curso`, `FranjaAgenda`,
`FranjaSolicitud`, `SolicitudDiscipulado`, `PropuestaDiscipulado`, `Grupo`, `Inscripcion`,
`Liderazgo`, `Encuentro`, `Asistencia`, `BloqueoDisponibilidad`: ver `data-model.md`), dos campos
nuevos en `Persona` (`disponibleDiscipulado`, `maxPersonasPorGrupo`) y, en SQL dentro de la
migración, los índices únicos parciales y los CHECK (patrón H-140).

**Testing**: Jest unit e integración (`apps/api`) y Playwright con `axe` en los dos temas
(`apps/web`, `apps/backoffice`) — Principios VI y VII. Las pantallas del Discipulador suman un
proyecto `celular` de Playwright (FR-046, research #18).

**Target Platform**: Docker Compose local, igual que el resto (D130: una instalación por iglesia).

**Project Type**: la web application existente. Extiende `apps/api`, `apps/web`, `apps/backoffice`
y `packages/shared-types`, sin proyectos nuevos.

**Performance Goals**: sin meta propia. Son decenas de discipulados por iglesia: los listados se
paginan (H-42), y el conteo de discipulados activos del listado de Personas es una sola consulta
agrupada por página, no una por fila.

**Constraints**:
- Las notas de los Encuentros las ve **solo** el Discipulador vigente (D134, FR-029). Ningún
  `select` de la vista administrativa ni de Mi camino las incluye, y un test de integración lo
  afirma.
- Ninguna regla de acceso se declara fuera de `CATALOGO_PERMISOS` (D132). "Es tu discipulado" lo
  decide el servicio (Principio V).
- Las operaciones que crean una Propuesta o un Liderazgo y la quita del rol quedan serializadas
  bloqueando la fila de la Persona (D137, H-142).
- Ningún Grupo ni Liderazgo se crea sin una aceptación explícita del Discipulador (SC-009).
- Las reglas de asignación viven en un solo módulo, una función pura por regla (D138); ni el cruce
  ni la pantalla reimplementan ninguna.

**Scale/Scope**: 11 modelos nuevos, 5 permisos nuevos, unos 30 endpoints, 1 pantalla de
`apps/web` (Mi camino), 4 pantallas del backoffice reescritas desde su placeholder más 3 detalles
nuevos (`/solicitudes/[id]`, `/grupos/[id]`, `/mis-discipulados/[id]`), 1 tarjeta en Inicio, y 1
pantalla del 005 que cambia (Personas).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec aprobada antes del código? | PASA — `spec.md` reactivado, con dos sesiones de `/speckit-clarify` (23/9 y 27/9) y alineado con D134. La única decisión nueva de arquitectura (D137) quedó confirmada por Echu y escrita antes de este plan. |
| II. Terminología | ¿Nombres canónicos? | PASA — Solicitud de Discipulado, Grupo, Inscripción, Liderazgo, Encuentro, Asistencia y Bloqueo de Disponibilidad, como en `docs/04`. En pantalla, "Mi camino" y no la jerga interna (Principio VIII). |
| III. Soft delete | ¿Se borra algo físicamente? | PASA — ninguna operación borra. `Curso` tiene `activo`. Reasignar **cierra** un Liderazgo (`hasta`). Las franjas de agenda y los períodos de no disponibilidad, que el Discipulador "borra" (FR-031, FR-040), llevan `eliminadaEn`/`eliminadoEn` y toda consulta los filtra. Retirar una Solicitud es un estado (`retirada`), no un `DELETE`. Encuentros no se borran, se editan (FR-041). |
| IV. Simplicidad | ¿Algo sin spec? | PASA — no se construyen motivo de rechazo de Solicitud, `liberacion_programada`, `apto_ministerio`, una tabla de eventos ni reglas configurables. `TipoCurso.grupal` e `Inscripcion.dada_de_baja` se modelan porque `docs/04` lo pide, sin flujo. Todo lo nuevo de esta ronda (agenda, propuesta, baja, edición, máximo por Grupo) traza a un FR de la segunda o tercera ronda. |
| V. Seguridad | ¿Autorización por registro? | PASA en diseño — Liderazgo vigente o 404; una propuesta pendiente da acceso a la propuesta, **no** al contacto (FR-011). Los datos de contacto, incluido el del tutor de un menor (FR-044), salen por un solo endpoint (SC-003). Los motivos de declinación los ve solo el Admin. A los tests les toca probar el acceso ajeno. |
| VI. Testing | ¿Reglas con ramas testeadas? | A CUBRIR en `tasks.md` — unit de cada regla de asignación, del sugerido, de `franjasCoinciden`, de `puedeQuitarRol`, de "cursa o completó" y de las transiciones de Solicitud, Propuesta, Grupo e Inscripción; integración de proponer, aceptar, declinar, retirar, confirmar, baja y las carreras de D137; e2e del flujo crítico, y en celular para el Discipulador. |
| VII. Accesibilidad | ¿WCAG y axe en los dos temas? | A CUBRIR en `tasks.md` — el checklist de `docs/15-guia-ux-ui.md` por pantalla (D114), axe claro/oscuro en el e2e crítico, y el proyecto `celular` para las pantallas del Discipulador (FR-046). |
| VIII. Experiencia consistente | ¿Cuatro estados, una acción principal, `useEnvio`? | A CUBRIR en `tasks.md`, por pantalla. El patrón ya existe (Personas, pendientes-tutor). |
| IX. Idiomas | ¿Textos por next-intl, claves estables? | A CUBRIR en `tasks.md` — estados como claves (`EstadoSolicitud`, `EstadoGrupo`), y la regla `sin-texto-fijo-en-sr-only` ya corre en los tres configs. |
| X. Errores | ¿Un código por regla nueva? | PASA en diseño — un código por regla, listados en los contratos (se reutilizan los que ya significan lo mismo: `NO_ENCONTRADO`, `VALIDACION` para los errores de campo, y `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`, que el 005 dejó reservado). Se elimina `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS` en vez de reutilizarlo con otro significado. |
| XI. Una sola fuente de verdad | ¿Nada duplicado? | PASA en diseño — discipulados activos y propuestas pendientes en una función (D137); `Franja`, `franjasCoinciden`, "hoy", los topes y los tipos en `shared-types`; las reglas en un módulo (D138); el cruce es un solo servicio que usan proponer y reasignar; el horario de un Grupo se deriva, no se guarda; y `puedeQuitarRol` sigue siendo la única respuesta para la API y la pantalla. |

Sin violaciones. **Re-chequeo después del diseño:** sin cambios. La Fase 1 no agregó nada que
contradiga la tabla.

## Project Structure

### Documentation (this feature)

```text
specs/004-vida-nueva-discipulado/
├── spec.md
├── plan.md              # este archivo
├── research.md          # Fase 0 — 19 decisiones
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 — 17 escenarios de validación
├── contracts/
│   ├── solicitudes-api.md    # pedir, editar/retirar, bandeja, cruce, proponer
│   ├── discipulado-api.md    # propuestas, Encuentros, finalización, baja, reasignación
│   ├── disponibilidad-api.md # agenda, toggle, bloqueos, máximo por Grupo
│   └── eventos.md            # la costura para notificaciones
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── permisos.ts              # EXTENDIDO — 5 permisos nuevos; puedeQuitarRol recibe
│                            # discipuladosActivos y propuestasPendientes (D137, FR-043)
├── error-code.ts            # EXTENDIDO — los códigos de los contratos, 1 eliminado
├── discipulado.ts           # NUEVO — Franja, franjasCoinciden, EstadoSolicitud, Cruce,
│                            # PropuestaParaMi, EstadoMiDiscipulado, Encuentro*, MiDiscipulado…
├── disponibilidad.ts        # NUEVO — MiDisponibilidad, hoyEnArgentina(), topes
├── eventos-discipulado.ts   # NUEVO — EventoDiscipulado (contracts/eventos.md)
└── index.ts                 # EXTENDIDO

packages/ui/src/components/
└── editor-de-franjas.tsx    # NUEVO — día + hora inicio/fin (24 h), varias franjas; etiquetas de
                             # los días por prop desde next-intl (H-151). Lo usan apps/web (Mi
                             # camino) y apps/backoffice (Mi disponibilidad, pedir en nombre de).

apps/api/
├── prisma/schema.prisma           # EXTENDIDO — 11 modelos, Persona.disponibleDiscipulado y
│                                  # .maxPersonasPorGrupo
├── prisma/migrations/…_discipulado/  # NUEVA — índices parciales y CHECK en SQL
├── prisma/seed.ts                 # EXTENDIDO — el Curso Vida Nueva
├── scripts/limpiar-e2e.ts         # EXTENDIDO — lo que cuelga de Personas e2e- (H-67)
└── src/
    ├── solicitud-discipulado/     # NUEVO — pedir, editar/retirar, en nombre de, bandeja,
    │                              # detalle+historial, proponer, retirar, rechazar
    ├── discipulado/               # NUEVO
    │   ├── discipulados-activos.ts    # D137: activos + propuestas pendientes
    │   ├── reglas-de-asignacion/      # D138: horario.ts, genero.ts, reglas.ts
    │   ├── cruce.service.ts           # el cruce + sugerido (lo usan proponer y reasignar)
    │   ├── propuestas.service.ts      # aceptar / declinar
    │   ├── mis-discipulados.service.ts, encuentros.service.ts, finalizacion.service.ts,
    │   ├── baja.service.ts, reasignacion.service.ts, grupos.service.ts (vista adm.)
    │   ├── pendientes-admin.service.ts
    │   └── eventos.ts                 # emitirEventoDiscipulado()
    ├── disponibilidad/            # NUEVO — agenda, toggle, bloqueos, máximo
    ├── persona/roles.service.ts   # EXTENDIDO — quitarRol con las dos listas (H-127)
    ├── persona/persona.service.ts # EXTENDIDO — el listado expone quitar.discipulador real
    └── app.module.ts              # EXTENDIDO

apps/web/src/
├── app/(app)/mi-camino/            # REESCRITO — pedir con franjas, editar, retirar, estados
└── messages/es.json                # EXTENDIDO — miCamino

apps/backoffice/
├── playwright.config.ts            # EXTENDIDO — proyecto `celular` para @celular (FR-046)
└── src/
    ├── config/nav.ts               # EXTENDIDO — /solicitudes/[id], /grupos/[id],
    │                               # /mis-discipulados/[id] (enMenu: false)
    ├── app/page.tsx                # EXTENDIDO — tarjeta "Pendientes" del Admin (FR-048)
    ├── app/solicitudes/ y [id]/    # REESCRITO/NUEVO — bandeja, detalle, cruce, proponer
    ├── app/grupos/ y [id]/         # REESCRITO/NUEVO — vista adm., finalización, baja, reasignación
    ├── app/mis-discipulados/ y [id]/  # REESCRITO/NUEVO — propuestas, discipulados, Encuentros
    ├── app/mi-disponibilidad/      # REESCRITO — agenda, toggle, bloqueos, máximo
    ├── app/personas/personas-cliente.tsx  # EXTENDIDO — mensaje con enlaces (FR-043)
    ├── components/pedir-en-nombre-de.tsx  # NUEVO — con franjas (usa el editor de packages/ui)
    └── messages/es.json            # EXTENDIDO — solicitudes, grupos, misDiscipulados,
                                    # miDisponibilidad, inicio.pendientes
```

**Structure Decision**: extiende los cuatro proyectos existentes sin agregar ninguno. La API se
parte en **tres módulos** (Solicitudes, discipulado, disponibilidad) con fronteras que coinciden
con las Historias. El cruce y las reglas viven en `discipulado/` aunque los use el módulo de
Solicitudes: son la misma consulta para proponer y para reasignar (Principio XI). Así el trabajo se
puede repartir en paralelo sin pisarse (ver la sección que sigue).

**Editor de franjas:** hoy lo usan dos pantallas del backoffice y una de `apps/web` (Mi camino).
Lo que usan dos apps va a `packages/ui` (Principio XI): el editor nace directamente en
`packages/ui/src/components/editor-de-franjas.tsx`, con las etiquetas de los días por prop desde
next-intl (H-151), y las tres pantallas lo importan de ahí.

## Paralelización (para `/speckit-tasks`)

Lo compartido va en un **lote 0**, que se hace primero y solo. Después abren cuatro lotes que no
comparten archivos.

- **Lote 0 — base (secuencial, una sola sesión):** `packages/shared-types` completo (tipos,
  `Franja` y `franjasCoinciden`, permisos, códigos, `hoyEnArgentina`, topes, eventos, la firma
  nueva de `puedeQuitarRol`); `schema.prisma` y su migración; el seed del Curso y los fixtures;
  `discipulados-activos.ts` (con propuestas pendientes); las **reglas de asignación** con sus tests
  (las usan A y B); `eventos.ts`; los tres módulos registrados vacíos; el `editor-de-franjas` en
  `packages/ui`; el proyecto `celular` de Playwright; las entradas nuevas de `nav.ts`; y los
  namespaces vacíos en los dos `es.json`. D137 y D138 ya están escritas.
- **Lote A — Solicitudes y Mi camino:** `apps/api/src/solicitud-discipulado/`,
  `apps/backoffice/src/app/solicitudes/` (bandeja y detalle con el cruce),
  `components/pedir-en-nombre-de.tsx`, `apps/web/src/app/(app)/mi-camino/` y sus e2e.
- **Lote B — discipulado:** `apps/api/src/discipulado/` (salvo lo que hizo el lote 0),
  `apps/backoffice/src/app/grupos/`, `apps/backoffice/src/app/mis-discipulados/`,
  `apps/backoffice/src/app/page.tsx` (la tarjeta de pendientes) y sus e2e.
- **Lote C — disponibilidad:** `apps/api/src/disponibilidad/`,
  `apps/backoffice/src/app/mi-disponibilidad/` y sus e2e.
- **Lote D — H-127:** `roles.service.ts`, `persona.service.ts` (listado), `personas-cliente.tsx`,
  los tests del 005 que cambian y el cierre en `specs/revision-manual/`.

Dependencias reales entre lotes: el **cruce** (`cruce.service.ts`, lote B) lo consume el proponer
del lote A; B lo hace primero o A usa un stub hasta el merge. El e2e del flujo crítico (pedir →
proponer → aceptar → Encuentro → finalizar) cruza A, B y C, así que va **al final**.

## Decisiones de esta corrida (2026-09-27, actualizado en la segunda corrida del día)

**Confirmadas por Echu (primera corrida):** reasignación por el Admin (FR-030), rechazo de una
finalización con motivo opcional (FR-019a), Personas sin acceso sin vista propia (FR-026) y
discipulados activos calculados en el momento (D137).

**Respondidas por Echu (segunda corrida, brief del 27/9 a la noche, y corregidas por voz al
cerrar):** menores piden solos desde los 12 años, menores de 12 en su nombre (FR-044); la
disponibilidad pasa a ser la agenda **más** el toggle, que arranca apagado y prende el
Discipulador (FR-031, FR-015); el reasignado ve las notas del
anterior; se borran bloqueos y se editan Encuentros (FR-040, FR-041); `Status: Draft` queda. Más
las decisiones nuevas: agenda y cruce, reglas de asignación (D138), propuesta y aceptación,
celular, baja por propuesta, la Persona edita/retira, propuestas pendientes bloquean el rol,
contacto del tutor, Grupos de varias Personas, parejas como dos Solicitudes.

**Tomadas en el plan sin preguntar**, por ser de detalle o por salir de algo ya decidido:
- La Inscripción dada de baja pasa a **`abandono`**, el nombre de `docs/04` (el brief decía
  "abandonada"); `dada_de_baja` sigue sin flujo.
- El **horario de un Grupo se deriva** (agenda del Discipulador ∩ franjas de sus Personas), no se
  guarda (research #14).
- **`PropuestaDiscipulado`** es una entidad, porque FR-038 pide historial (research #13).
- Las franjas y los bloqueos se **borran lógicamente** (`eliminadaEn`), no físicamente
  (Principio III); FR-040 se ajustó para decirlo.
- Horas como **minutos enteros** (research #7); una propuesta pendiente **no se recalcula** si
  cambia la agenda; **sin plazo** automático para responder, "hace N días" y una constante de 3
  días para señalarlas en pendientes.
- El **editor de franjas** nace en `packages/ui` porque lo usan `apps/web` y `apps/backoffice`.
- Se conserva el nombre del permiso `solicitudes.aprobar` aunque el Admin ahora proponga.
- Alinear la spec con D134; reutilizar `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`; capítulos como
  texto; crear en nombre de cualquier Persona (research #8).

**Confirmada por Echu el 2026-09-28:** el tutor de un menor de 12 le avisa al equipo y el Admin (o
un Discipulador) carga el pedido en nombre del menor (FR-002). No hay una función "pedir para mi
hijo/a" en la app del tutor; si algún día hace falta, es una Historia nueva.

**Pendientes de Echu** (no bloquean el lote 0):
1. **El nombre `individual` del Curso** (D44) ya no significa "una Persona por Grupo" (FR-014,
   FR-045). ¿Se deja así, con la nota en la spec, o se revisa D44 y `docs/04` (por ejemplo,
   `individual` → `regular`)? Es una decisión sobre D44, no de este spec.
2. **`DIAS_PROPUESTA_SIN_RESPUESTA = 3`** para señalar una propuesta en pendientes del Admin. ¿Tres
   días está bien, o preferís otro número?
3. **El editor de franjas**: ¿un selector de día + dos campos de hora, o una grilla semanal para
   marcar bloques? El plan asume lo primero (más simple en celular y accesible con teclado). Se
   decide al construir el lote 0, sin cambiar la spec.

## Complexity Tracking

*Sin violaciones de la Constitución que requieran justificación — tabla omitida.*
