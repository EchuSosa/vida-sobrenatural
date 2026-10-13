# Implementation Plan: Líderes de Ministerio

**Branch**: `016-lideres-ministerio` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

## Summary

Una entrega, en un PR, con las tres suites en verde. Copia la forma del líder de Grupo de Extensión
(spec 014, D226): tabla de liderazgos con `desde`/`hasta`, rol que da y quita el sistema, pantalla del
líder en la web app autorizada contra la base.

## Technical Context

Mismo stack. Sin dependencias nuevas.

## Modelo y reglas

- `LiderMinisterio` (ver data-model.md). Rol `lider_ministerio` en `RolDeCargo`, fuera de
  `ROLES_DE_CARGO` (no se asigna a mano). `rol-lider-ministerio.ts` en `apps/api/src/ministerio/`,
  calcado de `grupo-extension/rol-lider.ts`: otorgar (nunca a un menor, D133) y quitar si no lidera
  ningún Ministerio activo, siempre con CambioDeRol.
- Permiso nuevo `mi_ministerio.ver` → `['lider_ministerio']` (D132). La pertenencia la resuelve el
  servicio (`ministerioDelLiderOFallar`: líder vigente de ESE Ministerio, activo y no eliminado → si
  no, 404).
- Inactivar un Ministerio quita el rol a quienes no lideran otro; reactivar lo devuelve. Eliminar
  (papelera) se bloquea si alguna vez tuvo líderes (`MINISTERIO_TIENE_DATOS_RELACIONADOS`, como con
  Postulaciones o Células).

## API

- Admin (`ministerios.gestionar`): `POST /ministerios/:id/lideres` `{ personaId }` → 201
  `LiderMinisterioVista`; 409 `YA_ES_LIDER_DEL_MINISTERIO`, `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`,
  `MINISTERIO_NO_DISPONIBLE`; 404 Persona inexistente o no activa. `DELETE /ministerios/:id/lideres/:personaId`
  → 200 (cierra con `hasta`). Aviso `ministerio.lider_asignado` (normal) a la persona.
- `GET /ministerios` y `GET /ministerios/:id` suman `lideres: PersonaBreve[]` (vigentes).
- `GET /personas/:id` (Perfil del backoffice) suma `lideraMinisterios: { id, nombre }[]`.
- Líder (sesión activa, sin permiso del catálogo, D134): `GET /ministerios/liderados` →
  `MinisterioLiderado[]` (id, nombre, totales) y `GET /ministerios/liderados/:id` →
  `MinisterioLideradoDetalle` (áreas con integrantes y contacto; "Sin área"). Reusa la consulta de
  `miembros` sin paginar y `contactoDe` (se mueve a `common` para no copiar).

## Pantallas

- Backoffice, detalle de Ministerio: sección "Líderes" (lista + "Asignar líder" con `BuscarPersonaGex`
  + "Quitar" con confirmación). Lista de Ministerios: columna "Líderes" ("Sin líder" en texto).
  Perfil: "Líder de: …".
- Web: `/mi-ministerio` (lista si lidera más de uno, o redirige al único) y `/mi-ministerio/[id]`.
  Entrada en `SUBNAV_MI_CAMINO` con `mi_ministerio.ver` y `rutasRelacionadas` en `NAV_APP`.
  Cuatro estados, `@celular`, axe claro/oscuro.

## Tests

- Unit: catálogo de permisos (el rol nuevo), `tienePermiso`.
- Integración: asignar (rol + CambioDeRol + aviso), duplicado 409, menor 409, quitar (rol se va solo
  si no lidera otro), inactivar/reactivar, eliminar bloqueado, `liderados` (líder ajeno 404, sin
  sesión activa 403), contacto presente.
- e2e backoffice: asignar y quitar desde el detalle; columna en la lista. e2e web: el líder ve su
  equipo con contacto; otro usuario 404; axe; `@celular`.

## Constitution Check

Spec aprobada (I); una sola definición de miembro (`miembros.ts`) y de contacto (XI); cuatro estados,
`useEnvio`, tokens, D81, axe (VIII); el líder ve solo contacto y área, no motivaciones ni notas (X);
liderazgos se cierran, no se borran (III).
