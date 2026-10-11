# Implementation Plan: Elección de Ministerio y "Ya sirvo en un Ministerio"

**Branch**: `015-eleccion-ministerio` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

## Summary

Tres entregas, cada una en su PR y con las tres suites en verde:

1. **Servir en hasta 2 Ministerios (D241)**: la base para todo lo demás. Cambia la regla de una sola
   membresía de la 009 sin cambiar el modelo.
2. **Elección de ministerio (D239, D240, D242)**: modelo nuevo, la pantalla de la persona, la charla
   del líder de Vida de Servicio y la confirmación del Admin en la bandeja.
3. **"Ya sirvo" y primera carga (D243)**: la declaración con listado y la carga directa del Admin.

## Technical Context

Mismo stack que el resto (NestJS + Prisma, Next.js 16 con next-intl, `packages/ui`,
`packages/shared-types`). Sin dependencias nuevas.

## Entrega 1 — hasta 2 membresías (D241)

- **Migración**: `DROP INDEX postulaciones_una_aprobada`. Queda
  `postulaciones_una_aprobada_en_paralelo` (una en paralelo) y se suma un índice único parcial
  `postulaciones_aprobada_por_ministerio (personaId, ministerioId) WHERE estado = 'aprobada'`: nunca dos
  membresías del mismo Ministerio, ni en una carrera.
- **Regla compartida** (`shared-types/ministerios.ts`): `MAX_MINISTERIOS_POR_PERSONA = 2` y
  `decisionAlAprobar(actuales, enParalelo)`: `aprobar` | `elegir` (sumar o reemplazar) |
  `reemplazar` (carril lleno).
- **API** (`postulacion-admin.service.ts` → `decidirMembresia` en
  `ministerio/membresia.ts`, que reusan las entregas 2 y 3): bloquea la Persona (`bloquearPersona`),
  cuenta las aprobadas del carril y aplica la decisión. `AprobarPostulacion` suma `sumar?: boolean` y
  `reemplazaId?: string`; `confirmarCambio` sigue valiendo para el caso de una sola (compatibilidad). El
  409 `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO` lleva `ministeriosActuales` y `puedeSumar`.
- **Vistas**: `EstadoMiMinisterio` `miembro` suma `membresias: MembresiaVista[]` (todas, la del
  Ministerio primero); `MinisterioDePersona` suma `actuales`; `PostulacionDetalle` suma
  `ministeriosActuales`. Los campos singulares quedan (la primera) para no romper a quien los lee.
- **Pantallas**: card de Ministerio de Mi camino (lista de membresías), Perfil del backoffice (lista),
  detalle de Postulación del backoffice (diálogo "¿Lo suma o reemplaza a …?").
- **Tests**: unit de `decisionAlAprobar` y `estadoMiMinisterio`; integración de aprobar (sumar,
  reemplazar, tercero sin elegir, mismo Ministerio, carrera); e2e del backoffice (diálogo) y de Mi
  camino (dos membresías).

## Entrega 2 — elección (D239, D240, D242)

- **Modelo**: `Grupo.eleccionAbierta`; `EleccionMinisterio` (una por Inscripción de VS) y
  `OpcionEleccionMinisterio` (ver data-model.md). Fila nueva en la vista `solicitudes_bandeja` (tipo
  `eleccion_ministerio`, abierta = `charla_hecha` con opciones sin resolver).
- **Regla**: `validarEleccionMinisterio` (shared-types), la usan API, web y backoffice.
- **API**:
  - Admin: `PUT /grupos/vida-de-servicio/:id/eleccion-abierta`; `GET /elecciones-ministerio/:id`;
    `POST /elecciones-ministerio/:id/opciones/:opcionId/confirmar` (usa `decidirMembresia`) y
    `.../descartar`.
  - Persona: `GET /elecciones-ministerio/me` (lo que la app ya sabe + catálogo + su elección) y
    `PUT /elecciones-ministerio/me`.
  - Líder de VS: `GET /vida-de-servicio/mis-grupos/:grupoId/elecciones`, `GET` y `PUT .../:personaId`
    (elección + notas) y `POST .../:personaId/charla-hecha`, con `grupoDelLiderOFallar`.
  - Avisos: `ministerio.eleccion_abierta` (a cada inscripta), `ministerio.eleccion_lista` (al Admin) y
    `ministerio.eleccion_confirmada` (a la persona, importante).
  - Finalizar la edición cierra la elección (`eleccionAbierta = false`); dar de baja una inscripción
    cancela su elección.
- **Web**: `/mi-camino/ministerios/elegir` (persona), card de Ministerio con "Elegir mi ministerio" /
  "Elegiste …", y en `mis-grupos/[grupoId]/elecciones` la lista y el detalle del líder.
- **Backoffice**: botón en el detalle de la edición, detalle `solicitudes/eleccion_ministerio/[id]`,
  ruta e ícono de la bandeja, pendiente del Inicio.
- **Tests**: unit de la regla; integración (abrir, elegir, límite, notas invisibles para la persona y el
  Pastor, líder ajeno 404, confirmar requiere apta, confirmar suma o pide reemplazo); e2e web (persona
  y líder, axe claro/oscuro, `@celular`) y backoffice (abrir y confirmar).

## Entrega 3 — "Ya sirvo" y primera carga (D243)

- `DeclaracionHistorial` de etapa `ministerio` suma opciones (tabla `OpcionDeclaracionMinisterio`,
  mismo shape) y `desdeAnio`. Confirmar cada opción usa `decidirMembresia` y, al confirmar la primera,
  la CompletitudManual de la etapa (D153); casilla "También hizo Vida de Servicio".
- `POST /ministerios/:id/miembros` (Admin): membresía directa con `creadoPorId`.
- Web: el "Ya lo hice" de Ministerio pasa a "Ya sirvo en un ministerio" con el listado. Backoffice:
  detalle de la declaración con las opciones, y "Agregar personas que ya sirven" en el Ministerio.

## Constitution Check

Spec aprobada (Principio I); una sola regla compartida para el límite y la elección (XI); cuatro
estados, errores por campo, `useEnvio`, tokens, D81 y axe (VIII); notas fuera de logs y avisos (X);
nada se borra (III).
