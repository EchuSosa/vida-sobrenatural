# Tasks — spec 015

## Entrega 1 — hasta 2 membresías (D241)

- [x] T001 Migración: borrar `postulaciones_una_aprobada`, crear `postulaciones_aprobada_por_ministerio`.
- [x] T002 shared-types: `MAX_MINISTERIOS_POR_PERSONA`, `decisionAlAprobar`, `membresias` en `EstadoMiMinisterio` (`miembro`), `actuales` en `MinisterioDePersona`, `ministeriosActuales` en `PostulacionDetalle`, `sumar`/`reemplazaId` en `AprobarPostulacion` + unit.
- [x] T003 API: `decidirMembresia` e `inactivarPorCambio` (`ministerio/membresia.ts`) y `aprobar` con la decisión; `estadoMiMinisterio` con todas las membresías; `deLaPersona` con `actuales` + integración.
- [x] T004 Web: card de Ministerio de Mi camino con todas las membresías + e2e.
- [x] T005 Backoffice: diálogo "¿Lo suma o reemplaza a …?" en el detalle de la Postulación y lista en el Perfil + e2e.
- [x] T006 Docs: manual (MIN-04 y MIN-15), docs/04 (regla de la membresía). Checklist de docs/15 revisado en la card de Ministerio, el detalle de la Postulación y el Perfil: cuatro estados (sin cambios de carga/error), radios con `legend`, textos en `next-intl`, colores de tokens, estado en texto + ícono (D81).

## Entrega 2 — elección (D239, D240, D242)

- [x] T010 Migración: `grupos.eleccionAbierta`, `elecciones_ministerio`, `opciones_eleccion_ministerio`, rama `eleccion_ministerio` de la vista `solicitudes_bandeja`.
- [x] T011 shared-types: tipos, `validarEleccionMinisterio`, tipo de bandeja, avisos + unit.
- [x] T012 API Admin: abrir/cerrar elección; detalle; confirmar/descartar opción; fuente de bandeja y pendientes del Inicio; cierre al finalizar la edición y cancelación con la baja + integración.
- [x] T013 API persona: `GET`/`PUT /elecciones-ministerio/me` + integración.
- [x] T014 API líder VS: lista, detalle, guardar elección y notas, "Charla hecha" + integración (notas invisibles para la persona y el Pastor; líder ajeno 404).
- [x] T015 Web persona: `/mi-camino/ministerios/elegir` y la card + e2e (axe, `@celular`).
- [x] T016 Web líder: `mis-grupos/[grupoId]/elecciones` + e2e.
- [x] T017 Backoffice: botón en la edición, detalle en la bandeja + e2e.
- [x] T018 Seeds: demo (edición con la elección abierta, elecciones en cada estado) y e2e; `limpiar-e2e`.
- [x] T019 Docs: manual (ELM-01 a ELM-06), docs/04, docs/08 (sin permisos nuevos: el líder usa `mis_grupos.*` + Liderazgo vigente, el Admin `solicitudes.*`). Checklist de docs/15 revisado en cada pantalla nueva (persona: elegir y card; líder: lista y charla; backoffice: edición y detalle): cuatro estados con `loading.tsx`/`error.tsx`/`not-found.tsx`, errores por campo con resumen y foco, `useEnvio` en cada botón, textos en `next-intl`, colores de tokens, estado en texto + ícono, 44 px, axe claro/oscuro y `@celular`.
- [x] T020 Ministerios sin áreas (docs/22: Ceremonial, Mesa de entrada…): se eligen enteros (`celulaId` null).

## Entrega 3 — "Ya sirvo" y primera carga (D243)

- [x] T030 Migración y modelo de opciones de la declaración; `desdeAnio`.
- [x] T031 API: declarar con opciones; confirmar por opción (membresía + completitud, VS opcional); `POST /ministerios/:id/miembros` + integración.
- [x] T032 Web: "Ya sirvo en un ministerio" con el listado + e2e.
- [x] T033 Backoffice: detalle de la declaración con opciones; "Agregar personas que ya sirven" + e2e.
- [x] T034 Docs: manual (YAS-01 a YAS-03), docs/04, docs/08 (sale del roadmap). Checklist de docs/15 revisado en "Ya sirvo" (web), el detalle del historial y "Agregar a alguien que ya sirve" (backoffice): cuatro estados, errores por campo con resumen y foco, `useEnvio`/bloqueo de reentrada, textos en `next-intl`, colores de tokens, estado en texto + ícono, 44 px, axe claro/oscuro.
- [x] T035 `GET /elecciones-ministerio/me/resumen` responde siempre un objeto (`ninguna`); `textoOpcion` en un módulo sin 'use client' (las dos fallas que encontró el e2e de la entrega 3, corregidas también en #51).
