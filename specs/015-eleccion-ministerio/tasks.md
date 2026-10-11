# Tasks — spec 015

## Entrega 1 — hasta 2 membresías (D241)

- [ ] T001 Migración: borrar `postulaciones_una_aprobada`, crear `postulaciones_aprobada_por_ministerio`.
- [ ] T002 shared-types: `MAX_MINISTERIOS_POR_PERSONA`, `decisionAlAprobar`, `membresias` en `EstadoMiMinisterio` (`miembro`), `actuales` en `MinisterioDePersona`, `ministeriosActuales` en `PostulacionDetalle`, `sumar`/`reemplazaId` en `AprobarPostulacion` + unit.
- [ ] T003 API: `otorgarMembresia` (`ministerio/membresia.ts`) y `aprobar` con la decisión; `estadoMiMinisterio` con todas las membresías; `deLaPersona` con `actuales` + integración.
- [ ] T004 Web: card de Ministerio de Mi camino con todas las membresías + e2e.
- [ ] T005 Backoffice: diálogo "¿Lo suma o reemplaza a …?" en el detalle de la Postulación y lista en el Perfil + e2e.
- [ ] T006 Docs: manual (MIN), docs/04 (regla de la membresía), checklist de docs/15 por pantalla.

## Entrega 2 — elección (D239, D240, D242)

- [ ] T010 Migración: `grupos.eleccionAbierta`, `elecciones_ministerio`, `opciones_eleccion_ministerio`, rama `eleccion_ministerio` de la vista `solicitudes_bandeja`.
- [ ] T011 shared-types: tipos, `validarEleccionMinisterio`, tipo de bandeja, avisos + unit.
- [ ] T012 API Admin: abrir/cerrar elección; detalle; confirmar/descartar opción; fuente de bandeja y pendientes del Inicio; cierre al finalizar la edición y cancelación con la baja + integración.
- [ ] T013 API persona: `GET`/`PUT /elecciones-ministerio/me` + integración.
- [ ] T014 API líder VS: lista, detalle, guardar elección y notas, "Charla hecha" + integración (notas invisibles para la persona y el Pastor; líder ajeno 404).
- [ ] T015 Web persona: `/mi-camino/ministerios/elegir` y la card + e2e (axe, `@celular`).
- [ ] T016 Web líder: `mis-grupos/[grupoId]/elecciones` + e2e.
- [ ] T017 Backoffice: botón en la edición, detalle en la bandeja + e2e.
- [ ] T018 Seeds: demo (edición con la elección abierta, elecciones en cada estado) y e2e; `limpiar-e2e`.
- [ ] T019 Docs: manual (ELM), docs/04, docs/03 (permisos), docs/08.

## Entrega 3 — "Ya sirvo" y primera carga (D243)

- [ ] T030 Migración y modelo de opciones de la declaración; `desdeAnio`.
- [ ] T031 API: declarar con opciones; confirmar por opción (membresía + completitud, VS opcional); `POST /ministerios/:id/miembros` + integración.
- [ ] T032 Web: "Ya sirvo en un ministerio" con el listado + e2e.
- [ ] T033 Backoffice: detalle de la declaración con opciones; "Agregar personas que ya sirven" + e2e.
- [ ] T034 Docs: manual, docs/04, docs/08 (sale del roadmap).
