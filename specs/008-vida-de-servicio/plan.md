# Implementation Plan: Vida de Servicio

**Branch**: `008-vida-de-servicio` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-vida-de-servicio/spec.md`

## Summary

Segunda etapa de Mi camino. La Persona que completó Vida Nueva (o tiene Completitud Manual) pide su
inscripción a una edición; el Admin la aprueba desde la bandeja de Solicitudes (que pasa a tener dos
tipos). El Admin abre ediciones (Grupos del Curso Vida de Servicio) con su Cronograma y sus Líderes
de curso. El Líder, **desde la web app** (D142), carga el material semanal —que se ve el día de su
fecha si está cargado (D27), calculado al leer—, toma asistencia en la puerta, propone bajas y la
finalización. El Admin confirma; al finalizar, las Inscripciones `activa` pasan a `completada` y esas
Personas reciben el rol de estado Apto para Ministerio (D40). Cada transición emite un evento tipado
para la spec 012.

Técnicamente: reusa Grupo, Inscripción, Liderazgo, Encuentro y Asistencia de la 004 (research #1);
suma `ItemCronograma`, `Contenido` (con archivos privados y enlaces) y `SolicitudVidaServicio`;
estrena archivos privados en `StorageService` (research #5).

## Technical Context

**Language/Version**: TypeScript en Node.js 22+ (el stack del monorepo, sin lenguaje nuevo).

**Primary Dependencies**: NestJS + Prisma 7 (`apps/api`); Next.js 16 App Router + NextAuth.js
(`apps/web`, `apps/backoffice`); `packages/shared-types` (tipos, permisos, códigos de error,
`hoyEnArgentina`, reglas puras nuevas); `packages/ui` (`TablaDatos`, `ControlesTabla`, `Paginacion`,
`Button`, `useEnvio`, `useValidacionCampos`, `ResumenErrores`, `EstadoVacio`). Para subir archivos,
el `FileInterceptor` de `@nestjs/platform-express` (ya está en la API por las portadas, D110); la
detección de tipo por contenido usa `sharp` para las imágenes (ya es dependencia, D110) y la firma
`%PDF-` de los primeros bytes para los PDF. **Ninguna dependencia nueva.**

**Storage**: PostgreSQL vía Prisma — 4 modelos nuevos (`ItemCronograma`, `Contenido`,
`ArchivoContenido`, `EnlaceContenido`), 1 de solicitud (`SolicitudVidaServicio`), extensiones a
`Curso`, `Grupo`, `Inscripcion`, `Encuentro` (`data-model.md`). Archivos en `StorageService` con
espacio privado nuevo (`STORAGE_PRIVADO_DIR`).

**Testing**: Jest unit (reglas puras: prerrequisito, cronograma, liberación, visibilidad, faltas,
`puedeQuitarRol`, eventos) e integración contra la base de test (aprobar, asistencia idempotente,
finalización en cascada con Apto, liberación avisada una vez, permisos por registro de archivos);
Playwright con `axe` en claro y oscuro en `apps/web` (Persona y Líder, este en viewport de celular) y
`apps/backoffice` (Admin) — Principios VI y VII.

**Target Platform**: Docker Compose local (D130).

**Project Type**: la web application existente; sin proyectos nuevos.

**Performance Goals**: sin meta propia. Ediciones de decenas de personas; faltas con una consulta
agrupada por Grupo; listados del backoffice paginados (H-42). Material visible el día de su fecha sin
depender de un proceso (research #4).

**Constraints**:
- La liberación se calcula al leer; ningún flag la decide (D27, FR-021).
- Los archivos de Contenido nunca se sirven desde una carpeta pública (Principio V, FR-024).
- Toda autorización del Líder es por registro (Liderazgo vigente), no solo por rol (Principio V,
  D134).
- Apto para Ministerio se escribe solo por `RolesDeEstadoService` (H-139, FR-036).
- Eventos solo con ids, emitidos después del commit (Principio X).
- Ningún cambio a la 004 rompe su comportamiento: los cambios de modelo son aditivos o relajan una
  restricción que el servicio de la 004 sigue aplicando.

**Scale/Scope**: 5 modelos nuevos, 4 extendidos, 2 permisos nuevos, ~30 endpoints, 5 pantallas en
`apps/web` (card + detalle + contenido de la Persona; Mis grupos, su detalle, cargar material,
asistencia del Líder), 3 en `apps/backoffice` nuevas (listado/alta de ediciones dentro de Grupos,
detalle de edición, detalle de Solicitud de VS) y 3 modificadas (bandeja de Solicitudes, tarjeta de
pendientes, panel de roles de Personas).

## Constitution Check

| Principio | Cumple | Cómo |
|---|---|---|
| I. Spec-first | ✅ | Spec 008 derivada de `docs/02/03/04/07` y decisiones; las decisiones nuevas van abajo para numerarse al mergear. |
| II. Terminología | ✅ | Grupo, Inscripción, Cronograma (ItemCronograma), Contenido, Encuentro, Asistencia, Líder de curso, Completitud Manual, como en `docs/04`. "Edición" es solo texto de interfaz para un Grupo de Vida de Servicio (glosario de `docs/15`). |
| III. Soft delete | ✅ | Items, archivos y enlaces con `eliminadoEn`; Liderazgos con `hasta`; Inscripciones y Solicitudes cambian de estado, nunca se borran. |
| IV. Simplicidad | ✅ | Sin tabla Cronograma 1 a 1 (research #2); sin scheduler propio (lo pone la 012, research #4); `leer` en Storage recién ahora que hay un consumidor real. |
| V. Seguridad | ✅ | Permiso por registro en todo lo del Líder y en cada descarga; archivos privados; eventos sin datos sensibles. |
| VI. Testing | ✅ | Unit para cada regla con ramas; integración para la finalización en cascada y la aprobación; e2e del flujo crítico (pedir → aprobar → ver material) con axe. |
| VII. Accesibilidad | ✅ | Estados con texto + ícono (faltas, semanas, solicitudes); texto alternativo obligatorio en imágenes; enlaces con texto propio; axe en los dos temas. |
| VIII. Experiencia | ✅ | Checklist de `docs/15` por pantalla en `tasks.md`; "¿y ahora qué?" en cada estado de la card; D150 y D151. |
| IX. Idiomas | ✅ | Todo texto por `next-intl`; la API devuelve códigos. |
| X. Errores | ✅ | Códigos nuevos en `error-code.ts` (lista en tasks T005); Problem Details. |
| XI. Una sola fuente | ✅ | Reglas puras en `shared-types` usadas por API y web; el componente de semana/estado en `packages/ui` si lo usan las dos apps; reusa modelos de la 004 en vez de duplicarlos. |

Re-evaluado después del diseño: sin violaciones. **Complexity Tracking** vacío.

## Project Structure

### Documentation (this feature)

```text
specs/008-vida-de-servicio/
├── spec.md
├── plan.md              # este archivo
├── research.md          # 17 decisiones de diseño
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── persona-api.md
│   ├── lider-api.md
│   ├── admin-api.md
│   └── eventos.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── vida-de-servicio.ts              # tipos de contratos, constantes, reglas puras (cumplePrerrequisito,
│                                    #   cronogramaValido, liberada, semanasVisibles, materialCargado, FALTAS_PARA_ALERTA)
├── eventos-vida-de-servicio.ts
├── permisos.ts                      # 2 permisos + rama lider_curso de puedeQuitarRol
├── error-code.ts                    # códigos nuevos
└── index.ts

packages/ui/src/components/
└── estado-semana.tsx                # badge texto+ícono de una semana (Persona, Líder, Admin: tres pantallas, dos apps)

apps/api/
├── prisma/schema.prisma + migración `vida_de_servicio` (SQL a mano: únicos parciales, CHECK)
├── prisma/seed.ts, seed-demo.ts, scripts/sembrar-e2e-admin.ts, scripts/limpiar-e2e.ts
└── src/
    ├── storage/                     # leer + visibilidad privada (research #5)
    ├── vida-de-servicio/            # módulo nuevo
    │   ├── prerrequisito.ts         # estadoPrerrequisito (research #8)
    │   ├── efectos.ts               # alCompletarCategoria → apto_ministerio (research #9)
    │   ├── eventos.ts
    │   ├── solicitudes.service.ts / .controller.ts        # Persona + Admin
    │   ├── ediciones.service.ts / grupos-vs.controller.ts # Admin: alta, cronograma, Líderes, bajas, finalización
    │   ├── contenido.service.ts / archivos.controller.ts  # carga, liberación, descarga
    │   ├── asistencia.service.ts
    │   ├── mis-grupos.service.ts / .controller.ts         # Líder
    │   └── mi-vida-de-servicio.service.ts                 # Persona
    ├── solicitudes/                 # bandeja unificada (se mueve GET /solicitudes, research #7)
    ├── pendientes/                  # pendientes-admin generalizado
    ├── discipulado/discipulados-activos.ts   # filtro categoria = vida_nueva (FR-040)
    ├── discipulado/finalizacion.service.ts, baja.service.ts  # ajustes mínimos por bajaPropuestaTipo (sin cambio de conducta)
    └── persona/                     # roles-de-estado (apto_ministerio), roles.service (lider_curso)

apps/web/src/app/(app)/
├── mi-camino/                       # habilita la card de VS (forma: spec 006)
│   └── vida-de-servicio/
│       ├── page.tsx                 # semanas + asistencia
│       └── semanas/[numero]/page.tsx
└── mis-grupos/                      # Líder (D142)
    ├── page.tsx
    └── [grupoId]/
        ├── page.tsx                 # cronograma, inscriptos, finalización
        ├── semanas/[numero]/page.tsx
        └── asistencia/page.tsx

apps/backoffice/src/app/
├── grupos/                          # filtro por curso; alta de edición (modal)
│   └── vida-de-servicio/[id]/       # detalle de edición
├── solicitudes/                     # filtro por tipo
│   └── vida-de-servicio/[id]/       # aprobar / rechazar
├── personas/                        # panel de roles: bloqueo de lider_curso; "Pedir Vida de Servicio en su nombre"
├── tarjeta-pendientes.tsx
└── mis-grupos/                      # SE BORRA (placeholder; pasa a la web app, D142)
```

**Structure Decision**: la web application existente. Un módulo de API nuevo (`vida-de-servicio/`)
más dos módulos chicos que dejan de ser "de discipulado" porque ahora los usan dos tipos
(`solicitudes/`, `pendientes/`).

## Dependencias con otras specs

| Spec | Qué construye que esta usa | Si todavía no mergeó cuando se implementa |
|---|---|---|
| **004** (mergeada) | Grupo, Inscripción, Liderazgo, Encuentro, Asistencia, bandeja, Grupos del backoffice, pendientes del Admin, `hoyEnArgentina`, `EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO` | — |
| **005** (mergeada) | `CATALOGO_PERMISOS`, `puedeQuitarRol`, `RolesDeEstadoService`, panel de roles | — |
| **006** | (a) **Completitud Manual** (modelo, alta del Admin) y la declaración **"Ya lo hice"** (D144) con su estado "en revisión"; (b) la **card de Vida de Servicio** de Mi camino (deshabilitada) y la estructura de cards; (c) el lugar de los **roles de cargo en la web app** (D142: cómo entra el Discipulador/Líder a sus pantallas, cómo la web app chequea `CATALOGO_PERMISOS`); (d) los ajustes de `CATALOGO_PERMISOS` por D143. | (a) `completitudesDe()` y `declaracionEnRevision()` quedan como único punto, devolviendo `[]`/`false` hasta que la 006 los complete (research #8); la 006 llama `alCompletarCategoria()` al confirmar (FR-042) — lo cablea la que mergee segunda. (b) la 008 renderiza su contenido dentro de la card de la 006; si no está, una sección provisoria en `mi-camino/page.tsx` que la 006 reemplaza. (c) acceso a Mis grupos desde Inicio para `lider_curso` (research #14). |
| **007** (en curso) | Ingreso con código por email: no cambia nada acá; una Persona que entra así ve su estado como cualquiera. | — |
| **012** | Envío de notificaciones (Avisos + email, D149) y el **proceso programado** que llama `marcarLiberacionesDeHoy()` (research #4). | Los eventos se loguean; el material se ve igual; nadie recibe avisos. |
| **Ministerios** (spec que corresponda) | Postulación con Apto para Ministerio. | Apto queda otorgado y visible en Personas; la card dice "ya podés postularte" sin enlace hasta que exista. |

## Paralelización (para `/speckit-tasks`)

- **Lote 0** (secuencial, uno solo): shared-types (tipos, reglas puras, permisos, códigos, eventos),
  `packages/ui` (`estado-semana`), Prisma + migración, seeds y helpers de e2e, `StorageService`
  privado, módulo `vida-de-servicio` vacío con `prerrequisito.ts`, `efectos.ts`, `eventos.ts`,
  `discipulados-activos` filtrado, módulos `solicitudes/` y `pendientes/` movidos sin cambio de
  conducta, navegación (web: acceso a Mis grupos; backoffice: borrar `mis-grupos`, rutas nuevas), y
  los namespaces vacíos de `es.json`.
- **Lote A — Persona y Solicitudes**: card + detalle en Mi camino, solicitudes (API), bandeja con
  tipo, detalle de Solicitud de VS, "en nombre de" en Personas.
- **Lote B — Ediciones (Admin)**: alta de edición, cronograma, Líderes, inscripción abierta, detalle de
  edición, bajas y finalización del lado Admin, pendientes, bloqueo de `lider_curso`.
- **Lote C — Líder**: Mis grupos, cargar material (archivos), asistencia, proponer baja y finalización.
- Cruces: el detalle de edición (B) y el detalle del Líder (C) consumen el mismo cálculo de semanas y
  faltas, que vive en lote 0 (`shared-types` + una consulta compartida en el módulo). La finalización
  (B) necesita Inscripciones (A) solo para su test e2e: el test las crea por servicio.

## Decisiones nuevas (numeradas en `docs/05-decisiones.md`: D158–D168)

1. **D158** — **Bajas de Vida de Servicio con doble check y tipo elegido** — el Líder propone `dada_de_baja` o
   `abandono`, el Admin confirma (puede corregir el tipo) o rechaza, y el Admin también puede aplicarla
   directo. *Porqué*: `docs/03` ("propone") y el Flujo 4 ("puede ejecutar") se contradecían; una baja
   le cierra a la Persona el paso a Ministerio y conviene que la mire alguien más, como en Vida Nueva;
   la vía directa del Admin cubre el aviso por WhatsApp (D69, mismo criterio). *(Pregunta 1 para
   Echu.)*
2. **D159** — **Apto para Ministerio es un rol de estado** (`apto_ministerio` en `Persona.rol`, escrito por
   `RolesDeEstadoService`), no una columna. "En curso: Vida de Servicio" no se guarda: se deriva de la
   Inscripción `activa`. *Porqué*: D131 ya lo clasifica como rol de estado; una columna aparte sería
   una segunda fuente de verdad (Principio XI), y derivar "en curso" sigue a D137.
3. **D160** — **Completitud Manual de Vida de Servicio otorga Apto para Ministerio.** *Porqué*: quien hizo Vida de
   Servicio antes de la app no tiene otro camino; D40 solo contemplaba la Inscripción. *(Pregunta 2.)*
4. **D161** — **El Cronograma no tiene tabla propia**: son los `ItemCronograma` del Grupo; y **un Contenido por
   semana con varias piezas** (texto, archivos, enlaces) en vez de un Contenido tipado por pieza. Precisa
   D17 y el diagrama ER. *Porqué*: research #2 y #3.
5. **D162** — **La liberación se calcula al leer; el aviso sale una vez** (`liberacionAvisadaEn`), y el proceso
   programado que avisa las liberaciones por fecha es de la 012. *Porqué*: que la gente vea su material
   no puede depender de que corra un proceso (research #4).
6. **D163** — **Pedido "para la próxima edición"**: si no hay ninguna edición con inscripción abierta, la Persona
   puede pedir sin elegir; el Admin la asigna al aprobar. Y la inscripción abierta/cerrada solo limita
   lo que elige la Persona, no lo que aprueba el Admin. *(Pregunta 4.)*
7. **D164** — **Alerta de faltas desde 2** (`FALTAS_PARA_ALERTA = 2`), resolviendo la diferencia entre D42 ("más
   de 2") y `docs/02`/Flujo 4 ("2 o más"). *(Pregunta 5.)*
8. **D165** — **El Líder de curso ve el teléfono de sus inscriptos activos** (no la dirección). *(Pregunta 3.)*
9. **D166** — **Al darse de baja, la Persona conserva el material liberado hasta ese día**; "contenido restante"
   (Flujo 4, paso 13) es lo que se libera después.
10. **D167** — **Los discipulados activos (D137) son solo de Grupos de Vida Nueva**, y quitar `lider_curso` se
    bloquea si lidera una edición en curso. *Porqué*: sin el filtro, liderar Vida de Servicio contaría
    como discipulado.
11. **D168** — **Primer archivo privado del sistema**: `StorageService` suma lectura y visibilidad privada; los
    archivos se validan por contenido y se sirven por la API con permiso por pedido.

## Cambios a docs al mergear

- `docs/04-dominio-entidades.md`: (a) Cronograma = items del Grupo, sin entidad aparte; Contenido con
  varias piezas (D161); (b) "Apto para Ministerio" se guarda como rol de estado (D159);
  (c) Inscripción puede nacer de una Solicitud de Discipulado o de una Solicitud de inscripción a Vida
  de Servicio; (d) la Solicitud de inscripción a Vida de Servicio se suma al "Patrón común de
  Solicitudes".
- `docs/diagrama-er.mermaid`: quitar `CRONOGRAMA`, `ITEM_CRONOGRAMA.grupo_id`, `CONTENIDO` con
  `ARCHIVO_CONTENIDO` y `ENLACE_CONTENIDO`, `SOLICITUD_VIDA_SERVICIO`.
- `docs/07-flujos-casos-de-uso.md`: Flujo 4 pasos 10–12 (bajas con doble check, D158;
  umbral, D164) y la opción "para la próxima edición" (D163); **Flujo 5 pasos 1–3**
  (activación manual del flag a partir de un pedido, D28) quedan superados por D40 — marcar como
  enmendados.
- `docs/03-roles-permisos.md`: Líder de curso usa la web app (D142), ve el teléfono de sus inscriptos
  (D165); Apto para Ministerio también por Completitud Manual de Vida de Servicio (D160).
- `docs/05-decisiones.md`: numerar las 11 decisiones de arriba (mirando el último número, D89/D103) y
  anotar que D28 queda superada por D40.
- `docs/14-navegacion.md`: el ítem "Líder de curso → Mis grupos" sale del backoffice y pasa a la web
  app (con el patrón que fije la 006).
- `docs/16-sistemas-transversales.md`: los eventos de `contracts/eventos.md` sin disparador en
  `docs/04` (lo decide la 012).

## Complexity Tracking

Sin violaciones de la Constitución que justificar.
