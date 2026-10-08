# Implementation Plan: Notificaciones — Avisos in-app y email

**Branch**: `012-notificaciones` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-notificaciones/spec.md`

## Summary

La app tiene la pestaña Avisos vacía, el ítem Notificaciones del backoffice vacío y una costura en la
004 (`apps/api/src/discipulado/eventos.ts`) que solo loguea. Esta spec construye, con D149 (Avisos +
email; push después):

1. **Un mecanismo único de emisión** (`NotificacionesService.emitir(tx, evento)`) contra un
   **catálogo cerrado y compartido** (`CATALOGO_AVISOS`, `packages/shared-types`), que escribe la
   Notificación y sus Entregas **dentro de la transacción** del cambio de dominio (research #1–#4).
   La 004 y la activación de menores (Flujo 7) pasan a emitir por ahí; 008–011 tienen su catálogo
   definido (contracts/catalogo-eventos.md).
2. **La pestaña Avisos** de la web app: lista paginada, sin leer / leídos, enlace real que marca
   leído y lleva al destino, aviso completo, marcar todos, contador en la barra.
3. **El mail de los importantes** con el `EmailService` de la 007: un proceso con reintentos y
   `SKIP LOCKED`, plantilla como función pura, sin datos sensibles en el asunto.
4. **Avisos manuales** desde el backoffice (Admin envía, Pastor ve), con conteo previo y
   estadísticas, y la lista de mails que no salieron.
5. **Recordatorios de Eventos** en un módulo único de tareas programadas (depende de la 011).

## Technical Context

**Language/Version**: TypeScript 6 en las tres apps y los paquetes (versión de Node la del repo).

**Primary Dependencies**: NestJS 12 + Prisma 7.10 (`apps/api`); Next.js 16.3 + next-intl 4
(`apps/web`, `apps/backoffice`); `packages/ui` (shadcn, `TablaDatos`, `Paginacion`, `EstadoVacio`,
`Button`, `useEnvio`, `useValidacionCampos`, `ResumenErrores`, `AlertDialog`). **Nueva**:
`@nestjs/schedule` en `apps/api` (ya prevista en `docs/10`). Ninguna otra: ni Redis, ni BullMQ,
ni React Email (research #5, #6).

**Storage**: PostgreSQL. Dos tablas nuevas (`notificaciones`, `entregas_notificacion`), cinco enums
y SQL a mano para CHECKs e índices parciales (data-model.md).

**Testing**: Jest unitario (catálogo, plantilla, esperas de reintento, resolución de alcance con `tx`
falso) e integración contra la base de test (emitir en tx y rollback, reparto, idempotencia,
`SKIP LOCKED` con dos procesos, endpoints, permisos); Playwright en `apps/web` (Avisos) y
`apps/backoffice` (Notificaciones), con `axe` en claro y oscuro y `@celular` (360 px). Los mails se
leen de Mailpit (helper de la 007). Las tareas programadas se corren a mano en los tests
(`TAREAS_PROGRAMADAS=false`).

**Target Platform**: Docker Compose local (Postgres + Mailpit). Producción sin definir (D75); el
hosting tiene que admitir procesos siempre activos (ya en `docs/10`).

**Project Type**: monorepo web (pnpm + Turborepo): `apps/api`, `apps/web`, `apps/backoffice`,
`packages/shared-types`, `packages/ui`.

**Performance Goals**: aviso visible en el mismo instante en que se confirma el cambio (SC-001);
mail en < 2 min (empujón + vuelta de 30 s); aviso manual a 500 Personas confirmado en < 5 s
(SC-005); contador por índice parcial.

**Constraints**: sin datos personales en logs, Sentry, eventos ni asuntos (Principio X, D96,
`docs/13` §5); envío fuera de la request (D100); textos por `next-intl` (D84); colores de tokens
(D118); 16 px / 44 px en celular (D150).

**Scale/Scope**: cientos de Personas; decenas de avisos por día; 2 pantallas nuevas + 1 modificada
en la web (Avisos, Aviso completo, barra), 2 en el backoffice (listado con diálogo, detalle); ~30
eventos en el catálogo (10 conectables hoy: los de la 004 y la activación).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Pregunta | Estado |
|---|---|---|
| I. Spec-first | ¿Todo sale de `docs/`? | PASA — Flujo 10, `docs/16` §1, D48/D49/D59/D96/D100/D149. Lo no decidido está en Assumptions y en Preguntas para Echu. |
| II. Terminología | ¿Nombres canónicos? | PASA — Notificación, Entrega de Notificación, `alcance`, `disparador`, `prioridad` de `docs/04`. "Aviso" es el nombre visible (glosario de la spec). |
| III. Soft delete | ¿Se borra algo? | PASA — Notificaciones y Entregas no se borran; los avisos manuales no se editan ni retiran (FR-033). `limpiar-e2e` es la excepción ya aceptada (H-67). |
| IV. Simplicidad | ¿Algo prematuro? | PASA — push, Suscripción a Notificación y preferencias de canal quedan afuera (D149). Sin cola externa ni React Email. El catálogo de 008–011 se escribe ahora porque cinco specs en paralelo lo necesitan (Principio XI), pero no se construye nada de sus entidades. |
| V. Seguridad | ¿Autorización por registro? ¿Datos sensibles? | PASA — `/avisos/*` filtran por la Persona de la sesión (aviso ajeno = 404); envío manual con permiso de catálogo; asuntos genéricos testeados (SC-006); mensajes manuales sin enlaces clickeables. |
| VI. Testing pragmático | ¿Reglas con ramas testeadas? ¿Flujo crítico con e2e? | A CUBRIR en `tasks.md` — unit: catálogo, resolución de alcance, reintentos, plantilla, privacidad; integración: transacción, idempotencia, SKIP LOCKED, endpoints; e2e: Avisos y aviso manual con mail. |
| VII. Accesibilidad | ¿Estados con texto + ícono? ¿axe en dos temas? | PASA — "Sin leer" e "Importante" con texto + ícono; contador con texto accesible; e2e con axe claro/oscuro. |
| VIII. Experiencia consistente | ¿Cuatro estados, checklist por pantalla, navegación? | A CUBRIR — una tarea de checklist `docs/15` por pantalla (D114); `loading.tsx`/`error.tsx`; diálogo de alta como Sedes; paginado por URL. |
| IX. Idiomas | ¿Textos por next-intl? ¿API sin idioma? | PASA — avisos guardan `evento` + `params`, el texto se arma en la web con next-intl y en el mail con el catálogo de mensajes por idioma (research #3). Se arregla el título fijo de `/avisos`. |
| X. Errores y observabilidad | ¿Problem Details? ¿Códigos nuevos? ¿Logs sin PII? | PASA — `NOTIFICACION_SIN_DESTINATARIOS`, `ALCANCE_NO_DISPONIBLE` y códigos de campo; `ultimoError` guarda solo el tipo. |
| XI. Una sola fuente de verdad | ¿Algo duplicado? | PASA — un solo `emitir`, un solo catálogo, un solo `resolverDestinatarios` (envío y conteo previo), `destino` compartido por web y mail, un solo módulo de tareas programadas (FR-038), `EmailService` de la 007. |

**Re-check post-diseño**: sin violaciones. Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/012-notificaciones/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── catalogo-eventos.md     # CATALOGO_AVISOS: 001, 004, 008–011
│   ├── emision.md              # NotificacionesService.emitir(tx, evento)
│   ├── avisos-api.md           # /avisos (web)
│   ├── notificaciones-api.md   # /notificaciones (backoffice)
│   └── email-aviso.md          # plantillaAviso + EnvioEmailsService
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── avisos.ts                    # NUEVO — EventoAviso, Destinatario, CATALOGO_AVISOS, constantes, DTOs
├── eventos-discipulado.ts       # se elimina (reexport transitorio en lote 0, fuera en lote B)
├── permisos.ts                  # + 'notificaciones.enviar'
└── error-code.ts                # + NOTIFICACION_SIN_DESTINATARIOS, ALCANCE_NO_DISPONIBLE

apps/api/
├── prisma/schema.prisma         # + Notificacion, EntregaNotificacion, enums
├── prisma/migrations/…_notificaciones/  # + SQL a mano: CHECKs, índice parcial
├── prisma/seed-demo.ts          # + avisos de demo (D120)
├── scripts/limpiar-e2e.ts       # + entregas/notificaciones de Personas e2e-
├── scripts/correr-tarea.ts      # NUEVO — `tareas:correr <nombre>`
├── src/notificaciones/          # NUEVO
│   ├── notificaciones.module.ts
│   ├── notificaciones.service.ts      # emitir, crearManual
│   ├── destinatarios.ts               # resolverDestinatarios (único)
│   ├── envio-emails.service.ts        # procesarPendientes, empujar
│   ├── avisos.controller.ts           # /avisos
│   ├── avisos.service.ts
│   ├── notificaciones.controller.ts   # /notificaciones
│   └── dto/
├── src/tareas-programadas/      # NUEVO
│   ├── tareas-programadas.module.ts   # ScheduleModule.forRoot(), TAREAS_PROGRAMADAS
│   └── recordatorios-eventos.service.ts   # lote E (depende de 011)
├── src/email/plantillas/aviso.ts      # NUEVO (sobre lo de la 007)
├── src/email/mensajes/es.json         # + avisos.*
├── src/discipulado/eventos.ts         # se elimina; sus llamadores usan NotificacionesService
├── src/discipulado/*.service.ts, src/solicitud-discipulado/*.service.ts  # emitir dentro de la tx
├── src/persona/persona.service.ts     # activar → persona.cuenta_activada
└── test/unit/…, test/integration/…

apps/web/
├── public/marca/logo-email.png  # NUEVO — logo para los mails
├── src/messages/es.json         # + avisos.* (pantalla y avisos.eventos.*)
├── src/app/(app)/layout.tsx     # pide /avisos/sin-leer
├── src/components/nav-app-bar.tsx   # contador
├── src/app/(app)/avisos/        # page, loading, error, lista, [id]/page, [id]/ir/route.ts
└── e2e/avisos.spec.ts

apps/backoffice/
├── src/messages/es.json         # + notificaciones.*
├── src/app/notificaciones/      # page, loading, error, cliente con diálogo, [id]/page
└── e2e/notificaciones.spec.ts
```

**Structure Decision**: módulo nuevo `notificaciones` en la API (dueño de las dos tablas), módulo
`tareas-programadas` como único hogar de los crons, catálogo en `shared-types`. Las pantallas viven
donde la navegación ya las puso (`docs/14`).

## Dependencias con otras specs

| Spec | Qué necesita esta spec | Estado al 2026-10-07 | Si no está |
|---|---|---|---|
| **007** Ingreso con código | `EmailService`, `SmtpEmailService`, `EmailServiceFalso`, Mailpit, `COLORES_EMAIL`, `mensajes/es.json`, helper de Mailpit en e2e | rama `007-ingreso-codigo-email`, sin mergear | Lote C (mail) espera; lotes 0, A, B y D (sin mail) avanzan |
| **004** Vida Nueva | Eventos, Grupo, Inscripción, `hoyEnArgentina` | en `main` | — |
| **001** / **005** Bienvenida, Roles | `PATCH /personas/:id/activar` (001), `CATALOGO_PERMISOS` (005) | en `main` | — |
| **006** Discipulador en la web app | Ruta `/mis-discipulados` en la web (destino de `discipulado.propuesta_nueva`) | en paralelo | Destino provisorio `/mi-camino`; cambiar una línea del catálogo al mergear la 006 |
| **008** Vida de Servicio | Solicitud/Inscripción VS, Cronograma, Contenido | en paralelo | Sus eventos quedan en el catálogo sin llamador (lote F) |
| **009** Ministerios | Ministerio, Postulación, "miembro vigente" | en paralelo | Alcance "A un ministerio" deshabilitado con explicación |
| **010** Bautismo | Solicitud de Bautismo, Evento de bautismo (D147) | en paralelo | Ídem 008 |
| **011** Eventos | Evento (`fecha`, `requiere_inscripcion`, `dias_anticipacion_recordatorio`, `cupo`, `slug`), Inscripción a Evento, Pago | en paralelo | Lote E espera |
| Flujo 12 (alta adulto, D145) | Emitir `persona.cuenta_activada` al dar de alta con email | sin spec asignada | La spec que lo construya hace la llamada |

## Orden de construcción

1. **Lote 0** (secuencial, compartido): `shared-types` (catálogo, tipos, constantes, errores,
   permiso), Prisma + migración, `NotificacionesModule` con `emitir` y `resolverDestinatarios`,
   mensajes (web + backoffice; los del mail van en C), `limpiar-e2e`, `seed-demo`.
2. En paralelo:
   - **Lote A** — Avisos en la web (US1) + `/avisos` en la API.
   - **Lote B** — Conexión de la 004 y de `activar` (US2).
   - **Lote C** — Mail (US3). Requiere la 007 en `main`.
   - **Lote D** — Notificaciones en el backoffice (US4).
3. **Lote E** — Recordatorios (US5). Requiere la 011 en `main`.
4. **Lote F** — Conexión de 008/009/010/011 (US6), solo de las que estén en `main`.
5. **Cierre** — tres suites verdes, `docs/` (Cambios a docs al mergear), revisión manual.

## Riesgos

- **Tope diario del proveedor de mail** en un aviso importante a todas las personas → reintentos
  hasta ~7 h, después visible como fallido (FR-030/031); Pregunta 5 para Echu.
- **Cambiar la 004 a emitir dentro de la transacción** toca cinco servicios con tests en verde →
  lote B dedicado, un commit por servicio, con los tests de la 004 actualizados en el mismo commit
  (CLAUDE.md).
- **Specs en paralelo cambian nombres de campos** (Evento, Postulación) → el catálogo depende solo
  de ids en `datos`; las consultas de recordatorios y de alcance `ministerio` se ajustan al mergear.
- **Procesos programados duplicados** con más de una instancia de la API → idempotencia por clave y
  `SKIP LOCKED` (FR-014, FR-023).

## Decisiones nuevas (numeradas en `docs/05-decisiones.md`: D197–D206)

1. **D197** — **Los avisos se emiten dentro de la transacción del cambio de dominio; el mail sale después.**
   Enmienda el contrato de eventos de la 004 ("después del commit"). *Por qué*: con persistencia,
   emitir después del commit puede dejar un cambio confirmado sin aviso; adentro de la transacción
   pasan o no pasan juntos, y el envío lento sigue afuera (research #1).
2. **D198** — **La Notificación automática guarda el nombre del evento del catálogo (`evento`) y sus
   parámetros (`params`: ids y datos no personales); el `disparador` de `docs/04` se deriva del
   catálogo y no se guarda; `titulo` y `mensaje` existen solo en las manuales.** *Por qué*: el texto
   se arma en el idioma de cada destinatario (D84) y no puede contener datos personales; guardar
   texto lo congela (research #3).
3. **D199** — **Nuevo disparador `proceso_actualizado` (prioridad normal)** para cambios del proceso que la
   Persona no pidió (finalización o baja confirmadas, Vida de Servicio completada) y para avisos a
   quien tiene que actuar (propuesta al Discipulador). *Por qué*: los eventos de la 004 no entraban
   en ninguno de los cuatro de D49/`docs/04` (research #12).
4. **D200** — **Toda Persona destinataria recibe el aviso en la app, tenga o no acceso hoy; el mail solo si es
   importante y tiene email.** Precisa Flujo 10 paso 10. *Por qué*: no cuesta nada y queda en su
   historial el día que entre con su email (D145, spec 007).
5. **D201** — **Los eventos dirigidos al Admin no generan avisos en esta tanda**; siguen en Pendientes del
   backoffice. *Por qué*: el Admin trabaja en el backoffice (D142) y ya ve ahí lo que espera su
   acción (Pregunta 2).
6. **D202** — **Recordatorios de Eventos: `evento_proximo` el día anterior, a la mañana; `recordatorio_inscripcion`
   solo a quienes no tienen inscripción vigente.** Resuelve la diferencia entre Flujo 8 y Flujo 10.
   *Por qué*: recordar que se anote a quien ya se anotó confunde (Preguntas 3 y 4).
7. **D203** — **Avisos manuales: texto plano (título ≤ 80, mensaje ≤ 1000), sin enlaces clickeables, sin
   edición ni retiro una vez enviados.** *Por qué*: lo enviado ya llegó y salió por mail; un enlace
   en un aviso es una vía de phishing; los límites mantienen el mail legible.
8. **D204** — **Los mails de avisos se reintentan hasta 5 veces (1 min, 10 min, 1 h, 6 h) y los que no salen se
   muestran al Admin con el nombre de la Persona.** *Por qué*: los importantes son transaccionales
   (D96); si no llegan, alguien tiene que avisar por otro medio.
9. **D205** — **Un único módulo de tareas programadas (`@nestjs/schedule`), con cada tarea invocable a mano.**
   *Por qué*: `docs/10` ya lo prevé para tres usos (recordatorios, YouTube, entregas); que estén
   juntas evita dos crons distintos y hace testeable cada tarea (research #7).
10. **D206** — **Abrir un aviso es un enlace real (`/avisos/{id}/ir`) que marca leído y redirige.** *Por qué*:
    `docs/14`/`docs/15` piden enlaces reales; funciona sin JS y con lector de pantalla (research #9).

## Cambios a docs al mergear

- **`docs/04-dominio-entidades.md`** — Notificación: `evento` + `params` en lugar de un
  `disparador` guardado (derivado del catálogo); `titulo`/`mensaje` solo manuales; disparador
  `proceso_actualizado`; clave de idempotencia. Entrega: `proximo_intento_en`; `push` reservado
  (D149). D198, D199.
- **`docs/diagrama-er.mermaid`** — mismos cambios en `NOTIFICACION` y `ENTREGA_NOTIFICACION`.
- **`docs/16-sistemas-transversales.md` §1** — emisión dentro de la transacción; reintentos
  concretos; mails no enviados visibles al Admin; eventos al Admin sin aviso; push para la tanda
  siguiente (D149). D197, D201, D204.
- **`docs/07-flujos-casos-de-uso.md` Flujo 10** — paso 7 (antelación), paso 8 (solo quienes no se
  anotaron), paso 10 (todas reciben el aviso en la app). D200, D202.
- **`docs/15-guia-ux-ui.md`** — glosario: "Aviso".
- **`docs/10-stack-tecnico.md`** — módulo único de tareas programadas; variable `WEB_URL` en la API.
- **`specs/004-vida-nueva-discipulado/contracts/eventos.md`** — nota de que lo reemplaza
  `specs/012-notificaciones/contracts/emision.md` (D197).
- **`specs/revision-manual/COMO-ARRANCAR.md`** — `WEB_URL`, `TAREAS_PROGRAMADAS`, `tareas:correr`.

## Complexity Tracking

Sin violaciones de la Constitución.
