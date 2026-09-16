---

description: "Task list for Fase de Bienvenida para Visitantes"
---

# Tasks: Fase de Bienvenida para Visitantes

**Input**: Design documents from `/specs/001-fase-bienvenida/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: Incluidos — la Constitución del proyecto (Principio VI) los exige explícitamente para
esta feature (lógica con ramas → unit Jest; operaciones de base de datos → integración Jest;
flujo crítico de registro → E2E Playwright). El alcance exacto de qué se testea está fijado en
`quickstart.md` ("Tests automatizados") — no se agregan tests más allá de eso, por el propio
Principio VI ("no se exige cobertura exhaustiva").

**Organization**: Tareas agrupadas por User Story de `spec.md` (US1 = Historia 1, US2 = Historia 2,
US2b = Historia 2b, US3 = Historia 3) para poder implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué User Story pertenece la tarea
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Monorepo real (`plan.md`, sección Project Structure): `apps/api` (NestJS), `apps/web` (Next.js,
Visitante), `apps/backoffice` (Next.js, Admin/Discipulador), `packages/shared-types`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar herramientas antes de tocar lógica de dominio.

- [X] T001 Migrar el test runner de `apps/api` de Vitest a Jest (`research.md`, Decisión 1): quitar `vitest`/`@vitest/coverage-v8` y los archivos `vitest.config.ts`/`vitest.config.e2e.ts`; agregar `jest`, `@nestjs/testing`, `ts-jest` (o `@swc/jest`) y `jest.config.ts` en `apps/api/`; actualizar los scripts `test`/`test:e2e` en `apps/api/package.json`; reescribir `apps/api/src/app.controller.spec.ts` y `apps/api/test/app.e2e-spec.ts` al equivalente en Jest.
- [X] T002 [P] Crear `.env.example` con `DATABASE_URL`, `NEXTAUTH_SECRET`, `INTERNAL_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` en `apps/api/.env.example`, `apps/web/.env.local.example` y `apps/backoffice/.env.local.example` (`contracts/auth-integration.md`).
- [X] T003 [P] Instalar y configurar Playwright en `apps/web` (carpeta `apps/web/e2e/`, archivo `apps/web/playwright.config.ts`, script `test:e2e` en `apps/web/package.json`).
- [X] T004 [P] Crear el paquete `packages/shared-types` (`packages/shared-types/package.json`, `packages/shared-types/tsconfig.json`) referenciado por `pnpm-workspace.yaml`, sin contenido todavía.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que bloquea a las 4 User Stories.

**⚠️ CRITICAL**: ninguna User Story arranca hasta terminar esta fase.

- [X] T005 Agregar el modelo `Sede` a `apps/api/prisma/schema.prisma` según `data-model.md` (`id`, `nombre` único entre activas, `direccion` requerido, `contactoTelefono`/`contactoEmail` opcionales, `horarios` requerido, `descripcionBienvenida` opcional, `activo` boolean default `true`, `createdAt`/`updatedAt`) y correr `npx prisma migrate dev --name add_sede`.
- [X] T006 Agregar el modelo `Persona` a `apps/api/prisma/schema.prisma` según `data-model.md`: `email` string único entre todas las Personas (FR-009), `nombre`/`apellido`/`telefono` (sin unicidad)/`direccion` string requeridos, `genero` enum requerido, `fechaNacimiento` date requerido, `sedeId` FK requerido a `Sede`, `estadoCivil` enum requerido (`soltero_a, casado_a, en_concubinato, viudo_a, divorciado_a, separado_a`), `profesion` string requerido, `tiempoCongregacion` enum requerido (`menos_6_meses, 6_meses_a_1_anio, 1_a_3_anios, 3_a_5_anios, mas_5_anios`), `estado` enum requerido (`activa`, `pendiente_tutor`), `activo` boolean default `true`, `consentimientoDatos` boolean, `tutorNombre`/`tutorTelefono` string opcionales, `rol` string[] default vacío, `createdAt`/`updatedAt`; correr `npx prisma migrate dev --name add_persona`.
- [X] T007 [P] Crear script de seed `apps/api/prisma/seed.ts` que inserta una Sede activa ("La Plata") para desarrollo/tests locales, y registrarlo en `apps/api/package.json` (`prisma.seed`).
- [X] T008 [P] Scaffoldear `SedeModule` con controller y service vacíos, registrado en `apps/api/src/app.module.ts`, en `apps/api/src/sede/sede.module.ts`, `apps/api/src/sede/sede.controller.ts`, `apps/api/src/sede/sede.service.ts`.
- [X] T009 [P] Scaffoldear `PersonaModule` con controller y service vacíos, registrado en `apps/api/src/app.module.ts`, en `apps/api/src/persona/persona.module.ts`, `apps/api/src/persona/persona.controller.ts`, `apps/api/src/persona/persona.service.ts`.
- [X] T010 Implementar `AuthModule` + `JwtNextAuthStrategy` (Passport) que valida `Authorization: Bearer <jwt>` contra `NEXTAUTH_SECRET` y expone `req.user` con `email`/`personaId`/`estado`/`rol` en `apps/api/src/auth/auth.module.ts` y `apps/api/src/auth/jwt-nextauth.strategy.ts` (`contracts/auth-integration.md`).
- [X] T011 [P] Implementar `RolesGuard` que compara `req.user.rol` contra los roles requeridos por el endpoint (`admin`, `discipulador`) en `apps/api/src/auth/roles.guard.ts`.
- [X] T012 [P] Implementar `InternalLookupGuard` que valida el header `X-Internal-Secret` contra `INTERNAL_API_SECRET` en `apps/api/src/auth/internal-lookup.guard.ts`.
- [X] T013 [P] Configurar NextAuth.js base (proveedor Google, `session: { strategy: "jwt" }`, `NEXTAUTH_SECRET`) sin lógica de negocio todavía, en `apps/web/src/app/api/auth/[...nextauth]/route.ts`.
- [X] T014 [P] Configurar NextAuth.js base (misma configuración que T013) en `apps/backoffice/src/app/api/auth/[...nextauth]/route.ts`.
- [X] T015 [P] Definir los tipos `Persona` y `Sede` (formas de request/response de `contracts/personas-api.md` y `contracts/sedes-api.md`) en `packages/shared-types/src/persona.ts` y `packages/shared-types/src/sede.ts`.

**Checkpoint**: con esto listo, las 4 User Stories pueden arrancar.

---

## Phase 3: User Story 1 - Entender la Bienvenida y ver la información de mi Sede (Priority: P1) 🎯 MVP

**Goal**: un Visitante sin cuenta ve qué es la Bienvenida y la información de su Sede sin login ni ayuda de otra persona (FR-001 a FR-004).

**Independent Test**: abrir `apps/web` sin sesión, navegar a Bienvenida y a Sede, y ver contenido completo en ambas sin que se pida login (Escenario de validación 1 de `quickstart.md`).

### Implementation for User Story 1

- [X] T016 [US1] Implementar `SedeService.findAllActive()` y `SedeService.findOneActive(id)` (filtran `activo=true`) en `apps/api/src/sede/sede.service.ts`.
- [X] T017 [US1] Implementar `GET /sedes` y `GET /sedes/:id` en `SedeController` — públicos, sin guard, con decoradores `@nestjs/swagger` (`contracts/sedes-api.md`) en `apps/api/src/sede/sede.controller.ts`.
- [X] T018 [P] [US1] Crear la página estática de Bienvenida (FR-001: qué es la Bienvenida y el proceso Bienvenida → Vida Nueva → Vida de Servicio → Ministerio a nivel general, sin detalle de esas fases) en `apps/web/src/app/bienvenida/page.tsx`.
- [X] T019 [P] [US1] Crear la página de información de Sede que consume `GET /sedes` en `apps/web/src/app/sede/page.tsx`: muestra la Sede directamente si hay una sola activa (FR-002/FR-003), ofrece selección si hay más de una (FR-004), y muestra un mensaje (no un error) si no hay ninguna Sede activa (edge case del spec).

**Checkpoint**: User Story 1 funcional y probable de forma independiente.

---

## Phase 4: User Story 2 - Dar el primer paso para registrarme como Miembro registrado vía SSO (Priority: P2)

**Goal**: un Visitante mayor de edad autoriza el acceso con Google, completa el formulario obligatorio, y queda como Miembro registrado (`estado: activa`) sin crear contraseña (FR-005 a FR-007, FR-009, FR-012, FR-013).

**Independent Test**: registrar un Visitante de prueba mayor de edad de punta a punta y verificar que su Persona queda `activa`, asociada a la Sede elegida, y puede volver a iniciar sesión con la misma cuenta (Escenario de validación 2 de `quickstart.md`).

### Tests for User Story 2 ⚠️

> Escribir estos tests primero y verificar que fallan antes de implementar.

- [X] T020 [P] [US2] Unit test (Jest) del cálculo de edad a partir de `fechaNacimiento`, incluyendo el límite exacto de 18 años (cumple hoy vs. un día antes) en `apps/api/test/unit/persona-age.spec.ts`.
- [X] T021 [P] [US2] Unit test (Jest) de la detección de email duplicado en `PersonaService.create()` (FR-009: solo por email, nunca por teléfono) en `apps/api/test/unit/persona-dedup.spec.ts`.

### Implementation for User Story 2

- [X] T022 [US2] Implementar `PersonaService.create()`: calcula edad desde `fechaNacimiento`, rechaza si el email ya existe (409, FR-009), exige `consentimientoDatos=true` solo cuando la edad es ≥18 (FR-013), asigna `estado: activa` + `rol: ["miembro_registrado"]` si ≥18 o `estado: pendiente_tutor` si <18 (FR-007), valida que `sedeId` corresponda a una Sede activa (`contracts/personas-api.md`), en `apps/api/src/persona/persona.service.ts` (depende de T020, T021 en rojo).
- [X] T023 [US2] Implementar `POST /personas` (requiere JWT válido, `PersonaController`; el `email` se toma exclusivamente de los claims del JWT — no es un campo del body, así que no hay valor del cliente que pueda no coincidir) y `GET /personas/by-email` (requiere `InternalLookupGuard`, T012) en `apps/api/src/persona/persona.controller.ts`.
- [X] T024 [US2] Integration test (Jest contra Postgres de test) de `POST /personas` de punta a punta, incluyendo el constraint de unicidad de `email` (409) en `apps/api/test/integration/personas.integration-spec.ts`.
- [X] T025 [US2] Implementar los callbacks `jwt`/`session` de NextAuth que llaman a `GET /personas/by-email` (con `X-Internal-Secret`) y completan `personaId`/`estado`/`rol` en el JWT de sesión, redirigiendo a `/registro` cuando no hay `personaId` todavía, en `apps/web/src/app/api/auth/[...nextauth]/route.ts` (depende de T013, T023).
- [X] T026 [P] [US2] Crear el formulario de registro obligatorio (apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión, tiempo congregándose — FR-006) que llama a `POST /personas`, en `apps/web/src/app/registro/page.tsx`.
- [X] T027 [US2] Verificar que la pantalla de éxito del registro no incluye ningún link o contenido de Vida Nueva, Vida de Servicio o Ministerio (FR-012) en `apps/web/src/app/registro/page.tsx`.
- [X] T028 [US2] E2E test (Playwright) del registro completo de un Visitante mayor de edad vía SSO, único flujo E2E exigido por la Constitución, en `apps/web/e2e/registro-bienvenida.spec.ts` (Escenario de validación 2 de `quickstart.md`).

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 2b - Registro de un Visitante menor de 18 años (Priority: P2)

**Goal**: si el Visitante es menor de 18, el auto-registro se corta (`estado: pendiente_tutor`, sin acceso) y un Admin/Discipulador lo activa (con datos del tutor) o lo marca inactivo (FR-008, FR-014).

**Independent Test**: registrar con una fecha de nacimiento de menor de 18, verificar que no puede iniciar sesión, y que un Admin/Discipulador puede activarlo o marcarlo inactivo desde el backoffice (Escenario de validación 3 de `quickstart.md`).

### Tests for User Story 2b ⚠️

- [X] T029 [P] [US2b] Unit test (Jest) de las transiciones `pendiente_tutor → activa` (vía `activar`) y `pendiente_tutor → activo:false` (vía `marcarInactiva`), incluyendo el rechazo si la Persona no está en `pendiente_tutor`, en `apps/api/test/unit/persona-estado.spec.ts`.

### Implementation for User Story 2b

- [X] T030 [US2b] Implementar `PersonaService.activar(id, tutorNombre, tutorTelefono)` (pasa `estado` a `activa`, guarda `tutorNombre`/`tutorTelefono`, setea `consentimientoDatos=true` — representa el consentimiento del tutor capturado fuera del sistema, FR-013 — asigna `rol: ["miembro_registrado"]`, rechaza si `estado !== pendiente_tutor`) y `PersonaService.marcarInactiva(id)` (pasa `activo` a `false`, mantiene `estado`, rechaza si `estado !== pendiente_tutor` o ya `activo=false`) en `apps/api/src/persona/persona.service.ts` (depende de T022, T029 en rojo).
- [X] T031 [US2b] Implementar `GET /personas/pendientes-tutor`, `PATCH /personas/:id/activar` y `PATCH /personas/:id/marcar-inactiva` en `PersonaController`, protegidos por `RolesGuard` (`admin` o `discipulador`, T011) en `apps/api/src/persona/persona.controller.ts`.
- [X] T032 [P] [US2b] Crear la página para el menor cuyo registro se cortó, explicando que necesita que un tutor gestione su cuenta, en `apps/web/src/app/pendiente-tutor/page.tsx`.
- [X] T033 [US2b] Bloquear el inicio de sesión cuando `estado === "pendiente_tutor"` en el callback de NextAuth (redirige a `/pendiente-tutor` en vez de dejar entrar) en `apps/web/src/app/api/auth/[...nextauth]/route.ts` (depende de T025).
- [X] T034 [P] [US2b] Crear la cola de casos pendientes en el backoffice (`GET /personas/pendientes-tutor`) con acciones "activar" (pide `tutorNombre`/`tutorTelefono`) y "marcar inactiva", en `apps/backoffice/src/app/pendientes-tutor/page.tsx`.

**Checkpoint**: el flujo de registro completo (adulto + menor) es seguro de punta a punta.

---

## Phase 6: User Story 3 - Gestionar la información de la Sede (Priority: P3)

**Goal**: un Admin crea, edita y desactiva (soft delete) la información de Sede que ven los Visitantes (FR-010, FR-011).

**Independent Test**: como Admin, crear una Sede, verla aparecer en `apps/web`, editarla, y desactivarla — incluso siendo la única activa — sin que `apps/web` rompa (Escenario de validación 4 de `quickstart.md`).

### Tests for User Story 3 ⚠️

- [X] T035 [P] [US3] Integration test (Jest contra Postgres de test) de `PATCH /sedes/:id` con `activo: false` (soft delete real, sin `DELETE` físico) en `apps/api/test/integration/sedes.integration-spec.ts`.

### Implementation for User Story 3

- [X] T036 [US3] Implementar `SedeService.create()` y `SedeService.update()`: `nombre` único entre Sedes activas, `direccion` y `horarios` requeridos, al menos uno de `contactoTelefono`/`contactoEmail` presente, soporta `activo: boolean` en el update en `apps/api/src/sede/sede.service.ts` (depende de T016, T035 en rojo).
- [X] T037 [US3] Implementar `POST /sedes` y `PATCH /sedes/:id` en `SedeController`, protegidos por `RolesGuard` (`admin`, T011) en `apps/api/src/sede/sede.controller.ts`.
- [X] T038 [P] [US3] Crear la pantalla de gestión de Sede en el backoffice (listar, crear, editar, desactivar) en `apps/backoffice/src/app/sedes/page.tsx`, con manejo de `403` si el usuario no es Admin.

**Checkpoint**: las 4 User Stories funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: mejoras que cruzan varias User Stories.

- [X] T039 [P] Verificar que Swagger/OpenAPI documenta correctamente todos los endpoints de `Sede` y `Persona` en `http://localhost:<puerto-api>/api` (`apps/api/src/main.ts`).
- [X] T040 [P] Sincronizar `packages/shared-types` (T015) con las formas finales de request/response de `SedeController`/`PersonaController` tras completar todas las User Stories.
- [X] T041 Ejecutar manualmente los 4 escenarios de validación de `quickstart.md` de punta a punta antes de dar la feature por terminada.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Phase 2)**: depende de Setup — bloquea las 4 User Stories.
- **User Stories (Phase 3-6)**: todas dependen de Foundational. US1 y US3 son mutuamente
  independientes. **US2b depende de US2** (comparte `PersonaService`/`PersonaController` y el
  callback de NextAuth) — no tiene sentido implementarla antes que la Historia 2 exista.
- **Polish (Phase 7)**: depende de las User Stories que se quieran incluir en el release.

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Sin dependencia de otras Historias.
- **US2 (P2)**: depende de Foundational. Puede convivir con US1 sin tocarla.
- **US2b (P2)**: depende de Foundational **y de US2** (T022 `PersonaService.create()` y T025
  callback de NextAuth ya deben existir) — es la rama de menores del mismo flujo de registro.
- **US3 (P3)**: depende de Foundational. Reutiliza `SedeService`/`SedeController` de US1
  (T016/T017) pero los extiende (create/update) sin romperlos.

### Within Each User Story

- Tests (cuando existen) se escriben primero y deben fallar antes de implementar.
- Modelo de datos (Foundational) antes que Service.
- Service antes que Controller/endpoint.
- Backend (API) antes que la página de frontend que lo consume.

### Parallel Opportunities

- Tareas [P] de Setup (T002-T004) en paralelo.
- Tareas [P] de Foundational (T007-T009, T011-T015) en paralelo una vez creados los modelos de T005/T006.
- US1 y US3 pueden trabajarse en paralelo entre sí (no comparten archivos de implementación,
  aunque US3 extiende los mismos `SedeService`/`SedeController` que crea US1 — mejor secuencial
  si es una sola desarrolladora).
- US2b debe ir después de US2 (ver dependencias arriba).

---

## Parallel Example: User Story 2

```bash
# Tests de User Story 2 en paralelo:
Task: "Unit test del cálculo de edad en apps/api/test/unit/persona-age.spec.ts"
Task: "Unit test de dedup por email en apps/api/test/unit/persona-dedup.spec.ts"

# Frontend de User Story 2 en paralelo con el backend, una vez el contrato está fijado:
Task: "Formulario de registro en apps/web/src/app/registro/page.tsx"
```

---

## Implementation Strategy

### MVP mínimo (User Story 1 sola)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar Phase 3 (US1).
3. **Parar y validar**: probar Historia 1 de forma independiente (Escenario 1 de `quickstart.md`).
4. Esto ya resuelve la barrera de información fragmentada — el objetivo central del problema —
   aunque todavía no permita registrarse.

### Primer release recomendado (resuelve el objetivo completo de la fase)

1. Setup + Foundational.
2. US1 → validar.
3. US2 **y** US2b juntas → validar (el registro no es seguro de lanzar sin la rama de menores).
4. US3 → validar (para esta fase, con una sola Sede, su información puede cargarse una vez a mano
   por seed/SQL si hiciera falta lanzar antes de tener US3 lista — pero no se recomienda dejarla
   afuera del release por mucho tiempo, dado que es la única forma de mantenerla actualizada).

### Entrega incremental

1. Setup + Foundational → base lista.
2. + US1 → demo (MVP).
3. + US2 + US2b → demo (objetivo completo de la fase de Bienvenida).
4. + US3 → demo (Admin autónomo para mantener la Sede).
5. Cada incremento no rompe el anterior.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí.
- [Story] identifica a qué Historia pertenece cada tarea, para trazabilidad con `spec.md`.
- Verificar que los tests fallan antes de implementar (T020/T021, T029, T035).
- Commitear después de cada tarea o grupo lógico.
- Parar en cualquier checkpoint para validar una Historia de forma independiente.
