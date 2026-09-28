# Quickstart: validar Vida Nueva / Discipulado

Cómo comprobar que la 004 funciona de punta a punta. Para levantar el entorno y dejar la base en
condiciones: `specs/revision-manual/COMO-ARRANCAR.md`. Los contratos están en `contracts/` y el
modelo en `data-model.md`. Esta guía no los repite. **Actualizada el 2026-09-27.**

## Prerrequisitos

- `docker compose up -d`, `pnpm --filter api run db:migrate` y
  `SEED_ADMIN_EMAIL=… pnpm --filter api run db:seed`. El seed crea el Curso "Vida Nueva" individual.
- Las tres apps levantadas (web 3001, backoffice 3002, API 3333, D104).
- `ALLOW_TEST_LOGIN=true` en los `.env.local` para entrar como otra Persona en `apps/web`.
- Si tocaste `packages/shared-types`, reconstruilo con los servidores levantados (H-33).
- Para los escenarios de celular, el navegador en modo dispositivo (360 px) o el proyecto
  `celular` de Playwright.

## Personas que hacen falta

1. Tu cuenta con `admin` (la del seed).
2. Dos Personas adultas con rol `discipulador` (**Personas → Cambiar roles**, mecanismo del 005):
   una del mismo género que la Persona que va a pedir, y otra del otro.
3. Una Persona activa sin Vida Nueva, por ejemplo `demo-activa@example.com`.

## Escenarios

| # | Qué hacer | Qué tiene que pasar | Requisitos |
|---|---|---|---|
| 1 | Como Discipulador 1, entrar al backoffice **desde el teléfono**, sin agenda. | Mis discipulados y Mi disponibilidad dicen que hasta que no cargue horarios no aparece, con enlace. | FR-047, FR-046 |
| 2 | Cargar dos franjas (martes 19:00–21:00, sábado 10:00–13:00), ver el toggle prendido. | La pantalla dice que hoy el Admin lo ve como disponible. | FR-031, FR-015 |
| 3 | Como la Persona, en `apps/web` **Mi camino** → pedir Vida Nueva con "martes 18:00–20:00". Intentar sin franjas. | Sin franjas, error debajo del campo. Con franja, ve "estamos buscando un Discipulador". Un segundo pedido no crea otra Solicitud. | FR-001, FR-032, FR-026 |
| 4 | Como Admin, **Solicitudes** → abrir la pendiente. | El cruce muestra "martes 18:00–20:00" con el Discipulador 1 (coincide 60 min) marcado como sugerido; el Discipulador 2 en "no coinciden" con "otro género" (y "no coincide el horario" si tampoco tiene esa franja). | FR-033, FR-034, FR-035 |
| 5 | Proponer al sugerido. | La Solicitud queda "propuesta a …, hace 0 días". **No** existe Grupo todavía (Grupos sigue vacío). | FR-036 |
| 6 | Como Discipulador 1, **desde el teléfono**, Mis discipulados. | La propuesta primero: nombre, edad, franja en común, sin teléfono. Declinar con motivo. | FR-037, FR-046 |
| 7 | Como Admin, volver a la Solicitud. | Volvió a pendiente; el historial muestra a quién se propuso y el motivo. En Inicio, la tarjeta de pendientes cuenta 1 declinada. La Persona en Mi camino sigue viendo "estamos buscando". | FR-038, FR-048, FR-026 |
| 8 | Proponer de nuevo al Discipulador 1; él acepta. | Se crea el Grupo; él ve teléfono y dirección; la Persona ve su nombre y teléfono en Mi camino. | FR-004, FR-011, FR-027 |
| 9 | Como la Persona, intentar editar sus franjas. | Ya no puede (la Solicitud está aprobada). Antes de la aceptación sí podía, y editar retiraba la propuesta. | FR-039 |
| 10 | Como Discipulador 1, registrar un Encuentro con nota; después editarle los capítulos. | Queda con presente y la nota; la edición se guarda; no hay botón de borrar. | FR-009, FR-013a, FR-041 |
| 11 | Como Admin (y después como Pastor), **Grupos** → abrir el discipulado. | Ven fecha, capítulos y cantidad de Encuentros. **No** ven la nota. El Pastor no tiene botones. | FR-010, D134, D64 |
| 12 | Como Admin, **Personas** → quitarle `discipulador` al Discipulador 1. | Bloqueado: nombra el discipulado con enlace a su Grupo. Quitárselo al Discipulador 2 (sin discipulados ni propuestas) funciona. | FR-043, H-127 |
| 13 | Como Discipulador 1, subir su máximo por grupo a 2. Que otra Persona del mismo género pida con "martes 19:00–20:30". Como Admin, proponer. | El cruce ofrece "sumar al Grupo de …" con "1 de 2" y "coincide el horario". Proponerlo así; el Discipulador acepta. | FR-045 |
| 14 | Como Discipulador 1, proponer la baja de la segunda Persona con motivo; como Admin, confirmar. | Su Inscripción pasa a abandono; el Grupo sigue con la primera. La segunda Persona ve la baja en Mi camino y puede volver a pedir. | FR-042 |
| 15 | Como Admin, **Grupos → Reasignar**: proponer al Discipulador 2 (cargarle antes una franja y darle el rol de nuevo). Como Discipulador 2, aceptar. | Hasta aceptar, el Discipulador 1 seguía viendo el Grupo. Al aceptar, el 2 ve los Encuentros anteriores y el 1 ya no lo ve. | FR-030, FR-037 |
| 16 | Como Discipulador 2, proponer la finalización; como Admin, rechazar con motivo; proponer de nuevo; confirmar. | El rechazo se ve con su motivo; al confirmar, la Persona ve "terminado" y el Grupo queda cerrado con motivo completado. `apto_ministerio` no aparece en ningún lado. | FR-019a, FR-021, FR-022, FR-028 |
| 17 | Como Discipulador 2, cargar un período con fin anterior al inicio; después uno que cubra hoy; borrarlo. | El primero se rechaza debajo del campo. Con el segundo, la pantalla dice que hoy no aparece. Al borrarlo, vuelve a aparecer. | FR-016, FR-017, FR-040 |

## Suites

Antes de cerrar (definición de terminado, D114):

```bash
pnpm --filter api run test        # unit: reglas de asignación, sugerido, transiciones, franjas, puedeQuitarRol
pnpm --filter api run test:e2e    # integración: proponer/aceptar, carreras, sin notas, baja, cierre por abandono
pnpm --filter backoffice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm --filter web run test:e2e
```

Los e2e de flujos críticos (pedir → proponer → aceptar → Encuentro → finalizar) corren `axe` en
modo claro y oscuro (Principio VII), y los del Discipulador también en un viewport de celular
(FR-046).
