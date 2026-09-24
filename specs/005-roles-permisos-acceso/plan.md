# Implementation Plan: Roles, permisos y acceso al backoffice

**Branch**: `005-roles-permisos-acceso` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-roles-permisos-acceso/spec.md`

## Summary

Reemplaza la matriz de autorización hoy duplicada (18 `@Roles(...)` en la API + una decena de
chequeos a mano en el backoffice) por un catálogo único de permisos en código compartido
(`packages/shared-types`), leído por igual desde la API y el backoffice (D132). Sobre esa base
construye lo que hoy falta para que el mecanismo de roles funcione de punta a punta: un Admin
sembrado indegradable + comando CLI de recuperación como parte de la instalación (D130/D131),
una pantalla mínima para que el Admin busque una Persona y le otorgue o le quite un rol de cargo
(con las restricciones ya decididas en `/speckit.clarify`: bloqueo de revocación de
`discipulador` con discipulados activos, no auto-revocación de `admin`, y ningún rol de cargo
para menores de edad), un lugar único donde el sistema escribe los roles de estado por evento de
dominio, un mecanismo uniforme de protección por permiso para pantallas del backoffice con una
forma mecánica de detectar una pantalla sin declarar, el acceso de solo lectura del Pastor, y
auditoría de cada cambio de rol de cargo.

## Technical Context

**Language/Version**: TypeScript (Node.js 22+, según `apps/api/package.json` / `.nvmrc` del repo) — mismo stack que el resto del monorepo, sin lenguaje nuevo.

**Primary Dependencies**: NestJS 12 + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js (`apps/backoffice`); `packages/shared-types` (valores y tipos compartidos, Principio XI); `packages/ui` (Base UI + shadcn, `TablaDatos`/`ControlesTabla` ya existentes). Nada nuevo se agrega al `package.json` raíz — no hace falta un framework de CLI (`nest-commander`, etc.): el repo ya tiene el patrón de scripts `tsx` en `apps/api/scripts/` (`sembrar-e2e-admin.ts`, `contar.ts`) para tareas de línea de comandos contra Prisma.

**Storage**: PostgreSQL vía Prisma (ya existente). Este spec agrega un modelo (`CambioDeRol`, auditoría — Historia 6) y extiende `Persona` con un flag para el Admin sembrado indegradable; el catálogo de permisos en sí **no** es una entidad de base de datos (D132).

**Testing**: Jest (unit + integración, `apps/api`) y Playwright (e2e, `apps/backoffice`) — Principio VI. La verificación mecánica de FR-017 ("ninguna pantalla nueva nace sin protección") se implementa como un test de Jest/Node que recorre `apps/backoffice/src/app/**/page.tsx` y lo cruza contra el registro de permisos por pantalla, en la línea del ESLint `local/no-session-check-en-page` (H-116) pero para la pregunta inversa ("¿está declarada?", no "¿repite un chequeo prohibido?").

**Target Platform**: Docker Compose local (dev); despliegue real todavía no definido en `docs/10-stack-tecnico.md` más allá de "instalación por iglesia" (D130) — no es parte de este spec resolver el hosting, solo el camino de instalación de datos/Admin dentro de la app.

**Project Type**: Web application existente (monorepo `apps/api` + `apps/web` + `apps/backoffice` + `packages/*`) — este spec no agrega ningún proyecto nuevo al monorepo.

**Performance Goals**: Sin objetivo propio — la búsqueda de Personas (FR-005) es sobre una tabla que hoy tiene decenas/cientos de filas (una iglesia), no miles; alcanza con el mismo patrón de paginación + `select` explícito que ya exige la Constitución (Restricciones Técnicas, H-42), sin necesidad de búsqueda full-text.

**Constraints**: Ninguna regla de autorización puede vivir declarada dos veces (D132, Historia 3) — es la restricción central de este spec, no una meta de rendimiento. El catálogo de permisos vive en código, nunca en una tabla editable desde el backoffice (D132, explícitamente descartado).

**Scale/Scope**: 4 roles de cargo, ~18+ permisos con nombre a migrar desde los `@Roles` existentes más los del backoffice, 1 modelo de auditoría nuevo, 1 comando CLI nuevo, ~17 pantallas de backoffice a registrar (aunque no todas necesiten protección por rol — algunas son de solo-sesión, ver Assumptions de spec.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Hay spec aprobada antes de tocar código? | PASA — `spec.md`, `/speckit.clarify` ya cerrado, este plan es el siguiente paso reglamentario. |
| II. Consistencia terminológica | ¿Usa los nombres canónicos (Admin, Discipulador, Persona, Rol de cargo/de estado)? | PASA — el spec ya adopta el vocabulario de D131/`docs/03-roles-permisos.md`. |
| III. Soft delete obligatorio | ¿Alguna entidad nueva se borra físicamente? | PASA — `CambioDeRol` es un registro de auditoría append-only (nunca se edita ni se borra, ni siquiera lógicamente: es un hecho histórico, no un recurso con ciclo de vida). No se agrega ningún `DELETE` físico sobre `Persona` ni sobre ninguna entidad existente. |
| IV. Simplicidad / no artefactos prematuros | ¿Algo de esto no tiene spec? | PASA — cada pieza (catálogo, otorgar/quitar, Admin sembrado, auditoría, protección por pantalla, solo-lectura del Pastor) traza a una Historia de `spec.md`. No se construye la tabla de permisos editable (Fuera de alcance, D132) ni el perfil unificado de Persona (Fuera de alcance, Flujo 9). |
| V. Seguridad | ¿La autorización se valida en la API por registro, no solo por rol? ¿Fail-closed? | PASA, con atención: el catálogo de permisos decide **qué rol puede qué acción**, pero donde la Constitución ya exige autorización por registro (ej. un Discipulador solo ve sus propios discípulos), ese chequeo adicional se mantiene en el servicio — el catálogo de permisos no lo reemplaza, es una capa previa (¿tiene el permiso en absoluto?), no la única. Ninguna parte de este spec relaja fail-closed: si el catálogo no declara un rol para un permiso, el default es denegar (ver FR-013). |
| VI. Testing pragmático por capas | ¿Las reglas condicionales nuevas (bloqueo de revocación con discipulados activos, no auto-revocación de admin, restricción de edad) llevan test unitario? | A CUBRIR en `tasks.md` — son exactamente el tipo de lógica de negocio con ramas que el Principio VI exige testear con Jest. |
| VII. Accesibilidad | ¿Las pantallas nuevas (búsqueda de Personas, otorgar/quitar rol) cumplen WCAG 2.2 AA y los 4 estados? | A CUBRIR en `tasks.md`, vía el checklist de `docs/15-guia-ux-ui.md` por pantalla (Governance, D114). |
| VIII. Experiencia consistente | ¿Reusa el patrón de pantalla existente (Server Component + Cliente, `TablaDatos`/`ControlesTabla`, `requerirSesion()`)? | PASA en diseño — ver Project Structure abajo; se instancia en `tasks.md`. |
| IX. Preparada para varios idiomas | ¿Textos nuevos vía `next-intl`? | A CUBRIR en `tasks.md` — ningún texto de interfaz nuevo (mensajes de bloqueo, nombres de permiso visibles) va hardcodeado. |
| X. Errores y observabilidad | ¿Los nuevos casos de error (bloqueo de revocación, intento de dar un rol a un menor, auto-revocación de admin) usan Problem Details + código en el catálogo compartido? | A CUBRIR en `tasks.md` — cada regla de FR-009/FR-010/FR-011 necesita su código de error propio en `packages/shared-types` (Principio X), no reutilizar uno existente con otro significado. |
| XI. Una sola fuente de verdad | ¿El catálogo de permisos evita la duplicación que motivó este spec? ¿La restricción de edad de D133 reusa lo que corresponde sin acoplarse por coincidencia? | PASA en diseño — es el propósito central de la Historia 3. La restricción de edad (D133, FR-011/FR-024) reusa `calcularEdad()` de `apps/api/src/persona/calcular-edad.ts` (ya usado por el registro y el alta de menores), pero **no** reusa la `EDAD_MINIMA` ya existente en `persona.service.ts` — esa constante ya significa otras dos cosas ahí (H-128); en su lugar define `EDAD_MINIMA_ROL_DE_CARGO` propia, en `packages/shared-types` para que las dos apps (API y backoffice, FR-024) lean el mismo valor sin duplicarlo — ver research.md #7. |

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-roles-permisos-acceso/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── permisos-api.md
│   ├── roles-personas-api.md
│   ├── auditoria-api.md
│   └── cli-recrear-admin.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── permisos.ts            # NUEVO — catálogo único de permisos (D132): Permiso, RolDeCargo,
│                           # CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]>. Fuente única
│                           # leída por apps/api y apps/backoffice.
├── persona.ts              # EXTENDIDO — EDAD_MINIMA_ROL_DE_CARGO (D133, H-128): constante
│                            # propia, no la EDAD_MINIMA de apps/api/src/persona/persona.service.ts
│                            # (esa ya significa otras dos cosas ahí). Leída por la API (servicio
│                            # de otorgar rol, FR-011) y por el backoffice (FR-024).
└── error-code.ts           # EXTENDIDO — códigos nuevos para los bloqueos de FR-009/FR-010/FR-011
                             # (Principio X: un código nuevo por regla, no reutilizar uno existente).

apps/api/src/
├── auth/
│   ├── permisos.decorator.ts   # NUEVO — @RequierePermiso(permiso), reemplaza a @Roles(...) en
│   │                            # los 18 sitios existentes (FR-014); resuelve roles vía
│   │                            # CATALOGO_PERMISOS, no declara roles literales.
│   └── permisos.guard.ts        # NUEVO (o roles.guard.ts extendido) — lee el permiso requerido
│                                 # y lo resuelve contra el catálogo antes de chequear request.user.rol.
├── persona/
│   ├── calcular-edad.ts         # EXISTENTE, reusado — restricción de edad de FR-011.
│   ├── roles.service.ts         # NUEVO — otorgar/quitar rol de cargo (FR-006/FR-007), con las
│   │                             # reglas de FR-009/FR-010/FR-011, y el lugar único de escritura
│   │                             # de roles de estado (FR-019/FR-020).
│   └── roles.controller.ts      # NUEVO (o extensión de persona.controller.ts) — búsqueda de
│                                 # Personas (FR-005) y endpoints de otorgar/quitar rol.
└── cambio-de-rol/
    ├── cambio-de-rol.service.ts # NUEVO — auditoría (Historia 6, FR-022/FR-023).
    └── cambio-de-rol.controller.ts

apps/api/prisma/
└── schema.prisma            # EXTENDIDO — Persona.adminSembrado (FR-002), modelo CambioDeRol.

apps/api/scripts/
└── recrear-admin.ts          # NUEVO — comando CLI documentado (FR-003/FR-004), mismo patrón
                               # idempotente que sembrar-e2e-admin.ts.

apps/backoffice/src/
├── auth.ts                    # EXTENDIDO — requerirPermiso(permiso) además de requerirSesion()
│                               # (Historia 4), leyendo el mismo CATALOGO_PERMISOS.
├── permisos-por-pantalla.ts   # NUEVO — registro de qué permiso (o "cualquier sesión") requiere
│                               # cada page.tsx (FR-016/FR-017): la base del chequeo mecánico.
└── app/
    └── personas/
        └── page.tsx            # EXTENDIDO — hoy un placeholder ("vista unificada", fuera de
                                 # alcance); pasa a alojar la búsqueda mínima (FR-005) y las
                                 # acciones de otorgar/quitar rol (FR-006/FR-007), reusando
                                 # TablaDatos/ControlesTabla de packages/ui (mismo patrón que
                                 # apps/backoffice/src/app/sedes/page.tsx).

docs/
└── (a definir en tasks.md) — el camino de instalación de FR-004 necesita un lugar documentado
    como "instalar el sistema para una iglesia", distinto de specs/revision-manual/COMO-ARRANCAR.md
    (que es explícitamente el atajo de entorno de desarrollo, D130 lo pide separado).
```

**Structure Decision**: Extiende los tres proyectos existentes del monorepo (`apps/api`,
`apps/backoffice`, `packages/shared-types`) sin agregar ninguno nuevo. El catálogo de permisos es
el único artefacto verdaderamente nuevo en `packages/shared-types` — todo lo demás extiende
módulos ya existentes (`auth/`, `persona/`) o sigue un patrón ya establecido en el repo (scripts
`tsx`, páginas Server Component + Cliente con `TablaDatos`).

## Complexity Tracking

*Sin violaciones de la Constitución que requieran justificación — tabla omitida.*
