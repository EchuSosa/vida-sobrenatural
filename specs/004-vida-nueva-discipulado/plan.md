# Implementation Plan: Vida Nueva / Discipulado

**Branch**: `004-vida-nueva-discipulado` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-vida-nueva-discipulado/spec.md`

## Summary

La segunda tajada del camino de integración (Bienvenida → **Vida Nueva** → Vida de Servicio →
Ministerio). Una Persona pide empezar Vida Nueva desde **Mi camino**, o alguien del equipo lo pide
en su nombre. El Admin aprueba la Solicitud eligiendo un Discipulador disponible, y así se arman el
Grupo, la Inscripción y el Liderazgo. El Discipulador registra cada Encuentro, con su Asistencia, y
propone la finalización, que el Admin confirma o rechaza. El Admin puede reasignar un discipulado
en curso. Cada Discipulador maneja su propia disponibilidad (toggle y períodos).

Se apoya en lo que el spec 005 dejó construido y **no lo vuelve a decidir**: el catálogo de
permisos (D132), el otorgamiento del rol `discipulador` (D131) y su auditoría, y la exclusión de
menores de los roles de cargo (D133). Además **cierra H-127**: la guarda que hoy impide quitar
`discipulador` a cualquiera pasa a bloquear solo a quien tiene discipulados activos, calculados en
el momento (D137).

## Technical Context

**Language/Version**: TypeScript en Node.js 22+, el mismo stack del monorepo. Sin lenguaje nuevo.

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js
(`apps/web`, `apps/backoffice`); `packages/shared-types` (tipos, permisos, códigos de error, la
fecha de hoy); `packages/ui` (`TablaDatos`, `ControlesTabla`, `Sheet`, `useEnvio`,
`useValidacionCampos`, `ResumenErrores`, `EstadoVacio`). **No se agrega ninguna dependencia.**

**Storage**: PostgreSQL vía Prisma. Ocho modelos nuevos (`Curso`, `SolicitudDiscipulado`,
`Grupo`, `Inscripcion`, `Liderazgo`, `Encuentro`, `Asistencia`, `BloqueoDisponibilidad`: ver
`data-model.md`), un campo nuevo en `Persona` (`disponibleDiscipulado`) y, en SQL dentro de la
migración, un índice único parcial y dos CHECK (patrón H-140).

**Testing**: Jest unit e integración (`apps/api`) y Playwright con `axe` en los dos temas
(`apps/web`, `apps/backoffice`) — Principios VI y VII.

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
- Las operaciones que crean o cierran un Liderazgo y la quita del rol quedan serializadas
  bloqueando la fila de la Persona (D137, H-142).

**Scale/Scope**: 8 modelos nuevos, 5 permisos nuevos, unos 14 endpoints, 1 pantalla de `apps/web`
(Mi camino), 4 pantallas del backoffice reescritas desde su placeholder más 2 detalles nuevos, y 1
pantalla del 005 que cambia (Personas).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec aprobada antes del código? | PASA — `spec.md` reactivado, con dos sesiones de `/speckit-clarify` (23/9 y 27/9) y alineado con D134. La única decisión nueva de arquitectura (D137) quedó confirmada por Echu y escrita antes de este plan. |
| II. Terminología | ¿Nombres canónicos? | PASA — Solicitud de Discipulado, Grupo, Inscripción, Liderazgo, Encuentro, Asistencia y Bloqueo de Disponibilidad, como en `docs/04`. En pantalla, "Mi camino" y no la jerga interna (Principio VIII). |
| III. Soft delete | ¿Se borra algo físicamente? | PASA — ninguna operación borra. `Curso` tiene `activo`. Reasignar **cierra** un Liderazgo (`hasta`), no lo borra. Grupo, Solicitud, Encuentro y Bloqueo no tienen operación de borrado en este spec. |
| IV. Simplicidad | ¿Algo sin spec? | PASA — no se construyen edición de Encuentros, borrado de bloqueos, motivo de rechazo de Solicitud, `liberacion_programada` ni `apto_ministerio`. `TipoCurso.grupal` e `Inscripcion.dada_de_baja`/`abandono` se modelan porque FR-014 y `docs/04` lo piden, sin flujo. |
| V. Seguridad | ¿Autorización por registro? | PASA en diseño — Liderazgo vigente o 404 (`contracts/discipulado-api.md`). Los datos de contacto salen por un solo endpoint (SC-003). A los tests e2e y de integración les toca probar el acceso ajeno. |
| VI. Testing | ¿Reglas con ramas testeadas? | A CUBRIR en `tasks.md` — unit de `puedeQuitarRol`, de "cursa o completó", de disponible hoy y de las transiciones del Grupo; integración de aprobar, reasignar, confirmar y las carreras de D137; e2e del flujo crítico. |
| VII. Accesibilidad | ¿WCAG y axe en los dos temas? | A CUBRIR en `tasks.md` — el checklist de `docs/15-guia-ux-ui.md` por pantalla (D114), y axe claro/oscuro en el e2e crítico. |
| VIII. Experiencia consistente | ¿Cuatro estados, una acción principal, `useEnvio`? | A CUBRIR en `tasks.md`, por pantalla. El patrón ya existe (Personas, pendientes-tutor). |
| IX. Idiomas | ¿Textos por next-intl, claves estables? | A CUBRIR en `tasks.md` — estados como claves (`EstadoSolicitud`, `EstadoGrupo`), y la regla `sin-texto-fijo-en-sr-only` ya corre en los tres configs. |
| X. Errores | ¿Un código por regla nueva? | PASA en diseño — un código por regla, listados en los contratos (se reutilizan los que ya significan lo mismo: `NO_ENCONTRADO`, `VALIDACION` para los errores de campo, y `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`, que el 005 dejó reservado). Se elimina `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS` en vez de reutilizarlo con otro significado. |
| XI. Una sola fuente de verdad | ¿Nada duplicado? | PASA en diseño — discipulados activos en una función (D137); "hoy" y los tipos en `shared-types`; el listado de disponibles es un solo endpoint que usan aprobar y reasignar; y `puedeQuitarRol` sigue siendo la única respuesta para la API y la pantalla. |

Sin violaciones. **Re-chequeo después del diseño:** sin cambios. La Fase 1 no agregó nada que
contradiga la tabla.

## Project Structure

### Documentation (this feature)

```text
specs/004-vida-nueva-discipulado/
├── spec.md
├── plan.md              # este archivo
├── research.md          # Fase 0 — 11 decisiones
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 — 11 escenarios de validación
├── contracts/
│   ├── solicitudes-api.md
│   ├── discipulado-api.md
│   └── disponibilidad-api.md
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── permisos.ts          # EXTENDIDO — 5 permisos nuevos; puedeQuitarRol recibe
│                        # discipuladosActivos (D137, cierra H-127)
├── error-code.ts        # EXTENDIDO — los códigos de los contratos, 1 eliminado
├── discipulado.ts       # NUEVO — EstadoSolicitud, SolicitudResumen, EstadoMiDiscipulado,
│                        # DiscipuladoResumen, Encuentro*, MiDiscipulado, DiscipuladoActivo
├── disponibilidad.ts    # NUEVO — MiDisponibilidad, BloqueoDisponibilidad, hoyEnArgentina()
└── index.ts             # EXTENDIDO — exporta los dos nuevos

apps/api/
├── prisma/schema.prisma           # EXTENDIDO — 8 modelos, Persona.disponibleDiscipulado
├── prisma/migrations/…_discipulado/  # NUEVA — con índice parcial y CHECK en SQL
├── prisma/seed.ts                 # EXTENDIDO — el Curso Vida Nueva (idempotente)
├── scripts/limpiar-e2e.ts         # EXTENDIDO — borra también lo que cuelga de Personas e2e- (H-67)
└── src/
    ├── solicitud-discipulado/     # NUEVO — controller, service, spec
    ├── discipulado/               # NUEVO — grupos (vista adm.), mis-discipulados, encuentros,
    │   │                          # finalización, reasignación
    │   └── discipulados-activos.ts  # la consulta única de D137
    ├── disponibilidad/            # NUEVO — toggle y bloqueos
    ├── persona/roles.service.ts   # EXTENDIDO — quitarRol usa discipuladosActivosDe (H-127)
    ├── persona/persona.service.ts # EXTENDIDO — el listado expone quitar.discipulador real
    └── app.module.ts              # EXTENDIDO — registra los tres módulos

apps/web/src/
├── app/(app)/mi-camino/            # REESCRITO — pedir Vida Nueva y ver el estado (loading/error)
└── messages/es.json                # EXTENDIDO — namespace miCamino

apps/backoffice/src/
├── config/nav.ts                   # EXTENDIDO — /grupos/[id] y /mis-discipulados/[id], enMenu: false
├── app/solicitudes/                # REESCRITO — bandeja genérica + resolver + crear en nombre de
├── app/grupos/ y grupos/[id]/      # REESCRITO/NUEVO — vista administrativa, sin notas (D134)
├── app/mis-discipulados/ y [id]/   # REESCRITO/NUEVO — escritorio del Discipulador
├── app/mi-disponibilidad/          # REESCRITO — toggle y períodos
├── app/personas/personas-cliente.tsx  # EXTENDIDO — mensaje que nombra los discipulados (H-127)
├── components/pedir-en-nombre-de.tsx  # NUEVO — lo usan /solicitudes y /mis-discipulados
└── messages/es.json                # EXTENDIDO — namespaces solicitudes, grupos,
                                    # misDiscipulados, miDisponibilidad
```

**Structure Decision**: extiende los cuatro proyectos existentes sin agregar ninguno. La API se
parte en **tres módulos** (Solicitudes, discipulado, disponibilidad) con fronteras que coinciden
con las Historias. Además de ordenar el código, así el trabajo se puede repartir en paralelo sin
pisarse (ver la sección que sigue).

## Paralelización (para `/speckit-tasks`)

Lo compartido va en un **lote 0**, que se hace primero y solo. Después abren cuatro lotes que no
comparten archivos.

- **Lote 0 — base (secuencial, una sola sesión):** `packages/shared-types` completo (tipos,
  permisos, códigos, `hoyEnArgentina`, la firma nueva de `puedeQuitarRol`); `schema.prisma` y su
  migración; el seed del Curso; `discipulados-activos.ts`; los tres módulos registrados vacíos en
  `app.module.ts`; las entradas nuevas de `nav.ts`; y **los namespaces vacíos** en los dos
  `es.json`, así cada lote escribe dentro de su propio bloque y los merges no chocan. D137 ya está
  escrita.
- **Lote A — Solicitudes:** `apps/api/src/solicitud-discipulado/`, `apps/backoffice/src/app/solicitudes/`,
  `components/pedir-en-nombre-de.tsx`, `apps/web/src/app/(app)/mi-camino/` y sus e2e.
- **Lote B — discipulado:** `apps/api/src/discipulado/` (salvo `discipulados-activos.ts`),
  `apps/backoffice/src/app/grupos/`, `apps/backoffice/src/app/mis-discipulados/` y sus e2e.
- **Lote C — disponibilidad:** `apps/api/src/disponibilidad/`, `apps/backoffice/src/app/mi-disponibilidad/`
  y sus e2e.
- **Lote D — H-127:** `roles.service.ts`, `persona.service.ts` (listado), `personas-cliente.tsx`,
  los tests del 005 que cambian (`puede-quitar-rol.spec.ts`, `roles-personas.e2e-spec.ts`,
  `personas.spec.ts`) y el cierre en `specs/revision-manual/`.

Dependencias reales entre lotes: el e2e del flujo crítico (pedir → aprobar → Encuentro →
finalizar) cruza A, B y C, así que va **al final**, cuando los cuatro están mergeados. Los datos de
prueba de B se siembran por API o fixture, sin depender de la pantalla de A.

## Complexity Tracking

*Sin violaciones de la Constitución que requieran justificación — tabla omitida.*
