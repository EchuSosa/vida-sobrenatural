# Implementation Plan: Ingreso con código por email

**Branch**: `007-ingreso-codigo-email` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-ingreso-codigo-email/spec.md`

## Summary

Suma una segunda forma de entrar, en la web app y el backoffice: la persona escribe su email,
recibe un código de 6 dígitos y lo escribe. `apps/api` genera el código, guarda solo su huella,
aplica los límites (15 minutos, 5 intentos, 5 envíos por hora por email y 30 por origen) y lo manda
por mail. Cada app de Next lo conecta a NextAuth con un proveedor `Credentials` (`codigo-email`)
que, una vez verificado el código, entra por **la misma puerta que Google**: los callbacks
`signIn`/`jwt` existentes resuelven la Persona, `pendiente_tutor`, los menores pre-cargados (D35) y
fail-closed (D88) sin cambios.

Para eso la 007 construye lo que D96 dejó escrito y nadie hizo todavía: el `EmailService` con
adaptador SMTP y Mailpit en Docker Compose (D140). Además normaliza los emails de toda la app
(minúsculas, sin espacios) para que "mismo email → misma Persona" sea cierto, fija la duración de
la sesión (30 días en la web, 7 en el backoffice) y pone la pantalla de ingreso compartida en
`packages/ui`.

## Technical Context

**Language/Version**: TypeScript (Node.js 22+), mismo stack que el resto del monorepo.

**Primary Dependencies**: NestJS 12 + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js v5
(`apps/web`, `apps/backoffice`); `packages/shared-types`, `packages/ui`. **Una dependencia nueva**:
`nodemailer` (+ `@types/nodemailer`) en `apps/api`, para SMTP (research.md #6). Ninguna otra: ni
React Email (research.md #7), ni Redis, ni `@nestjs/throttler` (research.md #3).

**Storage**: PostgreSQL vía Prisma. Un modelo nuevo, `CodigoIngreso` (data-model.md), y una
migración de datos que normaliza `Persona.email`.

**Testing**: Jest unitario y de integración en `apps/api` (`EmailServiceFalso`); Playwright en
`apps/web` y `apps/backoffice`, que leen el código de **Mailpit** (research.md #12). `test-login`
no cambia.

**Target Platform**: Docker Compose local (Postgres + Mailpit). Producción sin definir (D75, D85,
D140).

**Project Type**: Web application existente (monorepo). No se agrega ningún proyecto.

**Performance Goals**: El mail llega en segundos en local; SC-001 (menos de 2 minutos de punta a
punta) depende del proveedor real, fuera del control del código.

**Constraints**: La pantalla y el mail no revelan si un email está registrado (FR-008, FR-018). El
código nunca se guarda en claro ni se escribe en logs (FR-020). Fail-closed (D88).

**Scale/Scope**: Una iglesia: decenas de pedidos de código por día, con picos los domingos desde el
wifi del templo (razón del límite de 30 por origen).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Contra la Constitución **v1.3.0** (enmendada en esta corrida por D141, a pedido de Echu).

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec aprobada y clarify cerrado? | PASA — `spec.md` con cinco respuestas de Echu; D140 y D141 registradas antes del diseño. |
| II. Consistencia terminológica | ¿Nombres del dominio? | PASA — Persona, Admin, Discipulador, Miembro registrado, `pendiente_tutor`. Entidad nueva "Código de ingreso" agregada a `docs/04-dominio-entidades.md`. |
| III. Soft delete obligatorio | ¿Alguna entidad nueva se borra físicamente? | PASA CON JUSTIFICACIÓN — `CodigoIngreso` se borra a las 24 horas o si falla el envío. No es un recurso del dominio con historia (como Persona o Grupo), sino un secreto efímero: conservarlo no aporta nada y solo agranda lo que se expone si la base se filtra. Ver Complexity Tracking. No se borra físicamente nada existente. |
| IV. Simplicidad | ¿Algo sin spec o prematuro? | PASA — sin React Email, sin Redis, sin throttler, sin tarea programada, un solo adaptador SMTP. El `EmailService` se construye porque la 007 es su primera necesidad real, y solo con lo que el mail del código necesita. |
| V. Seguridad (v1.3.0) | ¿Sin contraseñas? ¿Código como huella, con vencimiento y límites? ¿Fail-closed? ¿Email verificado antes de vincular? | PASA — HMAC con secreto de servidor, comparación en tiempo constante, 15 min, 5 intentos, 5/h por email y 30/h por origen, IP solo como huella. Endpoints internos (`InternalLookupGuard`). `authorize()` sin API → pantalla de error (D88). El código cuenta como email verificado, como exige el principio enmendado. El asunto del mail lleva el código: no es un dato sensible de la Persona (decidido en el clarify). |
| VI. Testing pragmático | ¿Reglas con ramas testeadas? ¿Flujo crítico con e2e? | A CUBRIR en `tasks.md` — unitarias (generación, huella, cada límite, cada estado del código, normalización, plantilla), integración (endpoints contra la base), e2e en las dos apps (el ingreso es un flujo crítico: si se rompe, no entra nadie sin Google). |
| VII. Accesibilidad | ¿WCAG 2.2 AA, axe en claro y oscuro? | A CUBRIR en `tasks.md` — `autoComplete="one-time-code"`, `inputMode="numeric"`, foco al cambiar de paso, errores por campo; axe en los e2e de ingreso; el HTML del mail con contraste medido y `lang="es"`. |
| VIII. Experiencia consistente | ¿Cuatro estados, una acción principal, feedback, tono? | A CUBRIR en `tasks.md` — una tarea de checklist de `docs/15-guia-ux-ui.md` por pantalla (D114): ingreso web, código web, pantalla sin sesión del backoffice. Una sola acción principal por paso (clarify). |
| IX. Varios idiomas | ¿Sin textos fijos? | A CUBRIR en `tasks.md` — pantallas por `next-intl`; el mail por un catálogo de mensajes en la API (research.md #7). |
| X. Errores y observabilidad | ¿Problem Details, códigos nuevos en el catálogo, sin datos personales en logs/Sentry? | PASA EN DISEÑO — cinco `ErrorCode` nuevos (data-model.md); ni el email ni el código van a logs o Sentry. |
| XI. Una sola fuente de verdad | ¿Algo escrito dos veces? | PASA EN DISEÑO — la lógica del código vive solo en la API; `FormularioIngresoCodigo` y `BotonIngresarGoogle` en `packages/ui`; constantes y `normalizarEmail` en `packages/shared-types`. Lo que difiere a propósito entre apps (destino después de entrar, qué pasa sin Persona) queda en cada `auth.ts`, como ya documenta H-41. |

**Re-check post-diseño (Phase 1)**: sin cambios. La justificación del Principio III es la única
excepción.

## Project Structure

### Documentation (this feature)

```text
specs/007-ingreso-codigo-email/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── codigo-ingreso-api.md
│   ├── nextauth-codigo-email.md
│   └── email-codigo-ingreso.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
docker-compose.yml                  # EXTENDIDO — servicio mailpit (1025 SMTP, 8025 web)

packages/shared-types/src/
├── codigo-ingreso.ts               # NUEVO — normalizarEmail, constantes del código y de la sesión
├── error-code.ts                   # EXTENDIDO — 5 códigos nuevos
└── index.ts                        # EXTENDIDO — reexporta codigo-ingreso

packages/ui/src/components/
├── formulario-ingreso-codigo.tsx   # NUEVO — dos pasos (email → código), useEnvio, errores por campo
└── boton-ingresar-google.tsx       # MOVIDO desde apps/backoffice, con variante de contorno

apps/api/
├── prisma/schema.prisma            # EXTENDIDO — modelo CodigoIngreso
├── prisma/migrations/…             # NUEVAS — CodigoIngreso; normalizar Persona.email
├── .env*.example                   # EXTENDIDOS — CODIGO_INGRESO_SECRET, SMTP_*, EMAIL_REMITENTE
└── src/
    ├── email/                      # NUEVO
    │   ├── email.service.ts        # clase abstracta EmailService + MensajeEmail
    │   ├── smtp-email.service.ts   # adaptador nodemailer
    │   ├── email.module.ts
    │   ├── plantillas/codigo-ingreso.ts
    │   └── mensajes/es.json
    ├── codigo-ingreso/             # NUEVO
    │   ├── codigo-ingreso.service.ts     # pedir, verificar, límites, limpieza
    │   ├── codigo-ingreso.controller.ts  # POST pedidos, POST verificaciones (InternalLookupGuard)
    │   ├── huella.ts                     # HMAC + comparación en tiempo constante
    │   ├── dto/
    │   └── codigo-ingreso.module.ts
    └── persona/persona.service.ts  # EXTENDIDO — normaliza email al crear y al buscar
└── test/
    ├── unit/codigo-ingreso/…       # NUEVOS
    └── integration/codigo-ingreso.e2e-spec.ts  # NUEVO (EmailServiceFalso)

apps/web/src/
├── auth.ts                         # EXTENDIDO — proveedor codigo-email, maxAge, pages.signIn
├── app/(publica)/ingresar/page.tsx          # CAMBIA — sin sesión muestra la pantalla de ingreso
├── app/(publica)/ingresar/codigo/page.tsx   # NUEVO — paso del código
├── app/(publica)/ingresar/acciones.ts       # NUEVO — pedirCodigo, verificarCodigo
├── app/(publica)/ingresar/loading.tsx, error.tsx
├── app/(publica)/registro/formulario-registro.tsx  # CAMBIA — sin sesión redirige a /ingresar
├── config/nav-publica.ts           # CAMBIA — "Ingresar" apunta a /ingresar
└── messages/es.json                # EXTENDIDO
apps/web/e2e/ingreso-codigo.spec.ts # NUEVO (+ helper leerCodigoDeMailpit, limpieza en global-setup)

apps/backoffice/src/
├── auth.ts                         # EXTENDIDO — proveedor codigo-email, maxAge 7 días
├── components/pantalla-sin-sesion.tsx       # CAMBIA — Google + "o" + formulario
├── components/acciones-ingreso.ts           # NUEVO — pedirCodigo, verificarCodigo
└── messages/es.json                # EXTENDIDO
apps/backoffice/e2e/ingreso-codigo.spec.ts   # NUEVO
```

**Structure Decision**: Todo cae en proyectos existentes. Dos módulos nuevos en la API (`email`,
`codigo-ingreso`), dos componentes nuevos o movidos en `packages/ui`, un archivo nuevo en
`packages/shared-types`. Los mensajes viven en `apps/web/src/messages/es.json` y
`apps/backoffice/src/messages/es.json` (verificado).

## Orden de construcción

1. **Base**: Mailpit en Compose, `EmailService` + SMTP, `shared-types` (constantes, errores,
   `normalizarEmail`), modelo y migraciones.
2. **API**: normalización de email en Persona; módulo `codigo-ingreso` con sus tests.
3. **Piezas compartidas**: `FormularioIngresoCodigo`, `BotonIngresarGoogle` en `packages/ui`.
4. **Web** (Historias 1, 2, 3, 4, 6) y **backoffice** (Historia 5), en paralelo: dependen de 1–3,
   no entre sí.
5. **Cierre**: e2e de las dos apps con axe, checklist de UX por pantalla, tres suites en verde,
   revisión manual con `quickstart.md`.

## Riesgos

- **Emails que chocan al normalizar**: si dos Personas tienen el mismo email con distinta
  mayúscula, la migración falla a propósito. En la base local es improbable; si pasa, decide Echu.
- **`CredentialsSignin` y redirecciones en Auth.js v5**: el manejo de `redirect: false` en acciones
  de servidor cambió entre betas. La primera tarea de la web valida el camino con un test antes de
  armar la pantalla.
- **Entrega real de mails**: sin dominio (D85) no hay SPF/DKIM; en producción los mails pueden caer
  en spam. No bloquea el MVP local; se resuelve con D140 cuando exista el dominio.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Borrado físico de `CodigoIngreso` (Principio III) | Es un secreto efímero, no un recurso del dominio. Guardarlo para siempre agranda lo que se expone si la base se filtra y no le sirve a nadie. | Soft delete (`activo = false`): deja las huellas y las huellas de IP acumulándose sin propósito; cada consulta de límites tendría que filtrarlas igual. |
