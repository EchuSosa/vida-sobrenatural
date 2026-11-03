# Tasks — spec 018 (baja de la app)

Un PR. Las tres suites en verde antes de unir.

- [ ] T001 Migración: `dadaDeBajaEn`, `dadaDeBajaPorId`, `motivoBajaInterno` en Persona;
  `ArchivoPendienteDeBorrar`. Permiso `personas.baja` → `['admin']`.
- [ ] T002 shared-types: `PALABRA_CONFIRMACION_BAJA`, `MOTIVO_BAJA_MAX`, `NOMBRE_ANONIMO` y
  `datosAnonimos()`; unit.
- [ ] T003 `BajaPersonaService.darDeBaja` con la tabla de `data-model.md` (FR-002–FR-006, FR-008,
  FR-009), reusando los cierres que ya existen.
- [ ] T004 Endpoints `POST /personas/me/baja` y `POST /personas/:id/baja`; listados y búsquedas sin
  dadas de baja (FR-007).
- [ ] T005 Archivos: borrado después del commit + tarea diaria de reintento (FR-004).
- [ ] T006 Integración: SC-001 (barrido), SC-003, SC-004, último Admin, permisos, doble pedido,
  sesión vieja.
- [ ] T007 Web: Perfil → `/perfil/baja` → `/baja-lista`.
- [ ] T008 Backoffice: "Dar de baja de la app" en el Perfil de Persona.
- [ ] T009 e2e web y backoffice (feliz + error por campo + API caída + doble toque; Pastor; axe).
- [ ] T010 Checklist de `docs/15` para las tres pantallas (D114). PROGRESS.md.
