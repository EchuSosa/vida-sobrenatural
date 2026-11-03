# Implementation Plan: Turnos de servicio

**Branch**: `017-turnos-servicio` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

## Summary

Tres entregas, un PR cada una, con las tres suites en verde antes de la siguiente:

1. **Modelo + Admin (US1):** tablas, `fechasDeServicio`, "Días de servicio" y cupos en el
   backoffice.
2. **Rol del líder + avisos (US2, US3):** grilla en la web ("Mi ministerio" → "Turnos") y en el
   backoffice, publicar, avisos y recordatorio, tarjeta "Tu próximo turno" en el Inicio.
3. **"No puedo ir" (US4)** y los casos borde (baja de integrante, regla quitada, Ministerio
   inactivo).

## Technical Context

Mismo stack. Sin dependencias nuevas. La tarea diaria del recordatorio va en
`apps/api/src/tareas-programadas`, como `tarea-recordatorios-eventos.ts`.

## Modelo y reglas

- Ver `data-model.md`. Una migración por entrega.
- `fechasDeServicio` en shared-types, con el calendario de Argentina (`diaCivilEnArgentina`), sin
  zona del servidor (la hidratación de fechas de docs/24 fue justo eso).
- Integrantes elegibles: la misma consulta de "Mi ministerio" (spec 016, membresía = Postulación
  aprobada vigente, D170), filtrada por Célula.
- Conteo de "cuántas veces sirvió" (FR-007) en una sola consulta agrupada por persona.
- Aviso de otro Ministerio el mismo día (D255): consulta por `personaId` + `dia` en fechas de otros
  Ministerios; es una advertencia en la respuesta, no un error.

## API

- Permisos nuevos (D132, D253): `turnos.gestionar` → `['admin']`; `turnos.ver` → `['admin',
  'pastor']`. El líder actúa sobre sus Ministerios resolviendo la pertenencia contra la base
  (`ministerioDelLiderOFallar`, spec 016), sin permiso del catálogo.
- Admin: `GET/POST /ministerios/:id/dias-de-servicio`, `DELETE …/:diaId`;
  `PATCH /ministerios/:id/cupo-turno` y `PATCH /celulas/:id/cupo-turno` `{ cupo }` (endpoints propios:
  así el cupo no pasa por la validación del catálogo y su permiso es `turnos.gestionar`);
  `POST /ministerios/:id/fechas/:dia/suspension` y `DELETE` (volver a habilitar).
- Grilla (líder o Admin): `GET /ministerios/:id/turnos?desde=` → próximas fechas con Células,
  cupos, turnos, faltantes y conteos; `POST /ministerios/:id/fechas/:dia/turnos`
  `{ personaId, celulaId? }` (201, con `advertencias`); `DELETE /turnos/:id`;
  `POST /ministerios/:id/fechas/:dia/copiar-anterior`; `POST /ministerios/:id/fechas/:dia/publicacion`.
- Persona: `GET /turnos/me` (publicados, futuros); `POST /turnos/:id/cancelacion` `{ motivo? }`.
- Avisos nuevos en `CATALOGO_AVISOS` (D197, en la transacción): `turno.asignado` (importante),
  `turno.quitado`, `turno.fecha_suspendida`, `turno.recordatorio`, `turno.no_puede` (a los líderes,
  sin el motivo).

## Pantallas

- Backoffice, detalle de Ministerio: "Días de servicio" (reglas + próximas fechas con suspender) y
  cupo por Célula; pestaña "Turnos" con la misma grilla que la web (componente en `packages/ui`,
  Principio XI).
- Web: `/mi-ministerio/[id]/turnos` (grilla; en celular, una fecha por vez), `/mis-turnos`, tarjeta
  "Tu próximo turno" en `/inicio`.
- Cuatro estados (`loading.tsx`, `error.tsx`), `useEnvio`, errores por campo (H-50), `@celular`, axe
  claro/oscuro, tokens de color (D118), estados con texto + ícono (D81). Textos en `next-intl`.

## Tests

- Unit: `fechasDeServicio` (semanal, segundo domingo, último sábado, cambio de mes y de año, en
  Argentina), cupo, conteo.
- Integración: reglas (repetida 409), suspender con avisos, asignar (no integrante 403/404,
  repetido 409, otro Ministerio → advertencia), publicar (avisos una vez), cambio en publicada
  (avisa a los dos), `turnos/me` solo publicados, cancelación (ya empezó 409), permisos (líder ajeno
  404, Pastor solo lee).
- e2e (por historia, caso feliz + error, CLAUDE.md): backoffice US1 (reglas, suspender, cupo
  inválido, API caída, doble envío); web US2 (grilla, publicar, API caída, doble toque en
  Publicar); web US3 (Inicio, API caída en la tarjeta); web US4 ("No puedo ir", doble toque).

## Constitution Check

- I (spec primero): spec 017 con D250–D257. II (nombres): Célula en el modelo, "área" en la
  interfaz como ya la llama la app. III (nada se borra): reglas con `activo`, turnos con estado.
  VIII (cuatro estados): sí. X (privacidad): motivo fuera de logs y avisos. XI (una fuente):
  constantes y `fechasDeServicio` en shared-types, grilla en packages/ui.
