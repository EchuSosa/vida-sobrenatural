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

## Phase 8: Actualización post-decisiones D91–D105 (2026-09-17)

**Purpose**: alinear la Fase de Bienvenida con las decisiones D91–D105 y la Constitución v1.1.0,
ahora que `002-base-transversal` ya está implementado y commiteado. No modifica ni retoca las
tareas T001–T041 ya completadas — son historial de lo que se construyó en su momento.

**Contexto**: las rutas `/bienvenida`/`/sede` ya pasaron a `/primeros-pasos`/`/visitanos` (hecho en
002-base-transversal); esta fase cubre lo que falta puntualmente de 001: contenido real (D98),
registro por pasos (D94), vínculo SSO con email verificado (Constitución Principio V), el modelo
de datos de consentimiento/alta (D97), el catálogo de errores aplicado a esta fase (D101), y dos
correcciones de lint diferidas desde 002-base-transversal.

**Etiquetado**: esta fase no se organiza por User Story (`spec.md` ya no gana historias nuevas)
sino por grupo de trabajo dentro de la actualización — `[Grupo A]`...`[Grupo E]` reemplaza a
`[Story]` únicamente en esta fase, con el mismo sentido de agrupación/trazabilidad.

### Grupo A — Modelo de datos: consentimiento y origen del alta (FR-013, FR-015, D97)

- [X] T042 [P] Agregar a `apps/api/prisma/schema.prisma`: `enum OrigenConsentimiento { app presencial }`, `enum OrigenAlta { autorregistro admin }`, y en `model Persona`: `consentimientoDatosFecha DateTime?`, `consentimientoDatosOrigen OrigenConsentimiento?`, `origenAlta OrigenAlta @default(autorregistro)`, `altaPor String?` (sin relación FK activa todavía — se define cuando exista el flujo de alta por Admin). Correr la migración de Prisma (`data-model.md`).
- [X] T043 [P] Agregar `EMAIL_NO_VERIFICADO` al `type ErrorCode` de `packages/shared-types/src/error-code.ts` (D101, `contracts/auth-integration.md`).
- [X] T044 [Grupo A] Actualizar `PersonaService.create()` y `PersonaService.activar()` en `apps/api/src/persona/persona.service.ts`: `create()` setea `consentimientoDatosFecha=now()`/`consentimientoDatosOrigen='app'` cuando `consentimientoDatos=true`, y siempre `origenAlta='autorregistro'`/`altaPor=null`; `activar()` setea `consentimientoDatosFecha=now()`/`consentimientoDatosOrigen='presencial'` (`contracts/personas-api.md` actualizado; depende de T042).
- [X] T045 [P] [Grupo A] Unit test (Jest) en `apps/api/test/unit/persona-consentimiento.spec.ts`: verifica que `create()` (mayor de edad) y `activar()` setean `consentimientoDatosFecha`/`consentimientoDatosOrigen` correctos, y que `origenAlta` siempre queda `autorregistro` con `altaPor=null` (depende de T044 en rojo).

### Grupo B — Vínculo SSO solo con email verificado (Constitución Principio V, FR-017)

- [X] T046 [Grupo B] En `apps/web/src/auth.ts`: el `profile()` de `googleProvider` captura `email_verified` (expone `emailVerificadoPorProveedor: boolean`); el proveedor `test-login` acepta un credential opcional `emailVerified` (default `"true"`) para poder simular el caso negativo en E2E; el callback `signIn` rechaza con redirect a `/email-no-verificado` **antes** de llamar `buscarPersonaPorEmail` cuando `emailVerificadoPorProveedor !== true` (`contracts/auth-integration.md`).
- [X] T047 [P] [Grupo B] En `apps/backoffice/src/auth.ts`: mismo chequeo de `email_verified` en `profile()`/`signIn`, con el mismo patrón ya usado para `pendiente_tutor` (`return false`, sin página propia — el backoffice no tiene rutas públicas para este mensaje).
- [X] T048 [P] [Grupo B] Agregar `emailVerificadoPorProveedor?: boolean` a la interfaz `User` de `apps/web/src/types/next-auth.d.ts` (depende de T046).
- [X] T049 [P] [Grupo B] Crear `apps/web/src/app/email-no-verificado/page.tsx`: explica que no se pudo confirmar el email con el proveedor (mensaje distinto de `/error-verificacion` — esto no es una falla transitoria, no invita a "reintentar en un momento"), con `id="contenido"` para el skip-link.
- [X] T050 [P] [Grupo B] Agregar `EMAIL_NO_VERIFICADO` al namespace `errors` de `apps/web/src/messages/es.json` y `apps/backoffice/src/messages/es.json`.
- [X] T051 [Grupo B] Extender `apps/web/e2e/registro-bienvenida.spec.ts` (o un spec nuevo) con el caso de email no verificado usando el `test-login` extendido (T046): verifica el redirect a `/email-no-verificado` y que no se crea ninguna Persona (Historia 2, Acceptance Scenario 7; depende de T046, T049).

### Grupo C — Registro por pasos (D94, `docs/15-guia-ux-ui.md`)

- [X] T052 [P] [Grupo C] Crear `packages/ui/src/components/paso-indicador.tsx` (`PasoIndicador`: texto "Paso X de Y" + barra de progreso accesible, `role="progressbar"` con `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-label`), exportado desde `packages/ui/src/index.ts` — reutilizable por futuros formularios largos, no solo este.
- [X] T053 [Grupo C] Reescribir `apps/web/src/app/registro/page.tsx` como formulario de 4 pasos (Paso 1 "Datos personales": apellido/nombre/género/fecha de nacimiento; Paso 2 "Contacto": teléfono/dirección/Sede; Paso 3 "Sobre vos": estado civil/profesión(+detalle)/tiempo congregándote; Paso 4 "Resumen": muestra todos los datos ya cargados + checkbox de consentimiento + enviar), con el estado del formulario en un único objeto de React que persiste entre pasos (nunca se pierde al volver), botón "Atrás" habilitado desde el Paso 2, y `PasoIndicador` visible en todos los pasos (FR-016; depende de T052).
- [X] T054 [Grupo C] Migrar los textos restantes de `apps/web/src/app/registro/page.tsx` (labels de cada campo, placeholders, textos de los pasos, botones "Atrás"/"Siguiente"/"Registrarme") al namespace `registro` de `apps/web/src/messages/es.json` vía `useTranslations` — completa T082 de `002-base-transversal/tasks.md` (Constitución Principio IX).
- [X] T055 [Grupo C] Actualizar `apps/web/e2e/registro-bienvenida.spec.ts` a los selectores y la navegación del formulario por pasos (T053): completar cada paso, tocar "Siguiente", verificar el resumen del Paso 4 antes de enviar; mantener `@axe-core/playwright` en modo claro y oscuro sobre **cada paso**, no solo la pantalla inicial (Constitución Principio VII; depende de T053, T054).

### Grupo D — Catálogo de errores aplicado a esta fase (D101, FR-018)

- [X] T056 [P] [Grupo D] Verificar que las respuestas de error de `POST /personas`, `PATCH /personas/:id/activar`, `PATCH /personas/:id/marcar-inactiva`, `POST /sedes` y `PATCH /sedes/:id` siguen el catálogo/Problem Details ya implementado por `002-base-transversal` (`AllExceptionsFilter`) sin regresiones, y que `apps/web/src/app/registro/page.tsx` (T053) sigue traduciendo cada `code` con `api-client.ts`; ajustar solo si se detecta alguna respuesta que no siga el formato — no se reimplementa el mecanismo, ya existe.

### Grupo E — Correcciones diferidas y cierre

- [X] T057 [P] [Grupo E] Corregir `react-hooks/set-state-in-effect` en `apps/backoffice/src/app/sedes/page.tsx`: envolver la llamada a `cargarSedes()` dentro del `useEffect` en una función `async` declarada localmente en el cuerpo del efecto (no llamar la función de `useCallback` directamente desde el efecto).
- [X] T058 [P] [Grupo E] Mismo fix en `apps/backoffice/src/app/pendientes-tutor/page.tsx` (`cargarPendientes()`).
- [X] T059 [Grupo E] Correr `pnpm --filter api test`, `pnpm --filter api test:e2e` y `pnpm --filter web test:e2e` completos, y `pnpm --filter web lint` / `pnpm --filter backoffice lint` — confirmar todo en verde, sin modificar aserciones de tests ya existentes fuera de lo que T055/T056 requieren.
- [X] T060 [Grupo E] Recorrer manualmente los escenarios actualizados de `quickstart.md` (Escenario 1 con el contenido real, Escenario 2 con el formulario por pasos y el caso de email no verificado) antes de dar la actualización por terminada.

**Checkpoint**: la Fase de Bienvenida queda alineada con D91–D105 y la Constitución v1.1.0, sin
tocar el trabajo ya entregado en T001–T041.

---

## Phase 9: Correcciones de la revisión manual — Lote 1 (sesión y navegación)

**Purpose**: aplicar el Lote 1 del plan de corrección de
`specs/revision-manual/2026-09-17-001-002.md` (hallazgos H-19, H-15, H-16 — los de esta spec). No
modifica ninguna tarea de las Fases 1–8, ya completadas.

**Contexto**: H-11, H-14 y H-05 del mismo Lote 1 son hallazgos de **specs/002-base-transversal**
(navegación y layout) — ver su `tasks.md`, Phase 12. **Esta fase depende de que esa Phase 12 haya
movido `registro/page.tsx` y `registro/listo/page.tsx` a `apps/web/src/app/(publica)/` (T100) antes
de tocarlos acá** — las rutas de abajo ya asumen esa ubicación nueva.

- [X] T061 [H-19] En `apps/web/src/components/nav-publica-header.tsx`: leer la sesión con `useSession()`; si `session?.user.estado === 'activa'`, reemplazar la acción "Ingresar" por un enlace a `/inicio` (clave `nav.irALaApp` en `es.json`, ej. "Ir a la app"); "Dar" se mantiene siempre visible, con o sin sesión.
- [X] T062 [P] [H-19] En `apps/web/src/app/(publica)/primeros-pasos/page.tsx`: extraer un componente cliente `apps/web/src/components/accion-registro.tsx` que reemplaza el enlace "Registrarme" — con sesión `estado: activa` muestra el mismo acceso a la app que T061 (`/inicio`); sin sesión o sin `estado: activa`, el "Registrarme" de siempre.
- [X] T063 [H-19] En `apps/web/src/auth.ts` y `apps/backoffice/src/auth.ts`: generalizar el callback `jwt` para que, en **cualquier** `trigger === 'update'` (no solo cuando llega `temaPreferido`), vuelva a resolver `personaId`/`estado`/`rol` contra `GET /personas/by-email` — así `update()` funciona como un refresco genérico de la sesión contra el estado actual en la base, reutilizable por T064 y por el `SelectorTema` ya existente.
- [X] T064 [H-19] En `apps/web/src/app/(publica)/registro/page.tsx` (ruta nueva de 002/T100): después de un `POST /personas` exitoso, llamar a `update()` de `next-auth/react` (depende de T063) **antes** de navegar a `/registro/listo`, para que la sesión ya refleje `estado: activa`/`personaId` sin esperar un nuevo login.
- [X] T065 [P] [H-15] Convertir `apps/web/src/app/(publica)/registro/listo/page.tsx` (ruta nueva de 002/T100) en Server Component: `auth()` sin sesión o `estado !== 'activa'` → redirige a `/registro`; además, una guarda de "registro recién completado" vía `sessionStorage` (seteada en `registro/page.tsx` justo antes del `router.push` a esta ruta, leída y limpiada en un componente cliente chico acá) → si falta, redirige a `/` en vez de mostrar una confirmación falsa (depende de T064).
- [X] T066 [H-16] Cuando `apps/web/src/app/(publica)/registro/page.tsx` redirige a `/primeros-pasos` por sesión ya `activa` (edge case existente del spec), agregar `?ya_registrado=1` a esa URL; en `primeros-pasos/page.tsx`, usar `AvisoPorQuery` (creado en 002/T098) para mostrar "Ya estás registrada, no hace falta completarlo de nuevo" una sola vez.
- [X] T067 [H-19, H-15, H-16] Tests afectados: actualizar `apps/web/e2e/registro-bienvenida.spec.ts` para verificar que, tras registrarse, el menú público ya no muestra "Ingresar" y que volver a `/registro` no repite el formulario; nuevo caso e2e para `/registro/listo` sin sesión (debe redirigir, no mostrar la confirmación) — con `@axe-core/playwright` en modo claro y oscuro.

**Checkpoint**: Lote 1 de la revisión manual completo en 001 — la sesión se refleja de inmediato
después de registrarse, y las pantallas de confirmación/redirección del registro dejan de ser
ambiguas o falsificables por URL. Lote 2 y Lote 3 quedan para una corrección posterior.

## Phase 10: Correcciones de la revisión manual — Lote 2 (diseño y errores)

**Purpose**: aplicar el Lote 2 del plan de corrección de
`specs/revision-manual/2026-09-17-001-002.md` (hallazgo H-03, el único de esta spec en este lote).
No modifica ninguna tarea de las Fases 1–9, ya completadas.

**Contexto**: H-07, H-01 y H-04 del mismo Lote 2 son hallazgos de **specs/002-base-transversal** —
ver su `tasks.md`, Phase 13. H-04 en particular define el patrón de "Reintentar" (`router.refresh()`
+ `reset()`) que T109 reutiliza acá.

- [X] T109 [H-03] Nuevo `apps/web/src/app/(publica)/visitanos/error.tsx`: límite de error propio de esta ruta, separado del `error.tsx` general de la raíz. Atrapa solo la falla de `GET /sedes` (la Sede sin cargar es un caso distinto, ya manejado sin lanzar en `page.tsx` con el estado `sinSedes`); mensaje propio (claves `visitanos.errorCargaTitulo`/`visitanos.errorCarga` en `es.json`) y "Reintentar" con el mismo patrón `router.refresh()` + `reset()` de 002/T107.
- [X] T110 [H-03] Tests afectados: verificado con Playwright contra una instancia aislada — con la API caída, `/visitanos` muestra el mensaje de error propio (no el genérico de la raíz) con un código de referencia, y "Reintentar" recupera el contenido real de la Sede una vez que la API vuelve a responder.

**Checkpoint**: Lote 2 de la revisión manual completo en 001 — `/visitanos` distingue "la API no
responde" de "no hay Sede cargada", con reintento funcional en el primer caso. Lote 3 queda para
una corrección posterior.

## Phase 11: Correcciones de la revisión manual — Lote 3 (contenido, datos y herramientas)

**Purpose**: aplicar el Lote 3 del plan de corrección de
`specs/revision-manual/2026-09-17-001-002.md` (hallazgo H-02, el único de esta spec en este lote).
No modifica ninguna tarea de las Fases 1–10, ya completadas.

**Contexto**: H-08, H-09, H-12, H-13, H-17 y H-18 del mismo Lote 3 son hallazgos de
**specs/002-base-transversal** o de infraestructura compartida — ver su `tasks.md`, Phase 14.

- [X] T118 [H-02] Copy real de `docs/12-contenido-bienvenida.md` en `apps/web/src/app/(publica)/primeros-pasos/page.tsx` (frase de apertura, namespace `primerosPasos.fraseTexto`/`fraseAutor` en `es.json`) y reescritura completa de `apps/web/src/app/(publica)/nosotros/page.tsx` (namespace `nosotros` nuevo): "Somos Familia", "Liderazgo" (tres parejas pastorales, con las fotos marcadas como pendientes — D98, no se inventan) y "En qué creemos" marcado explícitamente como pendiente de material real de la iglesia, no vacío ni con texto de relleno. `apps/web/src/components/footer-publico.tsx` pasa a usar `es.json` (namespace `footer`) y suma enlaces reales a Facebook/Instagram de `docs/09-notas-identidad-visual.md`; de paso corrige el mismo horario hardcodeado que tenía mal el seed (ver 002/T112).
- [X] T119 [H-02] Tests afectados: nuevo e2e en `apps/web/e2e/primeros-pasos-visitanos.spec.ts` que verifica el copy real de Primeros pasos y Nosotros, los pendientes marcados como tales, y pasa `@axe-core/playwright` en modo claro y oscuro.

**Checkpoint**: Lote 3 de la revisión manual completo en 001 — Primeros pasos y Nosotros usan el
copy real de `docs/12-contenido-bienvenida.md`, con los pendientes reales visibles como tales.

## Phase 12: Correcciones de la revisión manual — Lote 4 (ronda 2, Personas y Sedes)

**Purpose**: aplicar la parte de esta spec del Lote 4 (`specs/revision-manual/2026-09-17-001-002.md`,
"Plan de corrección (ronda 2)"): hallazgos H-28 (la parte de campos editables de Perfil — Flujo 11),
H-29 (activar/inactivar un menor) y H-30 (Sedes). No modifica ninguna tarea de las Fases 1–11, ya
completadas.

**Contexto**: H-20, H-21, H-22, H-23, H-24, H-25, H-26, H-27 y la parte de layout de H-28 del mismo
Lote 4 son hallazgos de **specs/002-base-transversal** — ver su `tasks.md`, Phase 15.

**Migración de modelo (a confirmar antes de aplicarla — H-29, D63/D108)**: nueva entidad
`RelacionFamiliar` en `apps/api/prisma/schema.prisma` — `id`, `personaId` (FK a Persona, "quien tiene
la relación", ej. el menor), `personaRelacionadaId` (FK a Persona, "la Persona vinculada", ej. el
tutor), `tipo` (enum `TipoRelacionFamiliar`: por ahora `tutor`, más `conyuge`/`hijo`/`padre_madre`/
`hermano` ya modelados para cuando una feature futura los necesite — D63), `createdAt`/`updatedAt`,
con `@@unique([personaId, personaRelacionadaId, tipo])` para no duplicar el mismo vínculo. No se
agrega una tabla de auditoría propia — alcanza con `createdAt`. `ActivarPersonaDto` pasa a aceptar
**o bien** `tutorPersonaId` (crea la Relación Familiar) **o bien** `tutorNombre` + `tutorTelefono`
(texto libre, como hoy), nunca ambos ni ninguno.

- [X] T129 [H-29] Proponer y aplicar la migración de `RelacionFamiliar` descrita arriba (`prisma migrate dev`); actualizar `docs/04-dominio-entidades.md` si el detalle final difiere de lo ya escrito ahí.
- [X] T130 [H-29] `apps/api/src/persona/dto/activar-persona.dto.ts`: `tutorNombre`/`tutorTelefono` pasan a opcionales; nuevo `tutorPersonaId` opcional; validación a nivel servicio (no del DTO, que no puede expresar "uno u otro") de que se mandó exactamente un camino. Nuevo `GET /personas/buscar?q=` (rol admin/discipulador) para encontrar al tutor por nombre/email/teléfono — resultado acotado (id, nombre, apellido, email, teléfono) para elegir sin ambigüedad.
- [X] T131 [H-29] `apps/api/src/persona/persona.service.ts`: `activar()` crea la `RelacionFamiliar` (`tipo: 'tutor'`) cuando llega `tutorPersonaId`, en vez de guardar `tutorNombre`/`tutorTelefono`.
- [X] T132 [H-29] Reescribir `apps/backoffice/src/app/pendientes-tutor/page.tsx`: saca `window.alert`/`window.prompt`/`window.confirm`, usa `ConfirmDestructiveDialog` (`marcarInactiva`) y un diálogo propio de confirmación simple (`activar`) con: buscador de Persona existente (T130) **o** campos de texto tutor/teléfono — una de las dos opciones, no las dos a la vez.
- [X] T133 [H-30] `apps/api/src/sede/sede.service.ts`: `update()` rechaza (`SEDE_UNICA_ACTIVA`, nuevo código en `packages/shared-types/src/error-code.ts`) desactivar la única Sede `activo: true` que quede.
- [X] T134 [H-30] `apps/api/src/sede/dto/crear-sede.dto.ts` y `actualizar-sede.dto.ts`: `horarios` valida un formato acotado (`@Matches`, ej. `Domingos 10:30 hs`, ver constante compartida nueva); `contactoTelefono` pasa a los mismos dos campos estructurados (código de país + número) que ya usa `RegistroPersonaDto` (D90), en vez de un string libre.
- [X] T135 [H-30] Extraer `CampoTelefono` de `apps/web/src/app/(publica)/registro/page.tsx` a un componente compartido (`apps/web/src/components/campo-telefono.tsx`) — lo reutilizan T136 (Sede) y T138 (Perfil).
- [X] T136 [H-30] Reescribir `apps/backoffice/src/app/sedes/page.tsx` con los componentes del sistema de diseño: `ConfirmDestructiveDialog` al desactivar (con el copy exacto del hallazgo H-30) cuando hay otra Sede activa; diálogo informativo con acción "Crear una Sede" cuando es la única activa (código `SEDE_UNICA_ACTIVA` de T133); `CampoTelefono` (T135) para `contactoTelefono`; input de horarios con el mismo formato acotado de T134 (validación también en el cliente, mensaje de error si no matchea).
- [X] T137 [H-28] **Postergado en el Lote 4** (decisión explícita: "si el lote se complica, eso es lo primero que se posterga" — con H-29/H-30 ya completos, el lote ya había crecido bastante). Nuevo `PATCH /personas/me` en `apps/api` (`persona.controller.ts`/`persona.service.ts`/`dto/actualizar-persona.dto.ts`): acepta `telefono` (estructurado), `direccion`, `estadoCivil`, `profesion`/`profesionDetalle` — todos opcionales, cualquier subconjunto. No acepta `fechaNacimiento` ni `email` (FR-029). **Retomado en el Lote 5, ver Phase 13, T140.**
- [X] T138 [H-28] **Postergado en el Lote 4**, mismo motivo que T137. `apps/web/src/app/(app)/perfil/page.tsx`: formulario editable con los 4 campos de T137, reutilizando `CampoTelefono` (`packages/ui`, ya extraído por T135) y los mismos `<select>` de estado civil/profesión que `registro/page.tsx`. Guardar por campo o con un único botón "Guardar cambios" — a definir al implementar, con feedback de éxito (D102). **Retomado en el Lote 5, ver Phase 13, T141.**
- [X] T139 [H-29, H-30] Tests afectados (parte de H-28/Perfil postergada con T137-T138): unit tests nuevos en `apps/api/test/unit/persona-estado.spec.ts` (caminos inválidos de `activar`, self-relación, duplicado literal, duplicado espejo, vínculo exitoso con Relación Familiar) y `apps/api/test/unit/sede-desactivar.spec.ts` (regla de "al menos una Sede activa", formato de `horarios`). Verificado además con Playwright ad hoc contra una instancia aislada (login, activar con búsqueda de tutor, crear/validar/desactivar Sede) — no se armó un `playwright.config.ts` permanente para `apps/backoffice` en este lote (alcance mayor al de H-29/H-30); sí se agregó el proveedor `test-login` a `apps/backoffice/src/auth.ts` como prerrequisito para cuando se decida armarlo.

**Checkpoint**: Lote 4 (parte de 001) — H-29 y H-30 completos: activar/inactivar un menor usa el
sistema de diseño y puede vincular al tutor como Relación Familiar; Sedes tiene confirmación, la
regla de "al menos una activa" y campos validados. **H-28 queda parcial**: el acceso a Perfil desde
escritorio ya está arreglado (ver 002/T123), pero el self-edit de teléfono/dirección/estado
civil/profesión (Flujo 11) se posterga — T137/T138 quedan listas para retomar. Gestionar Relaciones
Familiares desde el propio Perfil (Flujo 11, punto 3) también queda fuera — depende de una UI de
búsqueda de Personas más genérica que la acotada de T130.

## Phase 13: Correcciones de la revisión manual — Lote 5 (Perfil y backoffice)

**Purpose**: aplicar la parte de esta spec del Lote 5 (`specs/revision-manual/2026-09-17-001-002.md`):
H-35 (retoma T137/T138, postergados en el Lote 4 — mismo alcance, User Story 4/FR-028/FR-029 de
`spec.md`, ya especificados) y H-34 (suite de e2e propia para `apps/backoffice`). No modifica ninguna
tarea de las Fases 1–12, ya completadas.

**Contexto**: H-37, H-38 y H-39 del mismo Lote 5 son hallazgos de **specs/002-base-transversal** — ver
su `tasks.md`, Phase 16. Orden sugerido: T140+T141 (H-35) después del Lote 5 de 002 (misma costura de
navegación que toca `apps/web`); T142+T143 (H-34) al final.

- [X] T140 [H-35] Nuevo `PATCH /personas/me` en `apps/api`: `apps/api/src/persona/dto/actualizar-perfil.dto.ts` (`telefono` con `@Matches(TELEFONO_REGEX)` de `@vida-sobrenatural/shared-types` — H-33 — , `direccion`, `estadoCivil`, `profesion`/`profesionDetalle`, todos `@IsOptional()`, cualquier subconjunto; sin `fechaNacimiento` ni `email`, FR-029), `persona.controller.ts` (mismo patrón de autorización por registro que `GET /personas/me` — siempre `request.user.personaId`, nunca un `:id` de la URL) y `persona.service.ts` (`actualizarPerfilPropio`, `update` con los campos presentes en el DTO).
- [X] T141 [H-35] `apps/web/src/app/(app)/perfil/page.tsx`: formulario editable con los 4 campos de T140, reutilizando `CampoTelefono` (`@vida-sobrenatural/ui`, ya extraído por T135) y los mismos `<select>`/opciones de estado civil y profesión que `registro/page.tsx` (mismas claves de `es.json`, namespace `registro.opciones`). Guardado optimista con feedback de éxito/error (D102), mismo patrón que `selector-tema.tsx`. Sigue afuera "gestionar Relaciones Familiares desde Perfil" (nota de `spec.md`).
- [X] T142 [H-34] Nuevo `apps/backoffice/playwright.config.ts` (mismo patrón que `apps/web/playwright.config.ts`: `workers: 1` por D111, `globalTeardown` reutilizando `db:limpiar-e2e` de `apps/api`) y `apps/backoffice/e2e/helpers.ts` (login vía el proveedor `test-login` ya existente en `apps/backoffice/src/auth.ts`).
- [X] T143 [H-34] E2e nuevos: `apps/backoffice/e2e/pendientes-tutor.spec.ts` (activar un menor con tutor vinculado por búsqueda, y con tutor por texto libre — H-29) y `apps/backoffice/e2e/sedes.spec.ts` (desactivar una Sede con confirmación cuando hay otra activa, y el caso de la única Sede activa — H-30).
- [X] T144 [H-35] Tests afectados: unit test nuevo en `apps/api/test/unit/` para `actualizarPerfilPropio` (subconjunto parcial de campos, rechazo de `fechaNacimiento`/`email` fuera del DTO) y confirmación manual del formulario de Perfil en las dos apps.

**Checkpoint**: Lote 5 (parte de 001) completo — Perfil permite editar teléfono, dirección, estado
civil y profesión (H-35, cierra el Flujo 11 salvo Relaciones Familiares, que sigue fuera de
alcance), y `apps/backoffice` tiene su propia suite de e2e cubriendo H-29 y H-30 (H-34).

---

## Phase 14: Correcciones de la revisión manual — Lote 7, parte 1 (ronda 4, Sedes)

**Purpose**: aplicar la parte de Sedes del Lote 7 (`specs/revision-manual/2026-09-17-001-002.md`,
ronda 4): H-51+H-52, decisión **D117**. El resto del Lote 7 (H-50, H-48+H-49, H-46+H-47) es
transversal a `apps/web`/`apps/backoffice` y se documenta en `specs/002-base-transversal/tasks.md`.

- [X] T145 [H-51] `GET /sedes` deja de filtrar `activo: true` por defecto: `SedeService.findAll(estado: 'activas' | 'todas' = 'activas')`, `SedeController` con `@Query('estado')`. `GET /sedes/:id` deja de filtrar del todo (`SedeService.findOne`, sin variante "Active"). `Sede` (`packages/shared-types`) suma `activo: boolean`.
- [X] T146 [H-51] `SedeService.update`: reactivar (`dto.activo === true` sobre una Sede inactiva) corre `validarNombreUnicoEntreActivas` igual que un cambio de nombre — puede chocar con una Sede activa creada mientras tanto (409 `SEDE_NOMBRE_DUPLICADO`). Cubierto en `apps/api/test/unit/sede-desactivar.spec.ts`.
- [X] T147 [H-52] Nueva pantalla `apps/backoffice/src/app/sedes/[id]/page.tsx`: detalle + edición (usa el `PATCH /sedes/:id` ya existente), `EstadoActivoBadge` (texto + ícono, D81, `packages/ui`), Desactivar (si está activa) y Reactivar (si no), con el error de T146 mostrado como "cómo corregir", no solo "inválido".
- [X] T148 [H-52] `apps/backoffice/src/app/sedes/page.tsx`: filtro Activas/Todas (sin búsqueda, orden ni paginación — alcance de spec 004, Principio IV), filas a `sedes/[id]`, alta movida a un modal (`Sheet`) que al cerrarse refresca el listado. Campos de formulario compartidos entre alta y edición en `apps/backoffice/src/components/formulario-sede.tsx`.
- [X] T148a [H-51/H-52] Verificar `sedes/page.tsx` y `sedes/[id]/page.tsx` contra el checklist de `docs/15-guia-ux-ui.md` (cuatro estados, una sola acción principal, orden de botones, tono, teclado y lector de pantalla, contraste en los dos temas) — encontró y corrigió el estado de error sin "Reintentar" en el listado.
- [X] T149 Correr las tres suites de la convención de `docs/00-README.md` antes de cerrar: unitarios de `apps/api`, integración (`pnpm --filter api run test:e2e`) y e2e de `apps/backoffice` (`sedes.spec.ts`, `pendientes-tutor.spec.ts`) y de `apps/web` (regresión del `ConfirmDestructiveDialog` compartido, tocado como efecto de lado necesario de T147).

**Checkpoint**: Lote 7, parte Sedes, completo — una Sede desactivada se sigue viendo y se puede
reactivar, en el backoffice y en la base (D117). El resto del Lote 7 sigue en curso.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Phase 2)**: depende de Setup — bloquea las 4 User Stories.
- **User Stories (Phase 3-6)**: todas dependen de Foundational. US1 y US3 son mutuamente
  independientes. **US2b depende de US2** (comparte `PersonaService`/`PersonaController` y el
  callback de NextAuth) — no tiene sentido implementarla antes que la Historia 2 exista.
- **Polish (Phase 7)**: depende de las User Stories que se quieran incluir en el release.
- **Actualización post-decisiones (Phase 8)**: depende de que `002-base-transversal` esté
  implementado (ya lo está — packages/ui, catálogo de errores, AllExceptionsFilter, next-intl).
  Dentro de la fase: Grupo A (modelo) bloquea Grupo D (verificación de errores, que asume los
  campos nuevos ya existen); Grupo B y Grupo C son independientes entre sí; Grupo E (lint + cierre)
  va al final, después de A-D.

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
