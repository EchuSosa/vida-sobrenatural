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

- [ ] No [NEEDS CLARIFICATION] markers remain
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

- Los tres marcadores `[NEEDS CLARIFICATION]` (FR-009, FR-010, FR-011) quedaron sin resolver a
  propósito, tal como lo pidió el usuario — se resuelven en una sesión de `/speckit.clarify`
  aparte, antes de `/speckit.plan`.
- **Verificación del ítem anti-circularidad (H-125)**: se revisó cada requisito contra el patrón
  "requiere un estado que solo se produce cumpliendo ese mismo requisito". El punto de apoyo es
  la Historia 1 (Admin sembrado, FR-001/FR-002/FR-003): existe *antes* de que el mecanismo de
  otorgar roles de cargo (Historia 2, FR-006) pueda usarse por primera vez, así que no hay
  ningún rol de cargo — incluido `discipulador`, el caso concreto de H-125 — cuyo primer
  otorgamiento dependa de que alguien ya tenga ese rol o cualquier otro estado que ese mismo
  otorgamiento produciría. Pasa.
- **Hallazgo a reportar (no bloquea el checklist)**: el enunciado original de este spec pedía
  cubrir "8 de 17 páginas del backoffice que no chequean sesión". Verificado contra el código
  (`apps/backoffice/src/app/layout.tsx`, `apps/backoffice/src/auth.ts`,
  `eslint-rules/no-session-check-en-page.mjs`): esa cifra describe el estado anterior a H-116
  (revisión manual), que ya centralizó el chequeo de sesión en el layout raíz y agregó una
  regla de ESLint (`local/no-session-check-en-page`) que impide que una página vuelva a
  implementarlo. Lo que sigue sin resolver, y es lo que este spec realmente cubre (Historia 4,
  FR-016/FR-017), es el chequeo de **rol/permiso** sobre una sesión ya existente — ver la
  Assumption correspondiente en spec.md.
- Con los tres `[NEEDS CLARIFICATION]` sin resolver, este spec NO está listo para `/speckit.plan`
  todavía — el resto del checklist pasa. Siguiente paso: `/speckit.clarify`.
