# Specification Quality Checklist: Roles, permisos y acceso al backoffice

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-23
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Ningún requisito depende de un estado que solo puede producirse cumpliendo ese mismo
      requisito (el patrón de circularidad de H-125, revisión manual, que dejó al spec 004 sin
      poder asignar el primer Discipulador)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Sesión `/speckit.clarify` del 2026-09-24: los tres marcadores `[NEEDS CLARIFICATION]`
  originales (FR-009 revocación de `discipulador` con discipulados activos, FR-010
  auto-revocación del Admin, FR-011 alcance del listado de Personas para ascender) quedaron
  resueltos con decisiones ya tomadas por el usuario — ver `## Clarifications` en spec.md. Se
  agregaron FR-024 (consecuencia de FR-011 sobre el listado), SC-008 y SC-009 como resultado.
- **Verificación del ítem anti-circularidad (H-125)**, repetida contra el spec ya clarificado:
  el punto de apoyo sigue siendo la Historia 1 (Admin sembrado, FR-001/FR-002/FR-003), que
  existe *antes* de que el mecanismo de otorgar roles de cargo (Historia 2, FR-006) pueda
  usarse por primera vez. Las tres decisiones nuevas no introducen circularidad: FR-009
  (bloqueo de revocación) depende del estado de los discipulados de esa Persona, no de un
  estado que ese mismo requisito produzca; FR-010 (auto-revocación de `admin`) es una
  restricción fija sobre quién puede ejecutar la acción, no un estado derivado; FR-011/FR-024
  (restricción por minoría de edad) depende de `fecha_nacimiento`, un dato que ya existe en
  Persona desde su alta, no de nada que este spec otorgue. Pasa.
- **Hallazgo reportado en la sesión anterior (sigue vigente, no bloquea el checklist)**: el
  enunciado original de este spec pedía cubrir "8 de 17 páginas del backoffice que no chequean
  sesión". Verificado contra el código (`apps/backoffice/src/app/layout.tsx`,
  `apps/backoffice/src/auth.ts`, `eslint-rules/no-session-check-en-page.mjs`): esa cifra
  describe el estado anterior a H-116 (revisión manual), que ya centralizó el chequeo de sesión
  en el layout raíz y lo blindó con una regla de ESLint. Lo que la Historia 4 realmente cubre es
  el chequeo de **rol/permiso** sobre una sesión ya existente — ver la Assumption
  correspondiente en spec.md.
- **Hallazgo de esta sesión (no bloquea el checklist, no se editó por decisión del usuario)**:
  `docs/03-roles-permisos.md` (actualizado en el commit `1fade6f`) no menciona en ningún lado
  que los roles de cargo estén vedados para Personas menores de edad — no lo contradice (no hay
  ninguna afirmación de que sí puedan tenerlos), pero tampoco documenta la restricción nueva de
  FR-011. Cuando este spec pase a `/speckit.plan`/implementación, ese documento probablemente
  necesite una fila o nota aclaratoria — queda como pendiente para el usuario, no tocado acá.
- Con los tres `[NEEDS CLARIFICATION]` resueltos, este spec está listo para `/speckit.plan` en
  cuanto a este checklist — el usuario pidió explícitamente no avanzar todavía porque quiere
  releer el spec completo primero.
