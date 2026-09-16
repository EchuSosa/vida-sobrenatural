# Implementation Plan: Fase de Bienvenida para Visitantes

**Branch**: `001-fase-bienvenida` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fase-bienvenida/spec.md`

## Summary

Un Visitante debe poder, sin preguntarle a nadie en persona, (1) entender qué es la Bienvenida y
ver la información de la Sede a la que se acercó, y (2) dar el primer paso del proceso de
integración registrándose como Miembro registrado vía SSO (Google), completando un formulario de
datos obligatorio. Si el Visitante resulta ser menor de 18 años, el auto-registro se corta y queda
en estado `pendiente_tutor`, visible para que un Admin/Discipulador lo active manualmente tras
contactar a un tutor (o lo marque inactivo si el tutor no autoriza). Un Admin gestiona la
información de la Sede que ven los Visitantes.

Enfoque técnico: dos módulos NestJS nuevos (`Persona`, `Sede`) sobre Prisma/PostgreSQL, expuestos
vía REST + Swagger; login SSO con NextAuth.js en `apps/web` (Visitante) y `apps/backoffice`
(Admin/Discipulador), validado en `apps/api` mediante un guard JWT que comparte secreto con
NextAuth. Contenido explicativo de "qué es la Bienvenida" es estático en el frontend (no hay
entidad de contenido en el spec). Sin Curso/Grupo/Cronograma/Encuentro — quedan fuera de esta
fase por diseño.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 22 LTS (todas las apps del monorepo).

**Primary Dependencies**: NestJS 12 + Prisma 7.10/`@prisma/client` 7.10 (backend); Next.js 16 /
React 19 + NextAuth.js (Auth.js) v5 con proveedor Google (frontend, ambas apps); Tailwind CSS v4 +
shadcn/ui; `@nestjs/swagger` para la documentación de API.

**Storage**: PostgreSQL 16 vía Docker Compose local, accedida exclusivamente desde `apps/api` a
través de Prisma (ningún frontend toca la base directamente — ver `docs/10-stack-tecnico.md`).

**Testing**: Jest para unit + integración (Constitución, Principio VI) — **requiere migrar
`apps/api`, hoy scaffolded con Vitest por el `@nestjs/cli` actual, a Jest** (ver `research.md`,
Decisión 1). Playwright para el único flujo end-to-end exigido por la Constitución: el registro
completo de Bienvenida.

**Target Platform**: Web responsive (navegador de escritorio y celular); `apps/web` está pensada
como PWA a futuro (ver `docs/10-stack-tecnico.md`), pero esta fase no depende de eso.

**Project Type**: Aplicación web en monorepo (3 apps: `apps/api`, `apps/web`, `apps/backoffice`).

**Performance Goals**: Sin metas de throughput específicas — proyecto de una sola congregación,
volumen bajo (decenas/cientos de Personas). Las metas relevantes son de experiencia (ver
Success Criteria del spec: SC-001/SC-002), no de carga.

**Constraints**: Constitución del proyecto — Spec-First (Principio I), terminología canónica de
`docs/04-dominio-entidades.md` (Principio II), soft delete obligatorio vía flag `activo`
(Principio III), sin artefactos de dominio no especificados — nada de Curso/Grupo/Cronograma/
Encuentro en esta fase (Principio IV), SSO sin contraseñas propias (Principio V), testing
pragmático por capas sin CI todavía (Principio VI).

**Scale/Scope**: Una sola Sede activa hoy (modelo preparado para más a futuro); un solo
desarrollador manteniendo el proyecto.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — ver columna "Post-diseño".*

| Principio | Chequeo | Pre-Fase 0 | Post-diseño (Fase 1) |
|---|---|---|---|
| I. Spec-First | El plan deriva punto por punto de `spec.md` (aprobado tras `/speckit.clarify`); ningún alcance nuevo se agrega sin pasar por ahí. `data-model.md` y `contracts/` no introducen nada fuera de las Historias/FR del spec. | PASS | PASS |
| II. Consistencia terminológica | Entidades/campos usan los nombres de `docs/04-dominio-entidades.md` (`Persona`, `Sede`, `estado`, `activo`, `tutorNombre`, `tutorTelefono`, `tiempoCongregacion`, etc.), verificado campo por campo en `data-model.md`. Sin sinónimos ni nombres de personas reales. | PASS | PASS |
| III. Soft delete obligatorio | `Persona.activo` y `Sede.activo` como flags booleanos; los contratos solo exponen `PATCH` (nunca `DELETE`) para desactivar. | PASS | PASS |
| IV. Simplicidad / no artefactos prematuros | Solo se modelan `Persona` y `Sede` (igual que el spec). Sin tablas de Curso/Grupo/Cronograma/Encuentro. Contenido de Bienvenida estático, no CMS (Decisión 3). Flujo 7 camino B explícitamente excluido (Decisión 4). `packages/ui` diferido (Structure Decision). | PASS | PASS |
| V. Seguridad | SSO (Google) vía NextAuth.js, sin contraseñas propias (contrato `auth-integration.md`); habilitación manual respetada para `pendiente_tutor` → `activa` (contrato `personas-api.md`). | PASS | PASS |
| VI. Testing pragmático por capas | `apps/api` está scaffoldeado con Vitest, no Jest — conflicto directo con la Constitución. | **Condicionado** | **PASS** — resuelto en Decisión 1 (`research.md`): migrar `apps/api` a Jest antes del primer test; queda como tarea explícita de implementación. |

Sin violaciones que requieran `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/001-fase-bienvenida/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── sedes-api.md
│   ├── personas-api.md
│   └── auth-integration.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/                              # NestJS — única puerta a PostgreSQL (Prisma)
├── prisma/
│   └── schema.prisma                  # + modelos Persona y Sede (este feature)
├── src/
│   ├── sede/
│   │   ├── sede.module.ts
│   │   ├── sede.controller.ts
│   │   ├── sede.service.ts
│   │   └── dto/
│   ├── persona/
│   │   ├── persona.module.ts
│   │   ├── persona.controller.ts
│   │   ├── persona.service.ts         # cálculo de edad, dedup por email, transición de estado
│   │   └── dto/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── jwt-nextauth.strategy.ts    # valida el JWT emitido por NextAuth.js
│   │   ├── roles.guard.ts              # Admin / Discipulador
│   │   └── internal-lookup.guard.ts    # secreto compartido para el lookup pre-sesión
│   └── app.module.ts
├── test/
│   ├── unit/           # Jest — cálculo de edad, dedup, transición de estado (Persona)
│   └── integration/    # Jest contra Postgres de test — endpoints Persona/Sede
│
apps/web/                              # Next.js — Visitante / Miembro registrado
├── src/app/
│   ├── bienvenida/page.tsx             # FR-001: contenido estático "qué es la Bienvenida"
│   ├── sede/page.tsx                   # FR-002/FR-004: info de Sede (única o a elegir)
│   ├── registro/page.tsx               # FR-006: formulario obligatorio post-SSO
│   ├── pendiente-tutor/page.tsx        # mensaje para el menor cuyo registro se cortó
│   └── api/auth/[...nextauth]/route.ts # NextAuth.js (Google)
├── e2e/
│   └── registro-bienvenida.spec.ts     # Playwright — único flujo E2E exigido por la Constitución
│
apps/backoffice/                       # Next.js — Admin / Discipulador
├── src/app/
│   ├── sedes/page.tsx                  # FR-010/FR-011: CRUD de Sede (Historia 3)
│   ├── pendientes-tutor/page.tsx       # FR-008/FR-014: cola + activar/marcar inactiva
│   └── api/auth/[...nextauth]/route.ts # mismo NextAuth.js, mismo secreto
│
packages/shared-types/                 # DTOs mínimos compartidos (a mano, sin codegen todavía)
└── src/persona.ts, sede.ts
```

**Structure Decision**: Se usa la Opción "Web application" adaptada a las 3 apps reales del
monorepo ya scaffoldeadas (`docs/10-stack-tecnico.md`, D76). No se crea `packages/ui` en esta
fase: hoy solo existe un componente compartido (`Button` de shadcn/ui), duplicado en `web` y
`backoffice`; consolidarlo en un paquete propio antes de tener un segundo componente compartido
sería un artefacto prematuro (Principio IV). Se revisita cuando la duplicación tenga costo real.

## Complexity Tracking

*Sin violaciones a justificar — tabla vacía.*
