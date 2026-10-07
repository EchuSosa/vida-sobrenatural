# Contrato: API de código de ingreso

Dos endpoints **internos**: solo los llaman los servidores de `apps/web` y `apps/backoffice`, con
el header `X-Internal-Secret` (`InternalLookupGuard`, igual que `GET /personas/by-email`,
`specs/001-fase-bienvenida/contracts/auth-integration.md`). Ningún navegador los llama directo.

Errores en formato Problem Details con `code` del catálogo compartido y `errors: [{ campo, code }]`
cuando aplica a un campo (`specs/002-base-transversal/contracts/errores.md`).

## `POST /auth/codigo-ingreso/pedidos`

Pide un código para un email y lo envía por mail.

**Headers**: `X-Internal-Secret` (obligatorio), `X-Origen-Cliente` (obligatorio: IP del navegador,
tomada por el servidor de Next de `x-forwarded-for` o de la conexión).

**Body**:

```json
{ "email": "ana@hotmail.com" }
```

`email`: obligatorio, formato de email, hasta 254 caracteres. Se normaliza antes de todo.

**Respuestas**:

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| `202` | Se envió el código. **Igual para cualquier email**, registrado o no (FR-008). | vacío |
| `400` | Falta el email o no tiene formato de email. | `VALIDACION`, `errors: [{ campo: "email", code: "EMAIL_INVALIDO" }]` |
| `401` | Falta o no coincide `X-Internal-Secret`. | `NO_AUTENTICADO` |
| `429` | Pasó el límite de 5 por hora para ese email o de 30 por hora para ese origen (FR-009). | `DEMASIADOS_PEDIDOS`, `reintentarEn` (segundos), `errors: [{ campo: "email", code: "DEMASIADOS_PEDIDOS" }]` |
| `503` | El envío del mail falló. El pedido no cuenta contra el límite. | `ENVIO_EMAIL_FALLIDO` |

**Efectos** (research.md #5): el código vigente anterior de ese email queda reemplazado (FR-005);
se crea una fila `CodigoIngreso`; se borran las filas con más de 24 horas; se envía el mail con la
plantilla `codigo-ingreso` (`contracts/email-codigo-ingreso.md`).

**Nunca**: consulta si el email pertenece a una Persona; escribe el código o el email en logs;
manda el email a Sentry.

## `POST /auth/codigo-ingreso/verificaciones`

Verifica un código. Si es correcto, lo marca como usado.

**Headers**: `X-Internal-Secret` (obligatorio).

**Body**:

```json
{ "email": "ana@hotmail.com", "codigo": "482 913" }
```

`codigo`: se le quitan espacios y guiones antes de validar; después tienen que quedar exactamente
6 dígitos.

**Respuestas**:

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| `200` | Código correcto. Queda usado. | `{ "email": "ana@hotmail.com" }` (normalizado) |
| `400` | Email o código con formato inválido. | `VALIDACION`, `errors` por campo |
| `401` | Falta o no coincide `X-Internal-Secret`. | `NO_AUTENTICADO` |
| `422` | Código incorrecto y quedan intentos. | `CODIGO_INCORRECTO`, `intentosRestantes`, `errors: [{ campo: "codigo", code: "CODIGO_INCORRECTO" }]` |
| `422` | Código incorrecto y era el quinto intento: el código deja de servir. | `CODIGO_SIN_INTENTOS`, `errors: [{ campo: "codigo", … }]` |
| `422` | No hay código vigente para ese email (vencido, usado, reemplazado, sin intentos o nunca pedido). | `CODIGO_VENCIDO`, `errors: [{ campo: "codigo", … }]` |

La verificación **no** decide si la persona puede entrar: solo dice que el email es suyo. Quién
entra y a dónde lo decide el callback `signIn` de cada app, con las mismas reglas que para Google
(`contracts/nextauth-codigo-email.md`).

## Cambio en `GET /personas/by-email`

El parámetro `email` se normaliza antes de buscar (FR-010). Sin otros cambios de contrato.
