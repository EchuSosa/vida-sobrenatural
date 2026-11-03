# Tasks — spec 018 (baja de la app)

Un PR. Las tres suites en verde antes de unir.

- [x] T001 Migración: `dadaDeBajaEn`, `dadaDeBajaPorId`, `motivoBajaInterno` en Persona;
  `ArchivoPendienteDeBorrar`. Permiso `personas.baja` → `['admin']`.
- [x] T002 shared-types: `PALABRA_CONFIRMACION_BAJA`, `MOTIVO_BAJA_MAX`, `NOMBRE_ANONIMO` y
  `datosAnonimos()`; unit.
- [x] T003 `BajaPersonaService.darDeBaja` con la tabla de `data-model.md` (FR-002–FR-006, FR-008,
  FR-009), reusando los cierres que ya existen.
- [x] T004 Endpoints `POST /personas/me/baja` y `POST /personas/:id/baja`; listados y búsquedas sin
  dadas de baja (FR-007).
- [x] T005 Archivos: borrado después del commit + tarea diaria de reintento (FR-004).
- [x] T006 Integración: SC-001 (barrido), SC-003, SC-004, permisos, doble pedido, sesión vieja.
  El "único Admin" no se prueba en integración: la base de test es compartida y siempre tiene otros
  Admins; queda cubierto en el e2e del backoffice si hace falta, o con un unit del chequeo.
- [x] T007 Web: Perfil → `/perfil/baja` → `/baja-lista`.
- [x] T008 Backoffice: "Dar de baja de la app" en el Perfil de Persona.
- [x] T009 e2e web y backoffice (feliz + error por campo + API caída + doble toque; Pastor; axe).
- [x] T010 Checklist de `docs/15` para las tres pantallas (D114). PROGRESS.md.
  - [x] Una acción principal con verbo concreto: "Darme de baja" (web) y "Sí, dar de baja" (backoffice).
  - [x] Destructivo según D151: rojo + ícono, y "Volver" en el diálogo; el enlace del Perfil va al final, aparte.
  - [x] Estados: la página de la web es estática más el formulario (el error queda en la pantalla y no se borró nada); la despedida es su propio final; en el backoffice el Perfil ya tiene `loading.tsx` y `error.tsx`.
  - [x] Un solo envío (`useEnvio` / diálogo; e2e de tres toques en las dos apps).
  - [x] Error por campo con resumen y foco (H-50): la palabra BAJA y el motivo.
  - [x] Qué pasa después: la pantalla dice qué se borra, qué se cierra, qué queda y que no se deshace.
  - [x] Tono: voseo, sin jerga ("Persona dada de baja", "te registrás de nuevo como alguien nuevo").
  - [x] Celular (`@celular`), teclado (formulario nativo) y lector de pantalla (etiquetas, `aria-invalid`).
  - [x] Contraste: solo tokens; `axe` claro y oscuro en web y backoffice.
