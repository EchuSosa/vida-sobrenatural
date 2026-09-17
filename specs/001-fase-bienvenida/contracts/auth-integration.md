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

## Verificación del email del proveedor SSO *(actualización 2026-09-17, FR-017, Constitución Principio V)*

El `profile()` del proveedor Google DEBE capturar también `email_verified` (claim estándar del
perfil OIDC de Google) además de `email`/`given_name`/`family_name`/`picture`. En el callback
`signIn` de NextAuth, **antes** de resolver o crear cualquier Persona:

- Si `email_verified !== true`, el sistema rechaza el inicio de sesión (no llama a
  `GET /personas/by-email`, no deja avanzar al formulario de registro) y redirige a
  `/email-no-verificado`, una pantalla propia y distinta de `/error-verificacion` — este caso no
  es una falla transitoria de `apps/api` (D88/`VERIFICACION_LOGIN_FALLIDA`), es una condición
  determinística del lado del proveedor, así que el mensaje no invita a "reintentar en un
  momento" sino a verificar el email con el proveedor. Código del catálogo compartido:
  `EMAIL_NO_VERIFICADO` (packages/shared-types, D101). Nunca vincula ni crea una Persona con un
  email no verificado, sin importar si ese email ya coincide con una Persona existente.
- Si `email_verified === true`, el flujo sigue igual que hoy (`GET /personas/by-email`, etc.).

En el proveedor `test-login` (E2E, gateado por `ALLOW_TEST_LOGIN`), el email se considera siempre
verificado — ese proveedor reemplaza el login real de Google exclusivamente para poder automatizar
el flujo, no para probar el caso de email no verificado (ver Historia 2, Acceptance Scenario 7,
para el test dedicado a ese caso).

## Fuera de alcance de este contrato

Cómo se asigna el rol `admin`/`discipulador` a una Persona (hoy es un dato de gestión manual /
seed, sin UI — ver `data-model.md`, campo `rol`) no forma parte de esta fase.
