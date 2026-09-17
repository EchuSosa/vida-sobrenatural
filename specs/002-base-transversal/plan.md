# Implementation Plan: Base Transversal de la App

**Branch**: `002-base-transversal` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-base-transversal/spec.md`

## Summary

Construir la base común que toda feature posterior va a reutilizar: los tres menús de navegación
(web pública, app con sesión, backoffice) con sus estados vacíos, accesibilidad WCAG 2.2 AA sobre
esa navegación y las pantallas ya existentes del spec 001, un formato único de error (Problem
Details) con catálogo de códigos compartido y monitoreo con Sentry, modo claro/oscuro persistido por
Persona, la interfaz preparada para más idiomas (solo español por ahora), SEO base en las páginas
públicas, y datos de demostración mínimos. Enfoque técnico: extraer a `packages/ui` los tokens y
componentes shadcn que ya están duplicados entre `apps/web` y `apps/backoffice`, migrar los throws
de excepción ya existentes en `persona.service.ts`/`sede.service.ts` a un filtro global con
`code`/`requestId`, trasladar el contenido de `/bienvenida` y `/sede` (spec 001) a las nuevas
secciones Primeros pasos/Visitanos sin redirección, y sumar dos columnas a `Persona`
(`idiomaPreferido`, `temaPreferido`) con dos endpoints nuevos (`GET`/`PATCH /personas/me...`) para
que el tema elegido siga a la Persona entre dispositivos. Ver `research.md` para el detalle de cada
decisión técnica.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS activo en el resto del monorepo) — TS ^6.0.2 en
`apps/api`, TS ^5 en `apps/web`/`apps/backoffice`/`packages/*` (ya así en el spec 001, no cambia).

**Primary Dependencies**: NestJS 12 + Prisma 7 (`apps/api`, ya en uso); Next.js 16 (App Router) +
React 19 (`apps/web`, `apps/backoffice`, ya en uso). Nuevas para este spec: `next-intl`,
`next-themes`, `eslint-plugin-jsx-a11y`, `@axe-core/playwright`, `nestjs-pino`, `@sentry/nextjs`,
`@sentry/nestjs`. Ya presentes y reutilizadas: `lucide-react`, `shadcn`/`@base-ui/react`,
Tailwind CSS v4, NextAuth.js (Auth.js) v5, `jose`.

**Storage**: PostgreSQL vía Prisma (ya en uso) — una migración nueva agrega `idiomaPreferido` y
`temaPreferido` a `Persona`. Sin almacenamiento adicional (no hay archivos ni caché nuevos en este
spec).

**Testing**: Jest (unit + integración, `apps/api`, ya en uso) y Playwright (e2e crítico, `apps/web`,
ya en uso), ampliados con `@axe-core/playwright` sobre los mismos specs — ver Constitución Principio
VI y VII. `eslint-plugin-jsx-a11y` como gate adicional de lint.

**Target Platform**: Navegador (desktop y celular) para `apps/web` (PWA) y `apps/backoffice`; Node.js
para `apps/api`. Todo corre en local sobre Docker Compose (Postgres) por ahora, sin hosting decidido
(D75, fuera de alcance de este spec).

**Project Type**: Web application — monorepo con dos frontends Next.js + un backend NestJS
compartido + dos paquetes de workspace (ya la estructura del spec 001; este spec agrega
`packages/ui`).

**Performance Goals**: No introduce objetivos nuevos — se apoya en las metas ya fijadas en la
Constitución (Restricciones Técnicas: LCP < 2.5 s, INP < 200 ms, CLS < 0.1), sin verificación
automatizada todavía (Lighthouse CI queda pospuesto a cuando exista GitHub Actions, D80).

**Constraints**: Puertos fijos ya establecidos y sin cambios (`apps/web` 3001, `apps/backoffice`
3002, `apps/api` 3333, D104) — este spec solo los reafirma, no los modifica. Sentry desactivado sin
`SENTRY_DSN`. Sin Mailpit/email (fuera de alcance de este spec).

**Scale/Scope**: 3 apps, 1 paquete de workspace nuevo (`packages/ui`) sobre los 2 ya existentes, ~10
páginas/rutas nuevas o trasladadas en `apps/web`, ~8-10 páginas de estado vacío en `apps/backoffice`,
2 endpoints nuevos en `apps/api`, 1 migración de Prisma. Cubre las 8 historias de `spec.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.1.0 (10 principios):

| Principio | Cumple | Cómo |
|---|---|---|
| I. Spec-First | ✅ | Este plan sigue a `spec.md`, que a su vez cita cada ADR (D81–D105) que lo origina; nada se implementa sin spec previa. |
| II. Consistencia terminológica y de dominio | ✅ | Se reutilizan los nombres canónicos ya establecidos (Persona, Sede, Visitante, Primeros pasos, Mi camino) de `docs/04` y `docs/14`; no se inventan sinónimos. |
| III. Soft delete obligatorio | ✅ | No se agrega ninguna entidad nueva con borrado físico; `idiomaPreferido`/`temaPreferido` son columnas de `Persona`, que ya usa `activo`. |
| IV. Simplicidad / no artefactos prematuros | ✅ | Se evita crear rutas/tablas para lo fuera de alcance (Mi camino real, Eventos, etc. quedan como estado vacío, no como esqueleto de feature); paleta de color provisoria en vez de bloquear el spec por una decisión de diseño pendiente. |
| V. Seguridad | ✅ | `GET/PATCH /personas/me...` resuelven por `request.user.personaId` del JWT (autorización por registro, no por rol ni por `:id` de la URL); no se toca el mecanismo SSO ni el login fail-closed ya implementado (D88). |
| VI. Testing pragmático por capas | ✅ | Nueva lógica con ramas (mapeo de excepciones a `code`, filtrado de nav por rol) recibe test unitario; `GET/PATCH /personas/me` reciben test de integración; los e2e críticos existentes suman `@axe-core/playwright`. |
| VII. Accesibilidad e inclusión | ✅ (es el objeto central de la Historia 2) | WCAG 2.2 AA, estados nunca solo por color, `@axe-core/playwright` en ambos temas — ver `research.md` Decisión 9. |
| VIII. Experiencia consistente | ✅ (Historias 1, 3, 5) | Navegación, estados de carga/vacío/error/éxito y modo claro/oscuro unificados vía `packages/ui` y los arrays de configuración de nav. |
| IX. Preparada para varios idiomas | ✅ (Historia 6) | `next-intl`, catálogo de errores por código, sin textos hardcodeados — ver Decisión 4. |
| X. Errores y observabilidad | ✅ (Historia 4) | Problem Details + `code` + `requestId`, catálogo en `packages/shared-types`, Sentry con `sendDefaultPii: false` y `beforeSend` sin datos personales. |

Sin violaciones — no hace falta completar Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-base-transversal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── personas-api.md  # GET /personas/me, PATCH /personas/me/preferencias, cambio a by-email
│   ├── errores.md        # Formato Problem Details, aplica a toda apps/api
│   └── nav-config.md     # Contrato de configuración de menús para features futuras
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Monorepo ya existente (pnpm + Turborepo, ver `docs/10-stack-tecnico.md`) — este spec agrega
`packages/ui` y extiende `apps/api`, `apps/web`, `apps/backoffice`:

```text
apps/api/
├── src/
│   ├── common/
│   │   └── errors/
│   │       ├── app-exception.ts        # NUEVO — HttpException + code
│   │       └── all-exceptions.filter.ts # NUEVO — normaliza a Problem Details
│   ├── persona/
│   │   ├── persona.controller.ts       # + GET /me, PATCH /me/preferencias
│   │   ├── persona.service.ts          # throws migrados a AppException
│   │   └── dto/
│   │       └── actualizar-preferencias.dto.ts # NUEVO
│   ├── sede/
│   │   └── sede.service.ts             # throws migrados a AppException
│   └── main.ts                          # + AllExceptionsFilter, nestjs-pino, Sentry (instrument.ts)
├── prisma/
│   ├── schema.prisma                    # + enums Idioma/TemaPreferido, columnas en Persona
│   ├── seed.ts                          # + Personas demo (Decisión 13)
│   └── migrations/<timestamp>_persona_idioma_tema/
└── test/
    ├── unit/                            # tests del mapeo de excepciones a code
    └── integration/
        └── personas-me.integration-spec.ts # NUEVO

apps/web/
├── src/
│   ├── app/
│   │   ├── (publica)/                   # NUEVO route group
│   │   │   ├── layout.tsx                # menú público + footer
│   │   │   ├── page.tsx                  # Inicio público
│   │   │   ├── nosotros/page.tsx
│   │   │   ├── primeros-pasos/page.tsx   # contenido trasladado de /bienvenida
│   │   │   ├── ministerios/page.tsx      # estado vacío
│   │   │   ├── eventos/page.tsx          # estado vacío
│   │   │   ├── visitanos/page.tsx        # contenido trasladado de /sede
│   │   │   ├── dar/page.tsx              # estado vacío
│   │   │   ├── sitemap.ts
│   │   │   └── robots.ts
│   │   ├── (app)/                        # NUEVO route group, requiere sesión
│   │   │   ├── layout.tsx                # barra inferior
│   │   │   ├── inicio/page.tsx
│   │   │   ├── mi-camino/page.tsx        # estado vacío
│   │   │   ├── avisos/page.tsx           # estado vacío
│   │   │   └── perfil/page.tsx           # datos propios + selector de tema
│   │   ├── registro/, pendiente-tutor/, error-verificacion/ # spec 001, sin cambios de contenido
│   │   ├── error.tsx, global-error.tsx, not-found.tsx # NUEVOS
│   │   ├── layout.tsx                    # lang="es", ThemeProvider, NextIntlClientProvider
│   │   └── providers.tsx                 # + ThemeProvider (next-themes)
│   ├── config/
│   │   ├── nav-publica.ts                # NUEVO
│   │   └── nav-app.ts                    # NUEVO
│   ├── lib/
│   │   └── api-client.ts                 # NUEVO — parsea Problem Details, traduce code
│   └── messages/
│       └── es.json                       # NUEVO — namespace "errors" + resto de textos migrados
├── e2e/
│   ├── registro-bienvenida.spec.ts       # + AxeBuilder, claro/oscuro
│   └── primeros-pasos-visitanos.spec.ts  # NUEVO
└── (bienvenida/, sede/ eliminados — ver Clarifications del spec)

apps/backoffice/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # sidebar + robots noindex
│   │   ├── page.tsx                       # Inicio (estado vacío o métricas básicas)
│   │   ├── sedes/, pendientes-tutor/      # spec 001, ahora dentro del sidebar
│   │   ├── personas/, solicitudes/, grupos/, eventos/, notificaciones/, catalogos/ # estado vacío (Admin)
│   │   ├── mis-discipulados/, mi-disponibilidad/ # estado vacío (Discipulador)
│   │   ├── mis-grupos/                    # estado vacío (Líder de curso)
│   │   ├── robots.ts                      # Disallow: /
│   │   └── error.tsx, not-found.tsx
│   ├── config/
│   │   └── nav.ts                         # NUEVO — con roles
│   └── messages/es.json
└── e2e/ (si aplica, ver tasks.md)

packages/ui/                               # NUEVO paquete de workspace
├── package.json                           # @vida-sobrenatural/ui
└── src/
    ├── styles/theme.css                    # tokens extraídos, paleta neutra provisoria
    ├── components/ui/                      # button, sheet, navigation-menu, sidebar, skeleton, etc.
    ├── components/estado-vacio.tsx          # NUEVO — componente compartido de estado vacío
    ├── lib/utils.ts
    └── index.ts

packages/shared-types/src/
└── error-code.ts                          # NUEVO — type ErrorCode
```

**Structure Decision**: Se mantiene la estructura de monorepo del spec 001 (`apps/api`, `apps/web`,
`apps/backoffice`, `packages/shared-types`) y se agrega `packages/ui` (Decisión 1 de `research.md`)
para los tokens/componentes ya duplicados entre los dos frontends. Dentro de `apps/web` se
introducen dos route groups de Next.js (`(publica)`, `(app)`) para separar físicamente el menú
público del menú con sesión, sin duplicar código de layout entre ambos (comparten `packages/ui`).
`apps/backoffice` no necesita route groups porque no tiene una superficie pública — todo su árbol
queda detrás de un único layout con sidebar filtrado por rol.

## Complexity Tracking

*Sin violaciones de la Constitución — sección no aplica (ver tabla de Constitution Check arriba).*
