# Contrato: auditoría de cambios de rol (Historia 6)

## `GET /cambios-de-rol?personaId=...`

**Uso**: FR-022/FR-023 — consultar quién otorgó o quitó un rol, y cuándo.

**Request**: `personaId` opcional (si se omite, lista general paginada — H-42); paginado siempre.

**Response**: lista de `{ personaId, rol, accion, realizadoPorId, createdAt }`, ordenada por
`createdAt` descendente. Requiere el mismo permiso que gestionar roles
(`personas.gestionar_roles`) — no hay una pantalla de auditoría separada con su propio permiso,
según spec.md no se pidió esa granularidad.

**Sin escritura directa**: no existe `POST`/`PATCH`/`DELETE` sobre este recurso — las filas se
crean únicamente como efecto de `POST /personas/:id/roles` y `DELETE /personas/:id/roles/:rol`
(contracts/roles-personas-api.md), nunca por una llamada propia.
