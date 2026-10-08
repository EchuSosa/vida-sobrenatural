# Implementation Plan: Ministerios y Células (postulación)

**Branch**: `009-ministerios-celulas` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-ministerios-celulas/spec.md`

## Summary

La última etapa del camino de integración: una Persona apta para Ministerio (flag de la spec 008) ve
los Ministerios y sus Células dentro de la app, se postula eligiendo Célula, sigue su estado en una card
de Mi camino y puede retirarse; el Admin revisa las Postulaciones en la bandeja unificada de Solicitudes
(que pasa a mezclar tipos, con filtro por tipo) con la advertencia de cambio de Ministerio exigida por la
API, da de baja miembros, y gestiona Ministerios y Células en Catálogos con el patrón de Sedes
(inactivar con confirmación reforzada D38, eliminar a papelera D119). La membresía **es** la Postulación
`aprobada` (no hay tabla de miembros, research #2); dos índices únicos parciales garantizan una sola
pendiente y una sola aprobada por Persona. Las transiciones emiten eventos tipados para la spec 012, y
la página pública `/ministerios` pasa a leer el catálogo.

## Technical Context

**Language/Version**: TypeScript 5 (Node 22) en las tres apps.

**Primary Dependencies**: NestJS (`apps/api`), Next.js App Router + next-intl + NextAuth (`apps/web`,
`apps/backoffice`), Prisma 7, shadcn/Base UI vía `packages/ui`, `packages/shared-types` (build propio, D113).

**Storage**: PostgreSQL vía Prisma. Tres tablas nuevas (`ministerios`, `celulas`, `postulaciones`), dos
enums, índices únicos parciales y CHECK en SQL a mano.

**Testing**: Jest unit + integración (`test:e2e`, base de test), Playwright con axe claro/oscuro contra
la base `vidasobrenatural_e2e` (D124), proyecto `@celular` a 360×740.

**Target Platform**: web responsive; app de la Persona pensada para celular (D150).

**Project Type**: monorepo web (API + dos frontends + paquetes compartidos).

**Performance Goals**: Core Web Vitals en celular (LCP < 2.5 s, INP < 200 ms, CLS < 0.1); la bandeja
mezclada pagina y ordena en SQL.

**Constraints**: Constitución v1.2.0 (Principios I–XI); WCAG 2.2 AA; nada se borra físicamente.

**Scale/Scope**: decenas de Ministerios/Células, cientos de Postulaciones. 6 pantallas nuevas y 4
modificadas (lista en "Pantallas").

## Constitution Check

*GATE: antes de Phase 0 y de nuevo después de Phase 1.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Spec-First | Derivada de docs/02, 03, 04, 07 y decisiones; lo no decidido va en Assumptions y Preguntas para Echu. | ✅ |
| II. Terminología | Ministerio, Célula, Postulación, Miembro de Ministerio, Apto para Ministerio — tal cual docs/04. | ✅ |
| III. Soft delete | `activo` + `eliminadoEn/Por` en Ministerio y Célula; Postulación nunca se borra (estados terminales + fila nueva). | ✅ |
| IV. Simplicidad | Sin tabla de miembros, sin contenido de Ministerio, sin paginar el catálogo chico. La extracción de `bandeja/` se justifica con el segundo tipo real. | ✅ |
| V. Seguridad | Permisos del catálogo; autorización por registro en `/me` (solo la propia); motivos internos fuera de la vista del Pastor y de la Persona; eventos sin datos sensibles (el Ministerio revela afiliación, D5). | ✅ |
| VI. Testing | Unit: reglas de creación, `estadoMiMinisterio`, eventos, normalización. Integración: concurrencia (índices), cambio, bandeja mezclada, inactivar/eliminar. e2e: flujo Persona → Admin. | ✅ |
| VII. Accesibilidad | Estados con texto + ícono; axe claro/oscuro en los e2e; sin scroll horizontal a 320 px. | ✅ |
| VIII. Experiencia consistente | Cuatro estados por pantalla (`loading.tsx`/`error.tsx`), `useEnvio` + `Button`, validación por campo, una acción principal, checklist de docs/15 por pantalla en tasks (D114). | ✅ |
| IX. Idiomas | Todo texto por next-intl; estados como claves. | ✅ |
| X. Errores | Códigos nuevos propios en `error-code.ts`; eventos sin datos personales en logs. | ✅ |
| XI. Una sola fuente | `esAptaParaMinisterio`, límites y tipos en shared-types; `miembrosActivosDe` única; `AvisoEstado` extraído a `packages/ui`; bandeja con fuentes por tipo. | ✅ |

Re-check post-diseño: sin violaciones. **Complexity Tracking**: vacío.

## Project Structure

### Documentation (this feature)

```text
specs/009-ministerios-celulas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ministerios-api.md
│   ├── postulaciones-api.md
│   └── eventos.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── ministerios.ts            # nuevo: estados, límites, esAptaParaMinisterio, tipos de API, EstadoMiMinisterio
├── eventos-ministerio.ts     # nuevo
├── solicitudes.ts            # nuevo: TipoSolicitud ('discipulado' | 'postulacion'), re-export desde discipulado.ts
├── permisos.ts               # + ministerios.*, postulaciones.crear_en_nombre, RolDeEstado + miembro_ministerio
└── error-code.ts             # + códigos de contracts/

packages/ui/src/components/
└── aviso-estado.tsx          # extraído de mi-camino-cliente.tsx (research #10)

apps/api/
├── prisma/schema.prisma, migrations/…_ministerios/, seed-demo.ts
├── scripts/sembrar-e2e-admin.ts, limpiar-e2e.ts
├── src/ministerio/           # nuevo: ministerio.controller/service, celula.*, postulacion.*, miembros.ts, eventos.ts, reglas-postulacion.ts
├── src/bandeja/              # nuevo: GET /solicitudes con fuentes por tipo (sale de solicitud-discipulado)
└── test/unit/…, test/integration/ministerios-*.integration-spec.ts, postulaciones-*.integration-spec.ts

apps/web/src/
├── app/(app)/mi-camino/page.tsx + card-ministerio.tsx
├── app/(app)/mi-camino/ministerios/{page,loading,error}.tsx
├── app/(app)/mi-camino/ministerios/[id]/{page,loading,error,not-found}.tsx + formulario-postulacion.tsx
├── app/(publica)/ministerios/page.tsx  # lee el catálogo
├── messages/es.json
└── e2e/ministerios-postulacion.spec.ts

apps/backoffice/src/
├── app/ministerios/{page,loading,error}.tsx + ministerios-cliente.tsx
├── app/ministerios/[id]/{page,loading,error,not-found}.tsx + detalle (Células, miembros, papelera de Células)
├── app/ministerios/papelera/…
├── app/solicitudes/ (filtro por tipo, columna Detalle) + app/solicitudes/postulacion/[id]/…
├── app/catalogos/page.tsx, app/tarjeta-pendientes.tsx
├── config/nav.ts, messages/es.json
└── e2e/ministerios-catalogo.spec.ts, postulaciones.spec.ts
```

**Structure Decision**: la estructura existente del monorepo; un módulo de API por dominio
(`ministerio/`) más el módulo transversal `bandeja/`.

### Pantallas (cada una con su tarea de checklist de docs/15 en tasks.md, D114)

| App | Ruta | Nueva/modificada |
|---|---|---|
| web | `/mi-camino` (card de Ministerio) | modificada |
| web | `/mi-camino/ministerios` | nueva |
| web | `/mi-camino/ministerios/[id]` (detalle + formulario) | nueva |
| web | `/ministerios` (pública) | modificada |
| backoffice | `/ministerios` | nueva |
| backoffice | `/ministerios/[id]` (Células, miembros, papelera de Células) | nueva |
| backoffice | `/ministerios/papelera` | nueva |
| backoffice | `/solicitudes` (filtro tipo, columna Detalle) | modificada |
| backoffice | `/solicitudes/postulacion/[id]` | nueva |
| backoffice | `/` (tarjeta de pendientes) y `/catalogos` | modificadas |

## Dependencias con otras specs

| Spec | Qué necesita esta | Si no está al implementar |
|---|---|---|
| **008** (Vida de Servicio) | Escribe `apto_ministerio` (rol de estado, D40) y lo agrega a `RolDeEstado`. | El lote 0 agrega el valor al tipo (conflicto trivial al mergear); seed y fixtures lo siembran directo. Nada de la lógica de la 008 se especifica acá. |
| **006** | Completitud Manual (y "Ya lo hice", D144) de un Curso de Vida de Servicio → `apto_ministerio` (Pregunta 4). Traslado del Discipulador a la web app (no afecta: esta spec no da nada al Discipulador). | Sin efecto en esta spec: solo lee el flag. |
| **012** (Notificaciones) | Conecta `emitirEventoMinisterio` al envío; usa `miembrosActivosDe` para el alcance `ministerio` (D48). | Los eventos solo se loguean; la Persona se entera por Mi camino. |
| **004** (mergeada) | Bandeja `/solicitudes`, `SolicitudResumen`, `RolesDeEstadoService`, patrón de eventos, card de Vida Nueva. | — |
| **005** (mergeada) | Catálogo de permisos, `RolesDeEstadoService` (único lugar de roles de estado). | — |
| Vista unificada de Persona (D61, spec que la construya) | Consume `GET /personas/:id/ministerio`. | El endpoint queda; la sección la agrega esa spec. |
| Otras specs que sumen tipos a la bandeja (008, Bautismo, Eventos) | Comparten `apps/api/src/bandeja/` y el filtro por tipo. | La primera en mergear crea `bandeja/` y el filtro; las demás rebasan y solo agregan su fuente y su valor de `TipoSolicitud`. |
| D150 (tamaños en celular) | `Button` de 44 px y letra de 16 px en `apps/web`. | Se usa el `Button` vigente; hereda el cambio cuando llegue. |

## Decisiones nuevas (numeradas en `docs/05-decisiones.md`: D169–D178)

1. **D169** — **El flag "Apto para Ministerio" no se pide ni se activa a mano: lo escribe el sistema (D40); D28 y
   los pasos 1 a 3 del Flujo 5 quedan superados.** *Por qué*: D40 es posterior y ya está en docs/02 y
   docs/03; mantener los dos caminos duplica la regla y deja a la Persona sin saber cuál aplica.
2. **D170** — **La membresía en un Ministerio es la Postulación `aprobada`; no hay entidad de miembros.** El rol
   `miembro_ministerio` se otorga al aprobar la primera y no se quita (roles acumulativos, FR-019 de la
   005). *Por qué*: una sola fuente del dato (D19 ya lo modela así; mismo razonamiento que D137).
3. **D171** — **La Postulación suma el estado `retirada`**: la Persona puede retirar una pendiente, con
   confirmación neutra (D151). *Por qué*: consistencia con la Solicitud de Discipulado (004) y, con D60
   (una sola pendiente), sin retiro la Persona queda trabada hasta que el Admin la "rechace".
4. **D172** — **"Una sola vez por Ministerio" (docs/04) significa: nunca dos abiertas ni postularse adonde ya está.**
   Después de rechazo, retiro o baja se crea una Postulación nueva (D29). *Por qué*: concilia docs/04 con
   D29 sin perder historial.
5. **D173** — **La advertencia de cambio de Ministerio la exige la API** (`confirmarCambio`), no solo la interfaz.
   *Por qué*: cierra la carrera entre abrir el detalle y aprobar.
6. **D174** — **El Admin puede dar de baja a alguien de su Ministerio** (Postulación → `inactiva` con motivo
   `baja`); la Persona no tiene un "dejar de servir" propio (Pregunta 2). *Por qué*: los docs no traen
   cómo se deja un Ministerio, y sin esto la lista de miembros y el alcance de D48 solo crecen.
7. **D175** — **La Célula es una preferencia opcional** ("No tengo preferencia"), y el Admin no la cambia al aprobar
   (D30) (Pregunta 3).
8. **D176** — **Los motivos de rechazo y de baja son internos**: los ve el Admin, no la Persona ni el Pastor
   (Pregunta 5). *Por qué*: docs/15 pide un mensaje amable y a quién consultar; una nota interna escrita
   en apuro, mostrada tal cual, es lo contrario.
9. **D177** — **Inactivar un Ministerio o una Célula no toca las membresías**; impide postularse y aprobar
   pendientes a ellos hasta reactivar. Eliminar exige que no tenga ninguna Postulación (D119). *Por qué*:
   inactivar es reversible (D117) y no puede borrar la historia de nadie.
10. **D178** — **La bandeja de Solicitudes se arma con "fuentes" por tipo y pagina en SQL (`UNION ALL`)**; el filtro
    por tipo se muestra desde que hay dos tipos. *Por qué*: precisa la clarificación de la 004 ("genérica
    en el listado, específica en la resolución") ahora que llega el segundo tipo, sin romper H-101.

## Cambios a docs al mergear

- `docs/05-decisiones.md`: las 10 decisiones de arriba, con número (mirar el último usado, D89/D103).
- `docs/07-flujos-casos-de-uso.md`, Flujo 5: reemplazar los pasos 1 a 3 por "el flag lo activa el
  sistema al completar Vida de Servicio (D40) o por Completitud Manual"; sumar retirar (D171), la
  baja por el Admin (D174) y el filtro por tipo de la bandeja.
- `docs/04-dominio-entidades.md`, Postulación: estados `pendiente / aprobada / rechazada / inactiva /
  retirada`; precisar la regla "una vez por Ministerio" (D172) y que la membresía es la aprobada
  (D170). Ministerio/Célula: sumar `eliminado_en`/`eliminado_por` (ya lo dice D119).
- `docs/diagrama-er.mermaid`: `apto_ministerio` deja de decir "activado manualmente por Admin";
  POSTULACION suma `motivacion`, `disponibilidad`, `motivo_rechazo`, `motivo_inactivacion`,
  `reemplazada_por`, `motivo_baja`; MINISTERIO y CELULA suman `eliminado_en`/`eliminado_por`.
- `docs/03-roles-permisos.md`: Apto para Ministerio "activado automáticamente" ya lo dice; agregar que
  Miembro de Ministerio no se pierde al cambiar o salir (acumulativo) y que el Ministerio actual se lee de
  la Postulación aprobada.
- `docs/15-guia-ux-ui.md`, glosario: "Postulación" / "Postularme", "Retirar postulación", "Elegí un
  Ministerio", "No tengo preferencia".
- `docs/06-preguntas-abiertas.md`: sacar "descripción de cada Ministerio" de contenido pendiente si el
  seed-demo trae textos provisorios marcados (D98) — el real lo carga el Admin.

## Lotes (detalle en tasks.md)

- **Lote 0** (secuencial): shared-types, permisos, códigos, Prisma + migración, `AvisoEstado`, mensajes,
  nav, fixtures e2e, seed-demo.
- **Lote A** (API Persona + card + app), **Lote B** (API Admin + bandeja + detalle), **Lote C**
  (catálogo backoffice + pública) — en paralelo después del lote 0.
- **Lote D** (cierre): e2e de punta a punta, axe, checklist de docs/15 por pantalla, las tres suites.
