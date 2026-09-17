# Contract: Sedes API (`apps/api`)

Base path: `/sedes`. Documentado también vía Swagger/OpenAPI (`@nestjs/swagger`) una vez
implementados los controllers — este archivo es el contrato de referencia para el frontend
mientras tanto.

## Formato de errores *(actualización 2026-09-17, FR-018, D101)*

Todos los errores de este contrato (401/403/404 descritos abajo) siguen el mismo formato Problem
Details + `code` del catálogo compartido que `personas-api.md` (ver
`specs/002-base-transversal/contracts/errores.md`) — no se define un formato de error propio para
Sede. Los `code` usados por este contrato: `VALIDACION` (400, `CONTACTO_SEDE_REQUERIDO`/
`SEDE_NOMBRE_DUPLICADO` en `errors`), `NO_ENCONTRADO` (404), `SIN_PERMISO` (403),
`NO_AUTENTICADO` (401).

## GET /sedes

Público (sin auth) — Historia 1, FR-002/FR-004.

- **Query params**: ninguno en esta fase (sin paginación — volumen bajo).
- **Response 200**: lista de Sedes con `activo=true` únicamente.
  ```json
  [
    {
      "id": "uuid",
      "nombre": "La Plata",
      "direccion": "...",
      "contactoTelefono": "...",
      "contactoEmail": "...",
      "horarios": "...",
      "descripcionBienvenida": "..."
    }
  ]
  ```
- Si no hay ninguna Sede activa: `200` con `[]` (no es un error — el frontend maneja el caso
  vacío, ver edge case del spec).

## GET /sedes/:id

Público — detalle de una Sede puntual (usado cuando hay más de una Sede y el Visitante ya
identificó la suya).

- **Response 200**: mismo shape que un elemento de la lista anterior.
- **Response 404**: Sede inexistente o `activo=false`.

## POST /sedes

Requiere rol **Admin** (FR-010/FR-011, Historia 3).

- **Request body**:
  ```json
  {
    "nombre": "string (requerido)",
    "direccion": "string (requerido)",
    "contactoTelefono": "string (opcional)",
    "contactoEmail": "string (opcional)",
    "horarios": "string (requerido)",
    "descripcionBienvenida": "string (opcional)"
  }
  ```
  Validación: al menos uno de `contactoTelefono`/`contactoEmail` presente.
- **Response 201**: la Sede creada (mismo shape que GET), con `activo: true`.
- **Response 403**: usuario autenticado sin rol Admin.
- **Response 401**: sin sesión.

## PATCH /sedes/:id

Requiere rol **Admin**. Edición parcial, incluye el toggle de soft delete.

- **Request body**: cualquier subconjunto de los campos de creación, más opcionalmente `"activo": boolean`.
- **Response 200**: la Sede actualizada.
- **Response 403/401**: igual que POST.
- **Response 404**: Sede inexistente.

No existe `DELETE /sedes/:id` — el soft delete se hace vía `PATCH` con `activo: false`
(Principio III de la Constitución).
