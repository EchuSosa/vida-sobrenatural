<!--
Sync Impact Report
- Version change: (unratified template) → 1.0.0
- Rationale for bump: Initial ratification of a fully-defined constitution (all placeholders
  filled for the first time) — treated as MAJOR per semantic versioning for a first release.
- Modified principles: none previously existed as concrete text; all six are newly defined:
  - I. Spec-First (new)
  - II. Consistencia terminológica y de dominio (new)
  - III. Soft delete obligatorio (new)
  - IV. Simplicidad / no artefactos prematuros (new)
  - V. Seguridad (new)
  - VI. Testing pragmático por capas (new)
- Added sections: Core Principles (I-VI), Restricciones Técnicas, Governance.
- Removed sections: the template's third generic section ([SECTION_3_NAME], e.g. "Development
  Workflow / Review Process") was dropped — no content was supplied for it and nothing in
  Governance depends on it; re-add it in a future amendment if a dedicated workflow section
  becomes necessary.
- Deferred items / TODOs: none. RATIFICATION_DATE is set to the date of this amendment because no
  prior ratified version of this constitution existed.
- Templates requiring follow-up: none checked automatically by this command; per the Scope Guard,
  dependent templates/commands read this file at runtime and are not modified here.
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

El registro de usuarios es vía SSO (Google/Facebook, mediante NextAuth.js); el sistema no
gestiona contraseñas propias. El acceso a contenido por curso se habilita manualmente (por un
Admin o Discipulador), nunca automáticamente solo por rol.

**Rationale**: Reduce la superficie de riesgo de manejar credenciales propias y mantiene control
humano sobre quién accede a qué contenido, en línea con las decisiones ya registradas en
`docs/05-decisiones.md`.

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

## Restricciones Técnicas

- Monorepo gestionado con pnpm + Turborepo: `apps/api` (NestJS), `apps/web` y `apps/backoffice`
  (Next.js).
- Persistencia en PostgreSQL, accedida vía Prisma como ORM.
- Autenticación vía NextAuth.js (SSO) — ver Principio V.
- UI: Tailwind CSS + shadcn/ui.
- Documentación de API: Swagger/OpenAPI.
- Todo el entorno de desarrollo corre sobre Docker Compose en local.

## Governance

La Constitución prevalece sobre cualquier decisión ad-hoc de implementación. Cualquier cambio a
un principio (agregar, modificar o eliminar) requiere registrar la ADR correspondiente en
`docs/05-decisiones.md` antes o junto con la actualización de este archivo — un cambio de
principio sin su ADR asociada no es válido.

**Versionado semántico** de esta Constitución:
- MAJOR: cambios incompatibles, o eliminación/redefinición de principios existentes.
- MINOR: se agrega un principio nuevo, o se expande materialmente una guía existente.
- PATCH: aclaraciones, correcciones de redacción o ajustes no semánticos.

Toda spec, plan de implementación o PR debe poder verificarse contra los seis principios
anteriores antes de mergear. Cuando un principio y una spec entren en conflicto, gana la
Constitución hasta que se apruebe una ADR que la enmiende.

**Version**: 1.0.0 | **Ratified**: 2026-09-15 | **Last Amended**: 2026-09-15
