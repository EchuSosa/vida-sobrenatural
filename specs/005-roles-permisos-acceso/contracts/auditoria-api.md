# Contrato: auditoría de cambios de rol (Historia 6)

## `GET /cambios-de-rol?personaId=...`

**Uso**: FR-022/FR-023 — consultar quién otorgó o quitó un rol, y cuándo.

**Request**: `personaId` opcional (si se omite, lista general paginada — H-42); paginado siempre.

**Response**: `{ items, total }` (`Pagina<T>`), con items `{ id, personaId, rol, accion, origen,
realizadoPor, createdAt }`, ordenados por `createdAt` descendente. `realizadoPor` es
`{ id, nombre, apellido }` del Admin cuando `origen = backoffice`, y `null` cuando
`origen = recuperacion_cli` (el comando `db:recrear-admin`, corrido por quien tenga acceso al
servidor — la app no puede nombrarlo; la pantalla lo dice así, no como una celda vacía, D98).
*Al implementar (H-140/H-141)*: la versión anterior devolvía `realizadoPorId` a secas y no
contemplaba el camino del CLI. Requiere el mismo permiso que gestionar roles
(`personas.gestionar_roles`) — no hay una pantalla de auditoría separada con su propio permiso,
según spec.md no se pidió esa granularidad.

**Sin escritura directa**: no existe `POST`/`PATCH`/`DELETE` sobre este recurso — las filas se
crean únicamente como efecto de `POST /personas/:id/roles` y `DELETE /personas/:id/roles/:rol`
(contracts/roles-personas-api.md), y de `db:recrear-admin` cuando agrega `admin`, nunca por una
llamada propia. Un pedido idempotente no deja fila.

**Autor obligatorio para cambiar roles desde la app (H-140)**: `POST`/`DELETE
/personas/:id/roles` desde una sesión sin Persona asociada responde 403 `SESION_SIN_PERSONA`
— antes que cualquier otra regla (FR-002, FR-010): sin autor identificable no se puede registrar
el cambio ni aplicar FR-010, así que no se hace.
