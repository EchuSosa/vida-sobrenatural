# Implementation Plan: Bautismo

**Branch**: `010-bautismo` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-bautismo/spec.md`

## Summary

El paso "se bautiza" del camino de integración (`docs/01`), dentro de la app. Una Persona con Vida
Nueva en curso o completada —o habilitada por el Admin (D147)— pide el bautismo desde la card de
Bautismo de **Mi camino**. El Admin lo ve en la **bandeja unificada de Solicitudes** (que pasa a
tener dos tipos y muestra el filtro por tipo), lo **acepta** o **rechaza**, y cuando la iglesia fija
una fecha **suma a los aceptados a un Evento de bautismo** (spec 011) desde el propio Evento, de a
varios. La asignación es una Inscripción a Evento confirmada creada por el Admin, así el
recordatorio de la 012 llega sin caso especial. La Persona ve en su card en qué está —en revisión,
"Aceptamos tu pedido, te avisamos la próxima fecha", con fecha (fecha, hora, lugar), rechazado por
ahora, bautizada— y puede retirar el pedido o decir "No puedo ese día". Pasado el Evento, el Admin
confirma quiénes se bautizaron. Cada cambio deja su evento de aviso para la 012, sin datos
sensibles.

## Technical Context

**Language/Version**: TypeScript en Node.js 22+ (el stack del monorepo). Sin lenguaje nuevo.

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js +
next-intl (`apps/web`, `apps/backoffice`); `packages/shared-types` (tipos, permisos, códigos,
`calcularEdad`, `formatearDiaEnArgentina`); `packages/ui` (`Button`, `useEnvio`,
`useValidacionCampos`, `ResumenErrores`, `MensajeErrorCampo`, `EstadoVacio`, `TablaDatos`,
`ControlesTabla`, `Paginacion`, `ConfirmDestructiveDialog`, al que se le suma una variante neutra si D151 todavía no la agregó). **No se
agrega ninguna dependencia.**

**Storage**: PostgreSQL vía Prisma. Un modelo nuevo (`SolicitudBautismo`), un enum
(`EstadoSolicitudBautismo`), dos campos en `Persona`, una vista SQL (`bandeja_solicitudes`) e
índices/CHECK a mano en la migración (patrón H-140). Ver `data-model.md`.

**Testing**: Jest unit e integración (`apps/api`), Playwright + axe en los dos temas (`apps/web`,
`apps/backoffice`), proyecto `celular` nuevo en `apps/web` (research #15).

**Target Platform**: Docker Compose local (D130).

**Project Type**: la web application existente; extiende `apps/api`, `apps/web`, `apps/backoffice`,
`packages/shared-types` y `packages/ui` (solo si hace falta la variante neutra del diálogo).

**Performance Goals**: sin meta propia. Decenas de pedidos al año; la bandeja y "Esperando fecha"
paginan en la API igual (`docs/15`).

**Constraints**:
- La lista de Personas a bautizar nunca es pública (D5, FR-018); ningún aviso fuera de la app nombra
  el bautismo (`docs/13` punto 5).
- La card de Bautismo: 360 px primero, 16 px y botones de 44 px (D150).
- Diálogos de retirar y "No puedo ese día": neutros, no rojos (D151).
- Todo color de tokens (D118); nada solo por color (D81); textos por `next-intl` (D84).

**Scale/Scope**: 7 historias, 36 requisitos (FR-001 a FR-034, más FR-020a y FR-020b), 4 pantallas nuevas o modificadas (card de Mi camino, bandeja,
detalle de Solicitud de Bautismo, sección Bautismo del Evento) + el panel de Persona.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Spec-First | ¿Spec aprobada antes del código? | PASA — esta corrida es solo documentación. Las decisiones no tomadas en `docs/` quedan como "Decisiones nuevas" acá y como "Preguntas para Echu" en la spec; nada se implementa hasta que el PR se revise. |
| II. Terminología | ¿Nombres canónicos? | PASA — Solicitud de Bautismo, Evento, Inscripción a Evento, Mi camino, como en `docs/04`/`docs/14`. Estado `aprobada` (dominio) con texto "aceptada" (D147) solo en la interfaz. `realizada` es nuevo y queda como decisión nueva. |
| III. Soft delete | ¿Se borra algo? | PASA — ninguna Solicitud se borra (FR-034): retirar, rechazar y realizar son estados; quitar de un Evento cancela la inscripción (D69) y deja la FK en `null`. |
| IV. Simplicidad | ¿Algo sin spec? | PASA — sin tabla de habilitaciones (dos campos), sin entidad de asignación (se reusa la Inscripción a Evento), sin motor de formularios (D31). "No puedo ese día" y la confirmación traen las Preguntas 1 y el Assumption que los justifican. |
| V. Seguridad | ¿Autorización por registro? | PASA en diseño — `/bautismo/me` solo devuelve lo de la sesión; el motivo de rechazo no sale nunca hacia la Persona; Pastor en lectura (403 en acciones); la página pública del Evento no expone inscriptos. |
| VI. Testing | ¿Reglas con ramas testeadas? | A CUBRIR en `tasks.md` — unit de `estadoCardBautismo` y `motivoNoPuedePedir` (tabla de casos), de cada transición y de los eventos; integración de carreras (índice parcial, `FOR UPDATE`), asignación múltiple parcial, cancelación de Evento y confirmación; e2e de los flujos con axe en los dos temas. |
| VII. Accesibilidad | ¿WCAG y axe en los dos temas? | A CUBRIR — checklist de `docs/15` por pantalla (D114), axe claro/oscuro, `@celular` para la card. |
| VIII. Experiencia consistente | ¿Cuatro estados, `useEnvio`, errores por campo? | A CUBRIR por pantalla; las piezas ya existen en `packages/ui`. |
| IX. Idiomas | ¿Textos por next-intl, claves estables? | A CUBRIR — estados de la card como claves (`EstadoCardBautismo`), namespace `miCamino.bautismo` y `solicitudes.bautismo`. |
| X. Errores | ¿Un código por regla? | PASA en diseño — ocho códigos nuevos con su FR (`contracts/bautismo-api.md`); se reutilizan `NO_ENCONTRADO`, `VALIDACION` y `MOTIVO_DEMASIADO_LARGO`. |
| XI. Una sola fuente de verdad | ¿Nada duplicado? | PASA en diseño — una función pura decide la card y el permiso de pedir (research #6); `estaBautizada` en un solo lugar con puerto a D144 (#7); la fecha se lee del Evento, no se copia (#1); la forma base de la bandeja en una vista (#4); la constante de edad propia (#13). |

Sin violaciones. **Re-chequeo después del diseño:** sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/010-bautismo/
├── spec.md
├── plan.md                 # este archivo
├── research.md             # 15 decisiones técnicas
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── bautismo-api.md
│   ├── eventos-bautismo.md
│   └── dependencia-evento.md   # qué necesita de 011, 012 y D144
├── checklists/
│   └── requirements.md
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── bautismo.ts                 # nuevo: estados, HechosBautismo, estadoCardBautismo, motivoNoPuedePedir, topes, DTOs
├── eventos-bautismo.ts         # nuevo: EventoBautismo
├── discipulado.ts              # TipoSolicitud suma 'bautismo'; SolicitudResumen suma eventoAsignado
├── error-code.ts               # ocho códigos nuevos
└── permisos.ts                 # bautismo.habilitar, bautismo.crear_en_nombre

apps/api/
├── prisma/schema.prisma        # SolicitudBautismo, enum, campos de Persona
├── prisma/migrations/…_bautismo/migration.sql   # + índice parcial, CHECK, vista bandeja_solicitudes
├── prisma/seed-demo.ts         # escenarios de bautismo (D120)
├── scripts/sembrar-e2e-admin.ts, scripts/limpiar-e2e.ts
└── src/
    ├── bautismo/               # nuevo módulo
    │   ├── bautismo.module.ts
    │   ├── bautismo.controller.ts          # /bautismo/me, /bautismo/solicitudes…
    │   ├── bautismo-eventos.controller.ts  # /bautismo/eventos…
    │   ├── bautismo.service.ts             # transiciones + liberarAsignacionesDeEvento + retirarPorDeclaracion
    │   ├── estado-bautismo.ts              # estaBautizada, vidaNuevaDe, puerto HistorialPrevio
    │   ├── eventos.ts                      # emitirEventoBautismo
    │   └── dto/
    ├── solicitud-discipulado/  # GET /solicitudes pasa a leer la vista (bandeja.service.ts nuevo)
    ├── persona/                # PUT/DELETE habilitacion-bautismo
    └── discipulado/pendientes-admin.service.ts   # suma bautismo

apps/web/src/app/(app)/mi-camino/
├── page.tsx                    # una llamada y una línea más
└── tarjeta-bautismo.tsx        # nuevo
apps/web/src/messages/es.json    # miCamino.bautismo
apps/web/playwright.config.ts    # proyecto celular
apps/web/e2e/mi-camino-bautismo.spec.ts

apps/backoffice/src/
├── app/solicitudes/            # filtro por tipo visible, columna tipo, "Nueva solicitud en nombre de…" con tipo
├── app/solicitudes/bautismo/[id]/   # detalle de Solicitud de Bautismo (nuevo)
├── app/personas/personas-cliente.tsx  # Habilitar el bautismo
├── components/seccion-bautismo-evento.tsx   # nuevo: la monta el detalle de Evento de la 011
├── components/pedir-en-nombre-de.tsx        # suma el tipo
├── app/page.tsx                # tarjeta de pendientes suma bautismo
└── messages/es.json            # (apps/backoffice/src/messages/es.json)
apps/backoffice/e2e/bautismo-*.spec.ts
```

**Structure Decision**: módulo propio `apps/api/src/bautismo/` (como `solicitud-discipulado/`); la
bandeja sigue en su controlador actual y su listado pasa a un `bandeja.service.ts` que lee la vista.
El detalle de bautismo tiene ruta propia (`/solicitudes/bautismo/[id]`) para no tocar el detalle de
Discipulado (`/solicitudes/[id]`); la bandeja enlaza a uno u otro según `tipo`.

## Dependencias con otras specs

| Spec | Qué usa la 010 | Detalle |
|---|---|---|
| **011 — Eventos** | `Evento` con discriminador de bautismo, `InscripcionEvento`, inscripción por el Admin sin cupo ni aprobación, cancelación que llama al hook de la 010, detalle de Evento en el backoffice que monta `SeccionBautismoEvento`, página pública sin inscriptos, fixtures. | `contracts/dependencia-evento.md`, E1–E9. **Bloquea los lotes B y C.** |
| **012 — Notificaciones** | Conectar `emitirEventoBautismo` a `solicitud_actualizada`; texto genérico fuera de la app; recordatorio `evento_proximo` sin nombrar el bautismo. | N1–N3. No bloquea: sin la 012, los eventos van al log. |
| **Spec de D144 — Historial previo** (número a confirmar) | Implementar el puerto `HistorialPrevio`, pasar "Ya me bauticé" a la card, retirar la Solicitud abierta al confirmar una declaración. | H1–H3. No bloquea: el puerto devuelve `false`. |
| **004 — Vida Nueva** (mergeada) | `Inscripcion`/`Grupo`/`Curso` para "en curso" y "completada"; la bandeja y `pedir-en-nombre-de`; `pendientes-admin`; la card de Vida Nueva (enlace). | Ya en `main`. |
| **005 — Permisos** (mergeada) | `CATALOGO_PERMISOS`, `@RequierePermiso`, `requerirPermiso`. | Ya en `main`. |
| **Otras specs paralelas que suman tipos a la bandeja** (Vida de Servicio, Postulaciones, Inscripciones a Evento) | La vista `bandeja_solicitudes` (research #4): la primera que mergea la crea; las demás `CREATE OR REPLACE VIEW`. | Coordinación al mergear. |

## Paralelización (para `/speckit-tasks`)

- **Lote 0 — base (una sesión, primero):** `shared-types` (`bautismo.ts`, `eventos-bautismo.ts`,
  `TipoSolicitud`, códigos, permisos), `schema.prisma` + migración (con la vista), fixtures y
  limpieza e2e, `estado-bautismo.ts` con el puerto, `eventos.ts`, el módulo registrado vacío, el
  proyecto `celular` en `apps/web`, namespaces vacíos en los dos `es.json`. Requiere la 011
  mergeada **solo** para la FK a `InscripcionEvento`; si la 011 no llegó, el lote 0 deja la columna
  sin FK y la tarea de la FK pasa al lote B.
- **Lote A — Persona (web):** endpoints `/bautismo/me` y `/bautismo/solicitudes/me…`, la card y sus
  e2e. Independiente de la 011 salvo los estados con fecha (se prueban en el lote B).
- **Lote B — Admin, revisión y asignación (backoffice):** bandeja sobre la vista, detalle,
  aceptar/rechazar, asignar/quitar, sección del Evento, confirmar, hook de cancelación, pendientes.
  Necesita la 011.
- **Lote C — excepciones:** habilitar desde Personas, crear en nombre de (con el selector de tipo).
- **Cierre (secuencial):** e2e del flujo completo (pedir → aceptar → asignar → confirmar), seed-demo,
  checklists de pantalla, las tres suites.

## Decisiones nuevas (numeradas en `docs/05-decisiones.md`: D179–D187; la DN-8 quedó unificada en D178 y precisada en D186)

Numeradas en el lote 0 global (`lote-0-global`), con su porqué en `docs/05-decisiones.md`.

- **D179 — La Solicitud de Bautismo no pide fecha deseada.** Pide un texto opcional ("¿Querés
  contarnos algo?"). *Por qué:* con D147 la fecha la fija la iglesia como Evento; preguntarla promete
  algo que no depende de la Persona. Corrige `docs/04` y el ER (Pregunta 3).
- **D180 — Estado `realizada` y confirmación de bautismos.** Pasado un Evento de bautismo, el Admin
  confirma quiénes se bautizaron (todos tildados por defecto); los destildados vuelven a esperar
  fecha. *Por qué:* sin esto la app solo sabe que alguien "tenía fecha", y Mi camino y las métricas
  (`docs/08`) necesitan el hecho (Pregunta 1).
- **D181 — La asignación a un Evento de bautismo es una Inscripción a Evento confirmada creada por
  el Admin, referenciada desde la Solicitud.** La fecha, hora y lugar se leen del Evento. *Por qué:*
  es lo que D147 llama "reusar lo que ya existe": el recordatorio y "Mis eventos" funcionan sin caso
  especial, y no hay una segunda copia de la fecha (research #1).
- **D182 — El Evento de bautismo no tiene inscripción propia, QR, cupo ni costo, y su página pública
  no muestra quiénes se bautizan.** *Por qué:* la lista la arma el Admin con los aceptados (D147), y
  los nombres son dato sensible (D5). El Evento sí aparece en la cartelera (Pregunta 4).
- **D183 — La Persona puede retirar su pedido mientras esté abierto (también con fecha) y decir "No
  puedo ese día".** Diálogos neutros (D151). *Por qué:* la alternativa es faltar sin avisar o
  escribir por WhatsApp; deja al Admin la lista de "Esperando fecha" al día.
- **D184 — Edad para pedir el bautismo sola/o: 12 años**, con constante propia; menores de 12, el
  Admin en su nombre. *Por qué:* misma frontera que Vida Nueva (004, FR-044), fácil de explicar
  (Pregunta 2).
- **D185 — El motivo de rechazo lo ve solo el equipo.** La Persona ve un texto fijo amable y puede
  volver a pedir. *Por qué:* un rechazo de bautismo se conversa (Pregunta 5).
- **D178 — La bandeja unificada de Solicitudes lee una vista SQL con la forma base de cada tipo.**
  *Por qué:* paginar, buscar y ordenar varias tablas en la API sin el motor genérico que D31 descartó
  (research #4).
- **D187 — Solo el Admin pide el bautismo en nombre de otra Persona, sin habilitarla antes.** *Por
  qué:* D143 deja al Discipulador solo Vida Nueva en nombre de otros; y el Admin que crea el pedido
  ya decide la excepción de D147.

## Cambios a docs al mergear

- `docs/04-dominio-entidades.md`: Solicitud de Bautismo — estados (`pendiente`, `aprobada`,
  `rechazada`, `retirada`, `realizada`), sin `fecha_deseada`, con texto opcional, motivo interno,
  inscripción al Evento de bautismo; Evento — el discriminador de bautismo (lo escribe la 011);
  Persona — habilitación de bautismo.
- `docs/diagrama-er.mermaid`: `SOLICITUD_BAUTISMO` (campos de `data-model.md`), relación con
  `INSCRIPCION_EVENTO`, campos nuevos de `PERSONA`.
- `docs/07-flujos-casos-de-uso.md`: reescribir el Flujo 6 con D147 y esta spec (requisito para
  pedir, aceptar sin fecha, asignar a un Evento de bautismo, "No puedo ese día", confirmar).
- `docs/03-roles-permisos.md`: Admin — habilitar el bautismo a una Persona y pedirlo en su nombre.
- `docs/14-navegacion.md`: la bandeja de Solicitudes muestra el filtro por tipo; el detalle de un
  Evento de bautismo tiene la sección "Personas a bautizar".
- `docs/15-guia-ux-ui.md`: glosario — "aceptada" para `aprobada` en Bautismo; "No puedo ese día".
- `docs/05-decisiones.md`: D179–D187 (la DN-8 de esta spec quedó unificada en D178, con la precisión D186) con su número.

## Preguntas para Echu

Las cinco están al final de `spec.md` ("## Preguntas para Echu"), cada una con recomendación: (1)
confirmar quiénes se bautizaron; (2) edad mínima; (3) sacar la fecha deseada; (4) Evento de
bautismo en la cartelera pública; (5) motivo de rechazo visible o no.

## Complexity Tracking

*Sin violaciones de la Constitución que requieran justificación — tabla omitida.*
