# Implementation Plan: Backoffice del Admin — bandeja unificada, perfil de Persona, catálogos y métricas

**Branch**: `013-backoffice-admin` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-backoffice-admin/spec.md`

## Summary

Completa el backoffice del Admin según `docs/02` y `docs/14` §3, con D142 (el backoffice es del Admin; el Pastor
entra a ver). Construye el **lugar común** donde se juntan las gestiones que construye cada spec de tipo:

1. **Bandeja unificada** — generaliza `GET /solicitudes` (004) para leer de una vista SQL `solicitudes_bandeja`
   (`UNION ALL` de una rama por tipo) que pagina, ordena y busca en la base; cada página se hidrata con la
   `FuenteSolicitudes` de cada tipo. Sumar un tipo es un contrato de cinco pasos (`contracts/bandeja-api.md`) que no
   toca la pantalla.
2. **Perfil de Persona** `/personas/[id]` — datos, foto o iniciales, roles por clase, historial por secciones
   independientes (Solicitudes desde la bandeja, Grupos cursados y a cargo, y las secciones que sumen 006/009/011),
   Relaciones Familiares en las dos direcciones.
3. **Inicio** — cuatro bloques independientes: pendientes por tipo, métricas al momento, cumpleaños de la semana y
   comentarios sin revisar. Más el listado de **cumpleaños del mes**.
4. **"Contanos qué te parece"** completo — modelo `ComentarioApp`, envío público con límite por origen (mecanismo de
   la 007), email a la desarrolladora (`EmailService` de la 007), formulario compartido en `packages/ui` para web y
   backoffice, y listado/revisión en el backoffice.
5. **Catálogos** — índice con Sedes y Cursos (y Ministerios/Células cuando la 009 los traiga); CRUD de Curso con
   inactivar/eliminar/papelera (D117, D119) y la regla "Curso inactivo no admite Grupos nuevos".
6. **Edición de datos de una Persona** desde el perfil, reusando el formulario de alta de la 006.

## Technical Context

**Language/Version**: TypeScript (API con TS 6, apps Next con TS 5), Node LTS del repo

**Primary Dependencies**: NestJS 12, Prisma 7.10, Next.js 16.3 (App Router), next-intl 4, Tailwind + shadcn/ui
(`packages/ui`), lucide-react. **Sin dependencias nuevas** (ni librería de gráficos, ni throttler: research #7, #9).

**Storage**: PostgreSQL. Una tabla nueva (`comentarios_app`), tres columnas en `cursos`, una vista
(`solicitudes_bandeja`) y un índice de expresión en `personas`.

**Testing**: Jest unit (`apps/api/test/unit`), integración contra base (`apps/api/test/integration`,
`test:e2e`), Playwright en `apps/backoffice/e2e` (proyectos `chromium`, `celular` con `@celular`, `webkit`) y
`apps/web/e2e` para el formulario público; axe en claro y oscuro (Principio VII).

**Target Platform**: navegadores modernos; backoffice usable en celular (D2, D150).

**Project Type**: monorepo web (apps/api + apps/backoffice + apps/web + packages).

**Performance Goals**: bandeja, perfil e Inicio < 1 s p95 con `db:seed-demo` (SC-004); LCP < 2.5 s en celular.

**Constraints**: `select` explícito, paginación en API y en URL, índices en FK y filtros (H-42, `docs/15`); sin datos
personales en Sentry ni logs (Principio X); textos por next-intl (D84); colores de tokens (D118).

**Scale/Scope**: una iglesia: cientos de Personas, decenas de Solicitudes por mes, unos pocos Cursos. ~9 pantallas
nuevas o modificadas en el backoffice, 1 en la web.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Spec-first | Todo sale de `docs/02`, `docs/14` §3, Flujo 9, D61, D62, D87, D102; lo no decidido está como Assumption o Pregunta para Echu. | PASA |
| II. Terminología | Nombres de `docs/04` (Persona, Solicitud, Postulación, Comentario de la app, Curso). "Contanos qué te parece" es el nombre visible de D102. | PASA |
| III. Soft delete | Curso: `activo` + `eliminadoEn/Por` con papelera (D119). Comentario: no se borra. Persona: solo se lee/edita. | PASA |
| IV. Simplicidad | Vista SQL en vez de tabla común; sin librería de gráficos; sin throttler; sin tablas de agregados; los tipos que no existen no aparecen. Las ramas de 008–011 las agrega cada una. | PASA |
| V. Seguridad | Permiso por endpoint del catálogo (D132); escritura solo Admin; el perfil nunca expone notas de Encuentros (D134); comentarios sin IP en claro (huella HMAC); texto de comentario como texto plano. | PASA |
| VI. Testing | Unit: `esAbierta`, `relacionDesde`, `proximoCumpleanos`, `iniciales`, límites de comentarios, alta de Curso. Integración: vista vs. `ESTADOS_ABIERTOS`, bandeja paginada, perfil, métricas, cumpleaños, comentarios con límite, Curso inactivo. E2E: bandeja, perfil, Inicio, comentario público → backoffice, Cursos, Pastor solo lectura. | PASA |
| VII. Accesibilidad | Estados en texto + ícono; métricas con números en texto (barras `aria-hidden`); foto con alt; axe claro/oscuro; 320 px sin scroll. | PASA |
| VIII. Experiencia | Cuatro estados por pantalla **y por bloque** del Inicio; checklist de `docs/15` por pantalla (tareas propias); D150 en las pantallas de celular; D151 en las confirmaciones (inactivar Curso es reversible → neutra; la reforzada sigue D38). | PASA |
| IX. Idiomas | Claves de next-intl; estados y tipos como claves estables; la API devuelve códigos. Inicio y Catálogos migran sus textos fijos. | PASA |
| X. Errores | Códigos nuevos en `error-code.ts` (`CURSO_INACTIVO`, `CURSO_TIENE_GRUPOS`, `CURSO_NO_RECONOCIDO`, `CURSO_YA_EXISTE`, `CONTACTO_REQUERIDO`); `DEMASIADOS_PEDIDOS` de la 007. | PASA |
| XI. Una sola fuente | Regla de "abierta" en `shared-types` atada a la vista por un test; inversas de Relación Familiar movidas a `shared-types`; formulario de comentario en `packages/ui`; `hoyEnArgentina` reusada; formulario de Persona reusado de la 006. | PASA |

Restricciones técnicas: puertos fijos (D104); `noindex` en el backoffice (ya); la página `/contanos` de la web es
pública pero `noindex` (no aporta a SEO).

## Project Structure

### Documentation (this feature)

```text
specs/013-backoffice-admin/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── bandeja-api.md
│   ├── perfil-persona-api.md
│   ├── inicio-api.md
│   ├── comentarios-api.md
│   └── cursos-api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/shared-types/src/
├── bandeja.ts               # NUEVO: TipoSolicitud, TIPOS_SOLICITUD, ESTADOS_ABIERTOS, esAbierta, SolicitudBandeja
├── perfil-persona.ts        # NUEVO: PerfilPersona, relacionDesde, INVERSO_RELACION (movido de la API), iniciales
├── metricas.ts              # NUEVO
├── cumpleanos.ts            # NUEVO: proximoCumpleanos
├── comentario.ts            # NUEVO
├── curso.ts                 # NUEVO: CURSOS_RECONOCIDOS
├── discipulado.ts           # reexporta TipoSolicitud desde bandeja.ts
├── permisos.ts              # + 5 permisos
└── error-code.ts            # + 5 códigos

packages/ui/src/
├── avatar-persona.tsx       # NUEVO: foto con alt o iniciales (D87, D118)
├── barra-proporcion.tsx     # NUEVO: barra horizontal aria-hidden sobre token
└── formulario-comentario.tsx# NUEVO: "Contanos qué te parece" (web + backoffice)

apps/api/
├── prisma/schema.prisma     # ComentarioApp, Curso (+3), comentario del índice de expresión
├── prisma/vistas/solicitudes_bandeja.sql   # NUEVO: fuente versionada de la vista
├── prisma/migrations/…_013_*                # comentarios, cursos, vista, índice
├── prisma/seed-demo.ts      # + escenarios de la 013 (FR-065)
└── src/
    ├── bandeja/             # NUEVO: BandejaService (vista), FUENTES_SOLICITUDES, controller GET /solicitudes
    ├── solicitud-discipulado/  # registra su FuenteSolicitudes; GET /solicitudes se mueve a bandeja/
    ├── persona/             # perfil, grupos, cumpleaños, PATCH :id
    ├── inicio/              # NUEVO: métricas, cumpleaños-semana
    ├── comentario/          # NUEVO: POST público, listado, revisado
    ├── curso/               # NUEVO: CRUD, papelera, exigirActivo
    └── catalogo/            # NUEVO: GET /catalogos/resumen

apps/backoffice/src/
├── config/nav.ts            # Sedes y Cursos fuera del menú; rutas nuevas
├── config/solicitudes.ts    # NUEVO: RUTA_DETALLE_SOLICITUD, ICONO_TIPO_SOLICITUD
├── app/page.tsx             # Inicio con 4 bloques (+ bloques en app/inicio/*.tsx)
├── app/solicitudes/         # bandeja generalizada
├── app/personas/            # listado con avatar + enlace; [id]/ perfil con secciones; [id]/editar
├── app/cumpleanos/          # NUEVO
├── app/comentarios/         # NUEVO: listado y [id]
├── app/catalogos/           # índice real
├── app/cursos/              # NUEVO: listado, [id], papelera
├── components/menu-usuario  # + "Contanos qué te parece"
└── messages/es.json         # bandeja, perfil, inicio, cumpleanos, comentarios, cursos, catalogos

apps/web/src/
├── app/contanos/            # NUEVO: página pública del formulario (noindex)
├── componentes del pie y de Perfil  # enlaces a "Contanos qué te parece"
└── messages/es.json
```

**Structure Decision**: se sigue la estructura existente del monorepo; los módulos nuevos de la API siguen el patrón
de `sede/` y `libro/` (controller + service + dto). `GET /solicitudes` se muda de `solicitud-discipulado/` a
`bandeja/` sin cambiar su ruta.

## Dependencias con otras specs

| Spec | Qué necesita la 013 | Si no está mergeada al implementar |
|---|---|---|
| 004 (en `main`) | Solicitud de Discipulado, Grupos, `hoyEnArgentina`, `pedir-en-nombre-de`, aceptación de propuesta (donde se agrega `exigirActivo`). | — |
| 005 (en `main`) | `CATALOGO_PERMISOS`, panel de roles y su historial, regla D133. | — |
| 006 | Formulario de alta de adultos (Historia 7), Completitud Manual y "Ya lo hice" (sección del perfil), traslado del Discipulador a la web app (las pantallas `mis-*` del backoffice desaparecen del menú). | Lote 7 espera; la sección de Completitudes no se construye; el resto avanza. |
| 007 | `EmailService`, huella de origen y `X-Origen-Cliente`, `DEMASIADOS_PEDIDOS`; `Persona.email` opcional (D145). | Lote 5 (comentarios) espera. FR-058 trata el email como obligatorio. |
| 008 | Rama `vida_de_servicio` de la vista + su `FuenteSolicitudes`; valores nuevos de Curso y creación de Grupos (que debe llamar `exigirActivo`). | La bandeja funciona sin ese tipo. |
| 009 | Ramas `postulacion`; CRUD de Ministerio y Célula (tarjetas de Catálogos); sección "Ministerio" del perfil. | Catálogos muestra solo Sedes y Cursos. |
| 010 | Rama `bautismo`. | Sin ese tipo. |
| 011 | Ramas `inscripcion_evento` y `pago`; sección "Eventos" del perfil. | Sin esos tipos. |

**Cambios que esta spec pide a otras specs** (para que su PR los incluya, o para hacerlos al mergear la que llegue
segunda): seguir el contrato de cinco pasos de `contracts/bandeja-api.md`; tener `@@index([estado, createdAt])` en su
tabla de solicitudes; en la 008, llamar `CursoService.exigirActivo` al crear Grupos; en la 009/011, registrar su
sección del perfil en `SECCIONES_PERFIL` y su tarjeta en `GET /catalogos/resumen`.

**Orden de merge sugerido**: la 013 puede mergear antes que 008–011 (la vista arranca con la rama de Discipulado).
Si alguna de ellas llega antes con su propia bandeja, la 013 la conecta como un tipo más al mergear.

**Puntos de conflicto probables** (archivos que tocan varias specs a la vez): `permisos.ts`, `error-code.ts`,
`nav.ts`, `messages/es.json` (backoffice y web), `schema.prisma`, `seed-demo.ts`. Conflictos de agregado, se
resuelven conservando las dos partes.

## Paralelización (para `/speckit-tasks`)

- **Lote 0** (secuencial, bloquea todo): Prisma (comentarios, cursos, vista, índice), shared-types, packages/ui
  (avatar, barra, formulario de comentario sin conectar), permisos, códigos de error, nav, claves de mensajes vacías
  por namespace.
- **Lote 1** — Bandeja (Historia 1). **Lote 2** — Perfil (Historia 2). **Lote 3** — Inicio y métricas (Historia 3).
  **Lote 4** — Cumpleaños (Historia 4). **Lote 5** — Comentarios (Historia 5, requiere 007). **Lote 6** — Catálogos y
  Cursos (Historia 6). **Lote 7** — Edición de Persona (Historia 7, requiere 006).
- Lotes 1, 2, 4, 5 y 6 son independientes entre sí. El Lote 3 consume los conteos de 1 y 5 (si no están, sus bloques
  muestran solo lo que existe) y el bloque de cumpleaños de 4. El Lote 7 cuelga del perfil (2).
- **Lote final**: seed-demo, axe de todas las rutas, Pastor solo lectura, tres suites.

## Decisiones nuevas (se numeran al mergear)

- **DN-1 — La bandeja unificada lee de una vista SQL, la resolución sigue por tipo.** `solicitudes_bandeja` (`UNION
  ALL` con la forma base de `docs/04`) pagina, ordena y busca en la base; cada tipo hidrata sus filas y conserva su
  detalle y su resolución. Cada spec de tipo suma su rama con una migración que recrea la vista desde un único archivo
  versionado. *Porqué*: `docs/15` exige paginar/buscar/ordenar en la API, y con seis tablas solo una fuente única lo
  permite sin copiar estado (Principio XI) ni rehacer el modelo de la 004 (D31: forma común, no tabla común).
- **DN-2 — "Abierta" = espera una acción del Admin, declarado por tipo en un solo lugar.** El filtro por defecto de
  la bandeja y los conteos del Inicio usan "abiertas", no estados crudos; `lista_espera`, `cancelada`, `inactiva` y
  `retirada` son resueltas; una Inscripción a Evento confirmada con pago pendiente no es abierta, su Pago sí (D148).
  *Porqué*: los estados difieren por tipo; lo que el Admin necesita saber es qué espera su respuesta.
- **DN-3 — El perfil de Persona es una pantalla de secciones independientes que cada spec extiende.** Cada sección
  carga y falla sola; las specs de tipo registran la suya. El Pastor lo ve completo, contacto incluido (D64); nadie ve
  notas de Encuentros (D134). *Porqué*: D61 con cuatro estados por bloque y sin acoplar todas las specs a un DTO.
- **DN-4 — Métricas y cumpleaños se calculan al momento; "Persona activa" es `estado = activa` y `activo = true`.**
  Incluye menores activados y Personas sin app (Flujo 12, paso 5). El tiempo de congregación se muestra como fue
  declarado. *Porqué*: volumen chico; una tabla de agregados es estado copiado (Principio XI).
- **DN-5 — "Contanos qué te parece": límite por origen 5/h sin sesión y 20/h con sesión, contacto solo si lo acepta.**
  Sin sesión y con contacto aceptado se pide email o teléfono; con sesión se usan los del perfil. La IP nunca se
  guarda en claro (huella HMAC, mismo mecanismo que la 007). El email a la desarrolladora va a una dirección
  configurable y su falla no impide guardar. *Porqué*: `docs/16` pide rate limiting y datos técnicos mínimos sin datos
  sensibles; reusar la 007 evita infraestructura nueva.
- **DN-6 — Los Cursos los fija el código; el Admin edita nombre y descripción, inactiva y elimina.** Categoría, tipo y
  modalidad no se editan; el alta solo ofrece combinaciones reconocidas sin registro. Un Curso inactivo no admite
  Grupos nuevos (`CURSO_INACTIVO`), los existentes siguen. *Porqué*: cada combinación tiene comportamiento propio
  (D24, D44); un Curso inventado no lo usaría ningún flujo (Principio IV).
- **DN-7 — Catálogos agrupa Sedes y Cursos (y luego Ministerios y Células); dejan de ser ítems del menú.** *Porqué*:
  `docs/14` §3 ya lo dice; con cuatro catálogos, el menú lateral del Admin crecería sin orden.

## Cambios a docs al mergear

- `docs/05-decisiones.md`: DN-1 a DN-7 con su número (mirar el último usado, D89/D103).
- `docs/04-dominio-entidades.md`: Comentario de la app suma `contacto_email`/`contacto_telefono` (solo sin sesión),
  `app`, `revisado_por`/`revisado_en` (en vez del booleano `revisado`); Curso suma `descripcion`. Mencionar la vista
  de la bandeja en el "Patrón común de Solicitudes".
- `docs/diagrama-er.mermaid`: ComentarioApp con los campos nuevos; Curso con `descripcion`, `eliminado_en`,
  `eliminado_por`.
- `docs/14-navegacion.md` §3: Inicio enlaza a Cumpleaños y Comentarios (no son ítems de menú); Sedes y Cursos viven
  bajo Catálogos; Palabra Profética, Libros y Pendientes de tutor siguen como ítems propios.
- `docs/16-sistemas-transversales.md` §3: los límites concretos de "Contanos qué te parece" (DN-5) y la página
  `/contanos`.
- `docs/15-guia-ux-ui.md`: glosario — "Abiertas/Resueltas" para la bandeja; patrón de "bloques independientes" del
  Inicio.

## Complexity Tracking

| Riesgo / complejidad | Por qué se acepta | Alternativa más simple descartada |
|---|---|---|
| Vista SQL recreada por cada spec de tipo | Es la única fuente que pagina sobre seis tablas sin copiar estado | Merge en memoria (rompe `docs/15` al crecer) |
| Regla de "abierta" en SQL y en TS | Necesaria en los dos lados; un test de integración las ata (Principio XI) | Solo en SQL (la pantalla no podría filtrar por estados del tipo) |
