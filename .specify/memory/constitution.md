<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0 (MINOR, per ADR D141 in docs/05-decisiones.md)
- Rationale for bump: Principio V expands the ways a person can access the system (SSO or a
  one-time code sent by email) without making anything existing incompatible. The core of the
  principle — the system never manages its own passwords — is unchanged, so this is a material
  expansion (MINOR), not a redefinition (MAJOR).
- Why D141 exists: Echu moved "Ingreso con código por email" from Fase 2 to the MVP
  (specs/007-ingreso-codigo-email). Principio V said access was "vía SSO" only, including the
  later access of Personas added by an Admin (D97); spec 007 could not pass the Constitution
  Check without this amendment.
- Modified principles:
  - V. Seguridad: access via SSO or email one-time code; the code counts as verified email; new
    bullet on how codes are stored and limited; D97 bullet updated.
  - I–IV, VI–XI: unchanged.
- Added sections: none. Removed sections: none.
- Deferred items / TODOs: none.
- Templates requiring follow-up: none — plan-template.md resolves the Constitution Check against
  this file at plan time; spec-template.md and tasks-template.md have no principle-specific text.

Previous Sync Impact Report (1.1.0 → 1.2.0), kept verbatim per D114's own request:
- Version change: 1.1.0 → 1.2.0 (MINOR, per ADR D114 in docs/05-decisiones.md)
- Rationale for bump: one new principle added (XI), Restricciones Técnicas expanded, Governance
  expanded with a concrete "definición de terminado" — no existing principle was redefined or
  removed.
- Why D114 exists (kept here per the ADR's own request, for whoever reads this amendment):
  Principio VIII already required the four loading/empty/error/success states per screen since
  D105 (v1.1.0), and it was still missed across almost the whole app (H-43). The reason: 
  /speckit.analyze compares spec.md against the Constitution, but nothing compares the actual
  implementation against either one. A principle with no concrete check is a principle nobody is
  actually accountable to. That's why this amendment doesn't just add XI — it also gives
  Governance a control that turns "the app must look done" into a task that has to exist in
  tasks.md and suites that have to be green, not just a sentence someone might remember to apply.
- Modified principles:
  - XI. Una sola fuente de verdad en el código (new)
  - I–X: unchanged.
- Added sections: none new at the top level; Restricciones Técnicas gained one bullet (acceso a
  datos: select explícito, paginación, índices — H-42); Governance gained one paragraph
  (definición de terminado: checklist de docs/15-guia-ux-ui.md instanciado por pantalla en
  tasks.md, y las tres suites verdes antes de cerrar una fase — H-43).
- Removed sections: none.
- Deferred items / TODOs: none.
- Templates requiring follow-up: reviewed plan-template.md, spec-template.md, tasks-template.md.
  plan-template.md's "Constitution Check" gate resolves against this file at plan time, so it
  already covers Principio XI without edits. tasks-template.md has no principle-specific gate to
  update, but authors generating tasks.md from now on should read Governance below and instantiate
  the docs/15-guia-ux-ui.md checklist per screen as its own task, per spec — no template change
  required for that, it's a per-spec authoring responsibility. spec-template.md unaffected.
-->

# Vida Sobrenatural Constitution

Constitución del proyecto **Vida Sobrenatural** ("Igle"): una app web para guiar a los recién
llegados de la iglesia Vida Sobrenatural (La Plata) a través del proceso de integración
Bienvenida → Vida Nueva → Vida de Servicio → Ministerio. Se construye con Specification-Driven
Development, backend NestJS + Prisma sobre PostgreSQL, frontend Next.js, todo sobre Docker
Compose en local.

## Core Principles

### I. Spec-First

Ninguna funcionalidad se implementa sin una spec o ADR aprobada primero en `/docs`. El código
sigue a la especificación, nunca al revés: si el código diverge de lo documentado, la
documentación se actualiza antes o junto con el cambio de código, nunca después ni como una
prueba pendiente.

**Rationale**: Garantiza trazabilidad de las decisiones del dominio y evita que el sistema crezca
por decisiones implícitas que nadie registró.

### II. Consistencia terminológica y de dominio

Se usan siempre los nombres canónicos de roles y entidades definidos en
`docs/04-dominio-entidades.md` (ej. Visitante, Discipulador, Líder de curso). Nunca se usan
sinónimos informales, traducciones libres, ni nombres de personas reales en el código, los
commits o la documentación técnica.

**Rationale**: Un único vocabulario del dominio evita ambigüedad entre negocio y código, y
proteger la identidad de personas reales fuera de los artefactos técnicos reduce el riesgo de
exposición de datos personales.

### III. Soft delete obligatorio

Ninguna entidad se borra físicamente de la base de datos. Todo "delete" es lógico, mediante un
flag `activo` (u otro mecanismo equivalente explícito en el schema) en el modelo de datos.

**Rationale**: Preserva el historial de personas y de la actividad de la iglesia, necesario para
el seguimiento pastoral y la auditoría, y evita pérdidas irreversibles de datos por error humano
o de software.

### IV. Simplicidad / no artefactos prematuros

No se crea código, tablas ni endpoints para un dominio que todavía no está especificado en
`/docs`. Cada artefacto técnico debe poder trazarse a una spec vigente.

**Rationale**: Evita complejidad no justificada (YAGNI) y refuerza el Principio I — si algo no
tiene spec, no debería tener implementación.

### V. Seguridad

El registro y el acceso de usuarios son vía SSO (Google/Facebook, mediante NextAuth.js) o con un
código de un solo uso enviado al email de la persona (D141); el sistema no gestiona contraseñas
propias. El acceso a contenido por curso se habilita manualmente (por un
Admin o Discipulador), nunca automáticamente solo por rol.

Además:

- La autorización se valida en la API **por registro**, no solo por rol (ej. un Discipulador
  solo accede a sus propios discípulos, nunca a todos). La UI puede ocultar una acción por
  comodidad, pero la decisión de autorizar siempre la toma la API.
- El login es **fail-closed**: si no se puede verificar la Persona contra la API (caída,
  timeout, error), el login se bloquea por completo en vez de dejar pasar sin rol (D88).
- Una cuenta SSO solo se vincula a una Persona existente si el proveedor confirma que el email
  está verificado. Escribir correctamente un código recibido por email cuenta como email
  verificado.
- Los códigos de ingreso por email se guardan solo como huella (nunca en claro, nunca en logs),
  vencen, sirven una sola vez, y tienen límite de intentos por código y de envíos por email y
  por origen (D141, `specs/007-ingreso-codigo-email/`).
- Los archivos privados (comprobantes de pago, contenido de curso) nunca se sirven desde
  carpetas públicas: se exponen vía un endpoint de la API que valida permisos en cada request.
- Ninguna notificación push ni asunto de email incluye datos sensibles (ver
  `docs/16-sistemas-transversales.md`).
- El alta de Personas adultas por un Admin/Discipulador desde el backoffice (D97) es la **única
  excepción** al registro vía SSO; incluso en ese caso, el sistema nunca gestiona contraseñas
  propias — el acceso posterior, si existe, es vía SSO o con código por email (D141).

**Rationale**: Reduce la superficie de riesgo de manejar credenciales propias y mantiene control
humano sobre quién accede a qué contenido, en línea con las decisiones ya registradas en
`docs/05-decisiones.md`. Validar por registro (no solo por rol) evita fugas de datos entre
discípulos de distintos Discipuladores; fail-closed prioriza no exponer datos de menores
(`pendiente_tutor`) ante una falla transitoria antes que la comodidad de un login que no se cae.

### VI. Testing pragmático por capas

Toda lógica de negocio con ramas o reglas condicionales (ej. cálculo de edad, validación de
prerrequisitos, prevención de duplicados, activación de flags automáticos) DEBE tener test
unitario con Jest. Las operaciones que dependen de la base de datos (ej. cambios de estado en
cascada al finalizar un Grupo) DEBEN tener al menos un test de integración con Jest contra una
base de datos de test. Los flujos de usuario críticos (aquellos que, si se rompen, impiden el
objetivo central de la fase — ej. el registro completo de Bienvenida) DEBEN tener al menos un
test end-to-end con Playwright. No se exige cobertura e2e exhaustiva de cada pantalla: se
prioriza una cantidad razonable de tests de alto valor sobre cobertura total, dado que es un
proyecto de una sola desarrolladora. Sin Jenkins ni CI por ahora — se corre todo en local; GitHub
Actions queda pospuesto hasta subir el repo a un remoto.

**Rationale**: Maximiza la detección temprana de errores en la lógica que más cambia (reglas de
negocio y flujos críticos) sin imponer una carga de mantenimiento de tests desproporcionada para
el tamaño real del equipo.

### VII. Accesibilidad e inclusión

Toda interfaz (`apps/web` y `apps/backoffice`) DEBE cumplir WCAG 2.2 AA. Ningún estado se
comunica solo con color: siempre va acompañado de texto y de un ícono. Las imágenes que llevan
información (ej. flyers de Eventos) DEBEN tener texto alternativo, y esa información clave
también DEBE estar disponible como texto en la página, no solo dentro de la imagen; todo código
QR va siempre acompañado de un link equivalente. Los tests end-to-end de flujos críticos (ver
Principio VI) DEBEN correr `@axe-core/playwright` en modo claro y en modo oscuro.

**Rationale**: El público incluye personas mayores y con distinta capacidad visual o motriz; un
flyer sin texto alternativo o un estado que solo cambia de color son barreras invisibles para
quien no las prueba activamente. Fuente: `docs/13-requisitos-no-funcionales.md`, D81, D83.

### VIII. Experiencia consistente

Toda pantalla DEBE seguir `docs/15-guia-ux-ui.md` y la navegación definida en
`docs/14-navegacion.md`: una sola acción principal por pantalla con verbo concreto, el orden de
botones de la convención adoptada, estados de carga/vacío/error/éxito definidos, el feedback
correspondiente según la matriz de `docs/16-sistemas-transversales.md`, el tono rioplatense
definido para los textos de la interfaz, y soporte de modo claro y oscuro con contrastes
verificados. Los nombres visibles del proceso de integración son **"Primeros pasos"** (sección
pública) y **"Mi camino"** (sección privada), nunca la nomenclatura interna de la iglesia.

**Rationale**: Consistencia en toda la app sin reinventar un sistema de diseño propio para cada
pantalla nueva, y nombres pensados para quien recién llega en vez de la jerga interna de la
iglesia. Fuente: D91, D92, D94, D95, D102.

### IX. Preparada para varios idiomas

Ningún texto de interfaz se escribe directo en el código: todo sale de `next-intl` (el MVP solo
tiene el locale `es`, pero la estructura ya soporta agregar otros). La API nunca devuelve
mensajes de error en un idioma particular — devuelve códigos de error, y es el frontend el que
los traduce (ver Principio X). Las listas predefinidas (ej. categorías de profesión, estados)
se guardan como claves estables, nunca como el texto visible, y se traducen recién en la
interfaz.

**Rationale**: Agregar un idioma después de que los textos ya están hardcodeados en decenas de
componentes obliga a revisar pantalla por pantalla; dejar la base lista desde el MVP cuesta poco
ahora. Fuente: D84.

### X. Errores y observabilidad

Toda respuesta de error de `apps/api` DEBE seguir el formato Problem Details (RFC 9457), con un
`code` tomado del catálogo de códigos compartido en `packages/shared-types` y un `requestId`.
Cada regla de negocio nueva que pueda fallar agrega su código correspondiente a ese catálogo en
vez de reutilizar uno existente con otro significado. Los errores se monitorean con Sentry
(desactivado en entornos locales); ni Sentry ni los logs de la aplicación pueden contener datos
personales.

**Rationale**: Un formato de error único simplifica su manejo en ambos frontends y su traducción
(Principio IX); un catálogo de códigos compartido evita que cada feature invente su propio
formato de error. Sentry permite enterarse de errores en producción sin depender de que alguien
los reporte, y excluir datos personales evita convertir la observabilidad en un riesgo de
privacidad. Fuente: D101, `docs/16-sistemas-transversales.md`.

### XI. Una sola fuente de verdad en el código

Una regla de negocio, una validación o un componente existen en **un solo lugar**. Lo que usan
dos apps vive en `packages/` — valores y tipos compartidos en `packages/shared-types`,
componentes de interfaz en `packages/ui`. Nada se copia entre `apps/web`, `apps/backoffice` y
`apps/api`. Si una limitación técnica real obliga a copiar algo de todos modos, esa copia DEBE
llevar un test que falle en cuanto diverja del original — la copia sin ese test no cumple este
principio.

**Rationale**: Dos copias de la misma regla se desincronizan tarde o temprano sin que nadie lo
note hasta que alguien queda trabado en un formulario — es exactamente lo que pasó con
`TELEFONO_REGEX`/`HORARIOS_SEDE_REGEX`, duplicadas a mano entre `apps/api` y los dos frontends
antes de que `packages/shared-types` tuviera build propio (H-33), y el mismo riesgo corre
cualquier componente reimplementado en más de una app en vez de extraerse a `packages/ui` (H-41).
Fuente: H-33, H-41 (`specs/revision-manual/2026-09-17-001-002.md`).

## Restricciones Técnicas

- Monorepo gestionado con pnpm + Turborepo: `apps/api` (NestJS), `apps/web` y `apps/backoffice`
  (Next.js).
- Persistencia en PostgreSQL, accedida vía Prisma como ORM.
- Autenticación vía NextAuth.js (SSO) — ver Principio V.
- UI: Tailwind CSS + shadcn/ui.
- Documentación de API: Swagger/OpenAPI.
- Todo el entorno de desarrollo corre sobre Docker Compose en local.
- Puertos locales fijos: `apps/web` en 3001, `apps/backoffice` en 3002, `apps/api` en 3333 (D104).
- Textos de interfaz vía `next-intl`; modo claro/oscuro vía `next-themes` y las variables CSS de
  shadcn (ver Principios VIII y IX).
- Envío de emails y almacenamiento de archivos quedan detrás de interfaces intercambiables
  (`EmailService`, `StorageService`), nunca acoplados directamente a un proveedor concreto; en
  local, los emails se prueban con Mailpit en Docker Compose.
- SEO (SSG/ISR, metadata, sitemap, datos estructurados de schema.org) se implementa solo en las
  páginas públicas; el área privada de `apps/web` y todo `apps/backoffice` llevan `noindex` (D82).
- Metas de Core Web Vitals en celular: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- Acceso a datos vía Prisma: todo query DEBE usar `select` explícito (nunca devolver un modelo
  completo sin filtrar sus campos); todo listado que pueda crecer sin límite conocido DEBE
  paginarse; las claves foráneas y los campos usados como filtro frecuente en un `where` DEBEN
  tener índice en `schema.prisma` (H-42).

## Governance

La Constitución prevalece sobre cualquier decisión ad-hoc de implementación. Cualquier cambio a
un principio (agregar, modificar o eliminar) requiere registrar la ADR correspondiente en
`docs/05-decisiones.md` antes o junto con la actualización de este archivo — un cambio de
principio sin su ADR asociada no es válido.

**Definición de terminado**: cumplir el Principio VIII no es automático por citarlo. El
`tasks.md` de cada spec DEBE instanciar, para cada pantalla que agregue o modifique, una tarea
concreta que aplique el checklist del final de `docs/15-guia-ux-ui.md` a esa pantalla — el
checklist referenciado sin una tarea propia por pantalla no cuenta como cumplido. Ninguna fase de
un spec se da por cerrada sin correr, en verde, las tres suites de la convención de
`docs/00-README.md`: los tests unitarios de `apps/api` (`pnpm --filter api run test`), la
integración (`pnpm --filter api run test:e2e`, config aparte) y los end-to-end de `apps/web`.

**Versionado semántico** de esta Constitución:
- MAJOR: cambios incompatibles, o eliminación/redefinición de principios existentes.
- MINOR: se agrega un principio nuevo, o se expande materialmente una guía existente.
- PATCH: aclaraciones, correcciones de redacción o ajustes no semánticos.

Toda spec, plan de implementación o PR debe poder verificarse contra los once principios
anteriores antes de mergear. Cuando un principio y una spec entren en conflicto, gana la
Constitución hasta que se apruebe una ADR que la enmiende.

**Version**: 1.3.0 | **Ratified**: 2026-09-15 | **Last Amended**: 2026-09-30
