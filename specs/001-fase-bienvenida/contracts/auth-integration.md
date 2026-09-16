# Contract: Integración NextAuth.js ↔ apps/api

Ver `research.md` (Decisión 2) para el razonamiento completo. Este archivo fija el contrato entre
las tres apps.

## Variables de entorno compartidas

| Variable | Dónde vive | Uso |
|---|---|---|
| `NEXTAUTH_SECRET` | `apps/web`, `apps/backoffice`, `apps/api` | Firma/verificación del JWT de sesión (mismo valor en las tres). |
| `INTERNAL_API_SECRET` | `apps/web`, `apps/backoffice`, `apps/api` | Autentica la llamada servidor-a-servidor `GET /personas/by-email` durante el callback de login. Nunca se envía al navegador. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `apps/web`, `apps/backoffice` | Proveedor Google de NextAuth.js. |

## Forma del JWT de sesión (claims mínimos)

```json
{
  "email": "persona@example.com",
  "personaId": "uuid | null",
  "estado": "activa | pendiente_tutor | null",
  "rol": ["miembro_registrado"]
}
```

`personaId`/`estado`/`rol` se completan en el callback `jwt` de NextAuth llamando a
`GET /personas/by-email` (ver `personas-api.md`). Si no existe Persona todavía, quedan en `null`
y el frontend redirige al formulario de registro (`POST /personas`).

## Headers esperados por `apps/api`

- Llamadas de usuario (`GET /sedes`, `POST /personas`, etc. salvo el lookup interno):
  `Authorization: Bearer <jwt de NextAuth>` cuando la ruta lo requiere (ver cada contrato).
- Llamada interna de lookup pre-sesión: `X-Internal-Secret: <INTERNAL_API_SECRET>` — `apps/api`
  rechaza esta ruta si el header no coincide, incluso con un JWT válido de otro tipo.

## Guards en `apps/api`

- `JwtNextAuthStrategy` (Passport): valida `Authorization: Bearer`, expone `req.user` con los
  claims de arriba.
- `RolesGuard`: chequea `req.user.rol` contra los roles requeridos por el endpoint (`admin`,
  `discipulador`) — ver `personas-api.md`/`sedes-api.md` para qué endpoint requiere qué rol.
- `InternalLookupGuard`: valida `X-Internal-Secret` para `GET /personas/by-email` únicamente.

## Fuera de alcance de este contrato

Cómo se asigna el rol `admin`/`discipulador` a una Persona (hoy es un dato de gestión manual /
seed, sin UI — ver `data-model.md`, campo `rol`) no forma parte de esta fase.
