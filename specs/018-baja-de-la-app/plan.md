# Implementation Plan: Baja de la app

**Branch**: `018-baja-de-la-app` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

## Summary

Un solo servicio, `BajaPersonaService.darDeBaja(personaId, autorId, motivoInterno?)`, que corre todo
en una transacción (FR-008) y reusa lo que ya cierra cada cosa (liderazgos, turnos, membresías,
propuestas), con sus avisos. Los archivos se borran después del commit; si falla, quedan en
`ArchivoPendienteDeBorrar` y una tarea diaria los reintenta.

## API

- `POST /personas/me/baja` `{ confirmacion: 'BAJA' }` — la persona (D263).
- `POST /personas/:id/baja` `{ confirmacion: 'BAJA', motivo? }` — permiso `personas.baja` (Admin).
- 400 por campo `confirmacion` (`CONFIRMACION_BAJA_INVALIDA`), 409 `ULTIMO_ADMIN`, 404 si ya está
  dada de baja o no existe.
- Las búsquedas y listados de Personas filtran `dadaDeBajaEn IS NULL`; los selects de "persona
  breve" devuelven el nombre anónimo, que ya está en la fila.

## Pantallas

- Web: Perfil → "Darme de baja de la app" → `/perfil/baja` (explicación, campo BAJA, botón
  destructivo) → `/baja-lista` (fuera de la sesión).
- Backoffice: Perfil de Persona → "Dar de baja de la app" (diálogo destructivo con BAJA y motivo).
- Cuatro estados, `useEnvio`, errores por campo (H-50), D151 (destructivo: rojo + ícono), axe claro
  y oscuro, `@celular`.

## Tests

- Unit: la anonimización (qué campos, qué valores).
- Integración: el barrido de SC-001 (busca nombre, email, teléfono y DNI en cada tabla con texto),
  SC-003 (conteos de otros iguales), SC-004 (error forzado dentro de la transacción no deja nada a
  medias), último Admin, permisos, doble pedido, sesión vieja → 401.
- e2e web: caso feliz + palabra equivocada + API caída + doble toque. e2e backoffice: caso feliz +
  Pastor sin botón + API caída.

## Constitution Check

III (nada se borra a la ligera): la fila queda y se anonimiza; es la excepción explícita por
privacidad (D261). V (privacidad): es el objetivo. X (logs sin datos personales): FR-009.
