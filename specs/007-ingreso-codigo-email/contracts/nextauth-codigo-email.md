# Contrato: proveedor `codigo-email` de NextAuth y pantallas de ingreso

Vale para `apps/web` y `apps/backoffice`. Lo que es igual en las dos vive en `packages/ui` y
`packages/shared-types`; lo que difiere a propósito queda en el `auth.ts` de cada app (H-41).

## Proveedor

```ts
Credentials({
  id: 'codigo-email',
  credentials: { email: {}, codigo: {} },
  authorize: async (credentials) => { … },
})
```

Se registra **siempre**, también en producción (a diferencia de `test-login`).

`authorize()`:

1. Normaliza el email y llama a `POST /auth/codigo-ingreso/verificaciones`.
2. `200` → devuelve `{ id: email, email, name: null, emailVerificadoPorProveedor: true }`.
3. `422` → lanza una subclase de `CredentialsSignin` con `code` igual al `ErrorCode` recibido
   (`CODIGO_INCORRECTO`, `CODIGO_SIN_INTENTOS`, `CODIGO_VENCIDO`).
4. Cualquier otra respuesta, o la API sin responder → lanza un `Error` común. Auth.js lo trata como
   error de configuración y manda a `pages.error`: la pantalla de error de verificación en la web
   (D88). Fail-closed (FR-015).

Desde ahí, los callbacks `signIn`, `jwt` y `session` **no cambian**: la Persona se resuelve por email
igual que con Google. `givenName`, `familyName` e `image` quedan en `null` (el registro de la web
los pide vacíos).

## Sesión

| App | `maxAge` | `updateAge` |
|---|---|---|
| `apps/web` | `DURACION_SESION_WEB_S` (30 días) | 1 día |
| `apps/backoffice` | `DURACION_SESION_BACKOFFICE_S` (7 días) | 1 día |

Mismo valor para Google y para código (FR-016).

## Acciones de servidor (una por app)

| Acción | Entrada | Hace | Devuelve al formulario |
|---|---|---|---|
| `pedirCodigo` | `email` | Llama a `POST /auth/codigo-ingreso/pedidos` con `X-Origen-Cliente`. En la web guarda el email en una cookie `httpOnly` de 15 minutos. | `{ ok: true }` o `{ errores: [{ campo, code }], reintentarEn? }` |
| `verificarCodigo` | `email`, `codigo`, `destino` | `signIn('codigo-email', { email, codigo, redirect: false })`. Si sale bien, redirige a `destino`. | `{ errores: [{ campo: 'codigo', code }] }` si `CredentialsSignin` |

`destino`: en la web, `/ingresar` (que resuelve activa / pendiente_tutor / sin Persona, H-85); en el
backoffice, la ruta en la que estaba la persona.

## Pantalla de ingreso (FR-001, clarify)

Orden, igual en las dos apps:

1. `BotonIngresarGoogle` (variante contorno): "Entrar con Google".
2. Separador con el texto "o".
3. `FormularioIngresoCodigo`, paso email: campo "Tu email" y botón principal "Enviarme el código".
4. `FormularioIngresoCodigo`, paso código: "Te mandamos un código a {email}. Vale por 15 minutos."
   Campo "Código" (`inputMode="numeric"`, `autoComplete="one-time-code"`), botón principal
   "Entrar", y dos acciones de texto: "Enviarme otro código" y "Usar otro email".

`FormularioIngresoCodigo` (en `packages/ui`) recibe `pedirCodigo`, `verificarCodigo`, los textos
ya traducidos y el paso inicial. Usa `useEnvio` y `Button` (H-57), `MensajeErrorCampo` y
`ResumenErrores` (H-50). Al pasar al paso del código, mueve el foco al título del paso.

| Ruta | App | Sin sesión | Con sesión |
|---|---|---|---|
| `/ingresar` | web | Pantalla de ingreso, paso email | Redirige según estado (H-85, sin cambios) |
| `/ingresar/codigo` | web | Paso código (sin la cookie del email, vuelve a `/ingresar`) | Igual que `/ingresar` |
| `/registro` | web | Redirige a `/ingresar` | Sin cambios |
| cualquier ruta | backoffice | `PantallaSinSesion` con Google + formulario (los dos pasos en la misma pantalla) | Sin cambios |

`pages.signIn` de la web pasa a `/ingresar`. El ítem "Ingresar" del menú público
(`apps/web/src/config/nav-publica.ts`) apunta a `/ingresar`.

## Mensajes por código de error (`next-intl`)

| `code` | Mensaje (debajo del campo y en el resumen) |
|---|---|
| `EMAIL_INVALIDO` | "Escribí un email completo, por ejemplo nombre@hotmail.com." |
| `DEMASIADOS_PEDIDOS` | "Pediste muchos códigos seguidos. Probá de nuevo en {minutos} minutos." |
| `ENVIO_EMAIL_FALLIDO` | "No pudimos mandarte el mail. Probá de nuevo en unos minutos." |
| `CODIGO_INCORRECTO` | "Ese código no coincide. Revisá el último mail que te mandamos, o pedí uno nuevo." |
| `CODIGO_SIN_INTENTOS` | "Probaste muchas veces con este código. Pedí uno nuevo con «Enviarme otro código»." |
| `CODIGO_VENCIDO` | "Este código ya no sirve. Pedí uno nuevo con «Enviarme otro código»." |

Los textos finales se revisan con el tono de `docs/15-guia-ux-ui.md` al implementar; lo que no
puede cambiar es que cada uno diga **cómo seguir**.
