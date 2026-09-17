# Contract: Personas API — cambios de este spec

Extiende `specs/001-fase-bienvenida/contracts/personas-api.md` (no lo reemplaza). Los endpoints ya
existentes ahí (`GET /personas/by-email`, `POST /personas`, `GET /personas/pendientes-tutor`,
`PATCH /personas/:id/activar`, `PATCH /personas/:id/marcar-inactiva`) no cambian su contrato de
entrada/salida en este spec, salvo lo indicado abajo. Ver `contracts/errores.md` para el formato de
error que ahora aplica a **todos** ellos.

## GET /personas/by-email (cambio)

Suma `temaPreferido` a la respuesta 200 existente, para que el callback `jwt` de NextAuth (D95,
`research.md` Decisión 3) pueda embeber la preferencia de tema en la sesión sin una llamada extra:

```json
{ "id": "uuid", "estado": "activa", "activo": true, "rol": ["miembro_registrado"], "temaPreferido": "sistema" }
```

## GET /personas/me (nuevo)

Perfil de la propia Persona autenticada — Historia 5 (Perfil) y base para futuras pantallas de
Perfil con más datos.

- **Auth**: sesión NextAuth válida (JWT de usuario, `JwtNextAuthGuard`). Se resuelve por
  `request.user.personaId` del token — **nunca** por un `:id` en la URL (autorización por registro,
  Constitución Principio V): no existe forma de pedir el perfil de otra Persona por este endpoint.
- **Response 200**:
  ```json
  {
    "id": "uuid",
    "nombre": "string",
    "apellido": "string",
    "email": "string",
    "fotoUrl": "string | null",
    "sedeId": "uuid",
    "estado": "activa",
    "idiomaPreferido": "es",
    "temaPreferido": "sistema"
  }
  ```
- **Response 404**: el token es válido pero `personaId` es `null` (login exitoso sin registro
  completado todavía) o no corresponde a ninguna Persona existente.

## PATCH /personas/me/preferencias (nuevo)

Cambiar la preferencia de tema — Historia 5 (FR-027, FR-028).

- **Auth**: igual que `GET /personas/me` (resuelve por `request.user.personaId`, autorización por
  registro).
- **Request body**:
  ```json
  { "temaPreferido": "claro" }
  ```
  (`"claro" | "oscuro" | "sistema"`, `@IsEnum`). `idiomaPreferido` no es editable por este endpoint
  en este spec (no hay selector de idioma todavía, ver Assumptions del spec).
- **Response 200**: `{ "id": "uuid", "temaPreferido": "claro" }`.
- **Response 404**: igual que `GET /personas/me`.
- **Response 400**: `temaPreferido` fuera del enum (`code: VALIDACION`).
