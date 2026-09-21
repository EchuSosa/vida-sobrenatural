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
    "temaPreferido": "sistema",
    "telefono": "string",
    "direccion": "string",
    "estadoCivil": "soltero_a",
    "profesion": "salud",
    "profesionDetalle": "string | null"
  }
  ```
  Los últimos 5 campos se agregan en H-35 (revisión manual ronda 3, Lote 5) — base para el
  self-edit de `PATCH /personas/me` de abajo.
- **Response 404**: el token es válido pero `personaId` es `null` (login exitoso sin registro
  completado todavía) o no corresponde a ninguna Persona existente.

## PATCH /personas/me (nuevo — H-35, Flujo 11)

Self-edit de Perfil (FR-028, FR-029) — cualquier subconjunto de estos 4 campos; nunca
`fechaNacimiento` ni `email` (esos dos requieren un Admin).

- **Auth**: igual que `GET /personas/me`.
- **Request body** (todos opcionales):
  ```json
  {
    "telefono": "+54 9 221 1234567",
    "direccion": "string",
    "estadoCivil": "soltero_a",
    "profesion": "salud",
    "profesionDetalle": "string"
  }
  ```
  `telefono` valida el mismo formato estructurado que el registro (D90). `profesionDetalle` solo se
  exige cuando `profesion` viene como `"otro"` **en esta misma petición**.
- **Response 200**: `{ "id": "uuid", "telefono": "...", "direccion": "...", "estadoCivil": "...", "profesion": "...", "profesionDetalle": "..." | null }`.
- **Response 404**: igual que `GET /personas/me`.
- **Response 400**: `code: VALIDACION` — `telefono` no matchea el formato, o un enum inválido.

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
