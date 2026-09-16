# Research: Fase de Bienvenida para Visitantes

## Decisión 1 — Test runner de `apps/api`: migrar de Vitest a Jest

**Contexto**: la Constitución del proyecto (Principio VI) exige Jest para unit e integración y
Playwright para E2E. El `@nestjs/cli` actual (v12) scaffoldea proyectos nuevos con **Vitest** por
defecto — `apps/api` ya tiene `vitest.config.ts`, `vitest.config.e2e.ts` y scripts `test`/`test:e2e`
apuntando a Vitest, sin Jest instalado.

**Decisión**: Migrar `apps/api` a Jest antes de escribir el primer test de este feature:
- Quitar `vitest`, `@vitest/coverage-v8` y los archivos `vitest.config*.ts`.
- Agregar `jest`, `@nestjs/testing`, `ts-jest` (o `@swc/jest`, más rápido — a definir en tasks),
  `supertest` (ya está para e2e) y la configuración estándar de Jest para NestJS
  (`jest.config.ts` con `testEnvironment: node`, `moduleFileExtensions`, `rootDir: src` para unit
  y una config separada para `test/integration`).
- Reescribir `src/app.controller.spec.ts` y `test/app.e2e-spec.ts` (los únicos archivos de test
  scaffoldeados) al equivalente en Jest, o eliminarlos si quedan obsoletos una vez agregados los
  tests reales de `Persona`/`Sede`.

**Rationale**: la Constitución es no negociable en este punto; Jest es además el estándar de facto
para NestJS (la documentación oficial y la mayoría de ejemplos lo asumen), por lo que revertir el
scaffold es más simple que justificar una excepción.

**Alternativas consideradas**:
- *Mantener Vitest y pedir una excepción de Constitución*: rechazada — no hay ninguna razón
  técnica del proyecto que lo justifique, solo fue el default del generador.
- *Usar Vitest para unit/integración y Jest solo si hiciera falta*: rechazada — generaría dos
  configuraciones de test runner conviviendo sin necesidad, contra el Principio IV (simplicidad).

**Adenda (descubierta durante la implementación de T024)**: el cliente de Prisma 7 (generator
`prisma-client`) carga su query compiler vía WASM con `import()` dinámico — no corre bajo el modo
CJS-por-transform por defecto de Jest (falla con `SyntaxError: Unexpected token 'export'` al
tocar la base de datos real). Los **unit tests** (que mockean `PrismaService`, nunca tocan
Prisma real) siguen en `jest.config.cjs`, transform a CJS vía `@swc/jest`, sin cambios. Los
**tests de integración/e2e** (`test/jest-e2e.config.cjs`) corren en modo ESM nativo de Jest:
`node --experimental-vm-modules` + `extensionsToTreatAsEsm: ['.ts']` + `@swc/jest` con
`module: { type: 'es6' }` (ver script `test:e2e` en `apps/api/package.json`). Es más consistente
con que todo el proyecto ya es `"type": "module"`, no un workaround aislado.

## Decisión 2 — Cómo valida `apps/api` una sesión de NextAuth.js

**Contexto**: la arquitectura (`docs/10-stack-tecnico.md`) establece que `apps/api` es la única
puerta a PostgreSQL — ningún frontend accede a la base directamente. Pero NextAuth.js corre
*dentro* de cada app Next.js (`apps/web` y `apps/backoffice`), no en el backend. Hace falta un
mecanismo para que NestJS confíe en la sesión que NextAuth.js ya validó.

**Decisión**: NextAuth.js se configura con `session: { strategy: "jwt" }` en ambas apps Next.js,
firmando el JWT con un `NEXTAUTH_SECRET` compartido (variable de entorno común a `web`,
`backoffice` y `api`). El frontend adjunta ese JWT como `Authorization: Bearer <token>` en cada
llamada a `apps/api`. `apps/api` implementa un guard (`JwtNextAuthStrategy`, Passport) que verifica
la firma con el mismo secreto y expone `email` + claims mínimos del token al request.

Para el caso puntual del **primer login** (antes de que exista una Persona, o para decidir si
mostrar el formulario de registro o dejar pasar a un Miembro registrado existente): el callback
`jwt`/`signIn` de NextAuth, corriendo server-side en Next.js, llama a
`GET /personas/by-email` en `apps/api` para resolver el estado de esa Persona **antes** de terminar
de armar el JWT de sesión (así el JWT ya incluye `personaId`, `estado` y `rol` sin una segunda
vuelta). Esa llamada puntual no lleva el JWT de usuario (todavía no existe la sesión completa) —
se protege con un secreto de servicio a servicio distinto (`INTERNAL_API_SECRET`), nunca expuesto
al navegador.

**Rationale**: mantiene a `apps/api` como única puerta a la base (ningún Prisma en el frontend);
reutiliza el mecanismo estándar de NextAuth (JWT callbacks) sin construir autenticación paralela;
el secreto de servicio a servicio es un patrón simple y suficiente para el volumen de este
proyecto.

**Alternativas consideradas**:
- *Adaptador de Prisma de NextAuth directamente sobre la base*: rechazada — rompe "`apps/api` es
  la única puerta a la base" (`docs/10-stack-tecnico.md`) y duplicaría lógica de negocio (cálculo
  de edad, dedup) fuera de `apps/api`.
- *Sesiones de base de datos (`strategy: "database"`) en vez de JWT*: rechazada por el motivo
  anterior — esa estrategia también requiere que NextAuth escriba/lea sesiones directamente en
  Postgres.

## Decisión 3 — Contenido de "qué es la Bienvenida" (FR-001)

**Decisión**: contenido estático embebido en `apps/web` (JSX/markdown), no una entidad de base de
datos. El spec solo declara `Persona` y `Sede` como entidades (ver Key Entities); un módulo de
contenido/CMS institucional es explícitamente Fase 2 (`docs/05-decisiones.md`, D50 — "gestión de
contenido institucional").

**Rationale**: Principio IV (no artefactos prematuros) — no hay spec para una entidad de
contenido en esta fase.

## Decisión 4 — Alcance del Flujo 7 (alta manual de un menor) en esta fase

**Contexto**: `docs/07-flujos-casos-de-uso.md` (Flujo 7) describe dos caminos: (A) activar un
`pendiente_tutor` que ya existe por un intento previo, y (B) el Admin/Discipulador crea la cuenta
del menor "desde cero", sin intento previo.

**Decisión**: esta fase implementa **solo el camino A** — es el único cubierto por
`spec.md` (Historia 2b, FR-008, FR-014). El camino B (alta directa sin intento previo) requeriría
una pantalla y un endpoint de creación que el spec actual no contempla.

**Rationale**: Principio I (Spec-First) — no se construye un camino que el spec aprobado no pide.
Si se necesita, se agrega vía una enmienda al spec (`/speckit.specify` o `/speckit.clarify` sobre
esta feature), no directamente en el plan.

## Decisión 5 — `packages/shared-types` sin generación automática todavía

**Decisión**: para esta fase, los DTOs que comparten `apps/web`/`apps/backoffice` con `apps/api`
(forma de `Persona`, `Sede`, payloads de los endpoints en `contracts/`) se escriben a mano en
`packages/shared-types`, importados por los tres apps. No se arma todavía el pipeline de
generación de cliente TypeScript desde el spec OpenAPI que sugiere `docs/10-stack-tecnico.md`.

**Rationale**: con dos entidades y ~8 endpoints, mantener los tipos a mano es más simple que
construir un pipeline de codegen (Principio IV). Se reevalúa cuando la superficie de la API
crezca (Vida Nueva, Vida de Servicio, etc.).

## Decisión 6 — Mecanismo de identificación de Sede cuando exista más de una

**Contexto**: `spec.md` (Assumptions) deja explícitamente diferido a esta fase de planificación el
mecanismo concreto con el que un Visitante identifica a cuál Sede se acercó cuando exista más de
una (FR-004). Hoy solo existe una Sede activa (La Plata).

**Decisión**: para esta fase, `T019` (`apps/web/src/app/sede/page.tsx`) solo cubre el caso real
actual — una única Sede activa, mostrada directamente sin selección (Historia 1, Acceptance
Scenario 3, ya resuelto). El mecanismo concreto para cuando exista una segunda Sede (por ejemplo,
un enlace o código propio por Sede, como ya anticipan las Assumptions del spec) **queda pendiente
de decisión** — se define recién antes de crear esa segunda Sede, con información real de cómo se
va a distribuir/promocionar cada una. No bloquea esta fase ni el resto de las User Stories.

**Rationale**: decidir un mecanismo de selección hoy, sin una segunda Sede real para validarlo
contra, sería diseñar en el vacío (riesgo de sobre-ingeniería, Principio IV). El modelo de datos
(`Sede` como entidad independiente, `Persona.sedeId`) ya soporta agregar una segunda Sede sin
rediseño; solo falta la UI de selección, que es de bajo costo agregar cuando haga falta.

## Resumen de NEEDS CLARIFICATION resueltos

Ninguno quedó abierto: el único punto técnico no trivial (test runner Vitest vs. Jest) se resolvió
en la Decisión 1. El resto de "unknowns" de Technical Context eran de proyecto conocido
(stack ya definido en `docs/10-stack-tecnico.md` y en la Constitución) y no requerían
investigación adicional.
