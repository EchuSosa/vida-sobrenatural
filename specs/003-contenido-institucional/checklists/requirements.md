# Specification Quality Checklist: Contenido institucional

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-21
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

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`
- La spec referencia nombres de decisiones existentes (D5, D82, D83, D84, D93, D94, D95, D97, D98,
  D106, D109, D110, D112, D114, D115, D119, D120) y una pantalla ya construida (Sedes) como
  vocabulario de dominio del propio proyecto — no como detalle de implementación técnica (no se
  nombra ningún framework, librería, clase ni endpoint).
- Cero marcadores [NEEDS CLARIFICATION]: el pedido original ya trae decisiones tomadas (D109/D110) y
  contenido real (`docs/12-contenido-bienvenida.md`) que resuelven lo que en otra spec habría
  quedado ambiguo.
- 2026-09-21: revisión post-creación ajustó FR-017 (eliminar Libro: sin dependientes, siempre
  permitido — antes copiaba la regla de Sede) y agregó cuatro requisitos: orden del catálogo
  editable (FR-016), validación de URL de YouTube con extracción de id (FR-011), embed vía
  youtube-nocookie.com con patrón miniatura+clic (FR-005), y encaje de portadas no verticales por
  recorte centrado a 2:3 (FR-024). Checklist revalidado: sigue en verde, cero marcadores nuevos.
- 2026-09-21 (segunda revisión): FR-020 corregido de nuevo — "eliminar Libro siempre permitido" era
  una regla escrita como permanente; pasa a ser una condición del modelo actual ("hoy no tiene
  dependientes"), con la referencia explícita a que el backlog de Ventas de Ediciones VS
  (`docs/08-roadmap-producto.md`) puede agregar un dependiente real más adelante, momento en el que
  esta spec deja de aplicar y la regla de bloqueo de Sede vuelve a valer. Acceptance Scenario 6 de la
  Historia 4 ajustado igual. Checklist revalidado: sigue en verde.
- 2026-09-21 (tercera revisión): sumada la Historia 5 (P5) — identidad visual real (`docs/marca/`) en
  favicon, ícono de PWA, marca de agua de `PlaceholderImagen`, navegación y pie de página de las dos
  apps, y la imagen de Open Graph — con FR-033 a FR-042, dos Edge Cases, SC-007 y dos bullets de
  Assumptions (vectorial/swoosh siguen pendientes, no se inventan). Checklist revalidado: sigue en
  verde, cero marcadores nuevos.
- 2026-09-21 (cuarta revisión, técnica sobre `research.md`, sin tocar `spec.md`): la Decisión 7
  (copias de marca en `public/marca/` + script de sync + test de hash) se revisó consumidor por
  consumidor antes de `/speckit.tasks` — ninguno de los tres la necesitaba (import directo vía
  `transpilePackages` para nav/pie/sidebar, favicon/PWA son derivados y no copias, Open Graph lee el
  archivo por filesystem en el propio proceso de `apps/web`). Se reemplazó por un origen único sin
  copias sincronizadas; `plan.md` (Project Structure, Constitution Check) actualizado igual. Checklist
  no cambia de estado — ningún ítem dependía de ese detalle de implementación.
- 2026-09-21 (quinta revisión, sobre el repo, no sobre `spec.md`): movidos (no copiados) los seis PNG
  de marca de `docs/marca/` a `packages/ui/src/assets/marca/` (`git mv`), a pedido del usuario —
  `docs/marca/` queda solo con su `README.md`, pendiente de que el usuario lo actualice con la ruta
  nueva. De paso se corrigió que `packages/ui/package.json` restringe subrutas importables
  (`exports`) y hace falta agregar `"./assets/marca/*"` para que el import funcione — detalle que
  research.md no tenía capturado. `spec.md`, `plan.md`, `research.md` y `data-model.md` actualizados
  para no seguir afirmando que los PNG originales siguen en `docs/marca/`. Checklist no cambia de
  estado.
