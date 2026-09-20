# Cómo arrancar el entorno para probar

Resumen práctico de los prerrequisitos de los quickstarts. Para el detalle de cada cosa, ver
`specs/001-fase-bienvenida/quickstart.md`, `specs/002-base-transversal/quickstart.md` y
`docs/11-setup-local.md`.

## Una sola vez (ya está hecho)

Los archivos `apps/api/.env`, `apps/web/.env.local` y `apps/backoffice/.env.local` ya tienen las
variables necesarias (base de datos, secretos, credenciales de Google, URLs de la API).

## Cada vez que vas a probar

Desde la raíz del repo:

```bash
docker compose up -d                                    # base de datos
pnpm --filter api run db:migrate                        # migraciones al día
SEED_ADMIN_EMAIL=estersosaa@gmail.com pnpm --filter api run db:seed   # datos de demo + tu rol admin
```

Después, una terminal por app:

```bash
pnpm --filter api start:dev     # API        → http://localhost:3333
pnpm --filter web dev           # app        → http://localhost:3001
pnpm --filter backoffice dev    # backoffice → http://localhost:3002
```

Se prueba entrando a **http://localhost:3001**.

> El seed es idempotente: se puede correr las veces que haga falta. `SEED_ADMIN_EMAIL` con tu email
> real de Google es lo que te da el rol `admin` para entrar al backoffice (H-12).

## Cosas útiles durante las pruebas

```bash
# cerrar sesión (mientras el botón propio no esté verificado)
# → abrir http://localhost:3001/api/auth/signout  (o :3002 para el backoffice)

# ver el estado de las Personas
docker compose exec -T postgres psql -U vidasobrenatural -d vidasobrenatural \
  -c "SELECT email, estado, activo, rol FROM personas;"

# volver a probar el registro desde cero (borra tu Persona; después cerrá sesión)
docker compose exec -T postgres psql -U vidasobrenatural -d vidasobrenatural \
  -c "DELETE FROM personas WHERE email = 'estersosaa@gmail.com';"

# dejar la base sin Sede activa (para el estado "todavía no hay Sede")
docker compose exec -T postgres psql -U vidasobrenatural -d vidasobrenatural \
  -c "UPDATE sedes SET activo = false;"    # y true para volver atrás

# apagar la API a propósito (para probar los estados de error): Ctrl+C en su terminal
```

## Probar con distintos roles y personas

### Tu cuenta de Google con otro rol (única forma en el backoffice)

El rol vive en la columna `rol` de `personas` (un arreglo de textos). Los valores que entienden el
backoffice y la API: `admin`, `discipulador`, `lider_curso`, `pastor` (y `miembro_registrado`).

```bash
# Admin (lo hace el seed con SEED_ADMIN_EMAIL, pero también se puede a mano)
docker compose exec -T postgres psql -U vidasobrenatural -d vidasobrenatural -c \
  "UPDATE personas SET rol = ARRAY['miembro_registrado','admin'] WHERE email = 'estersosaa@gmail.com';"

# Discipulador / Líder de curso / Pastor: mismo comando cambiando el arreglo
#   ARRAY['miembro_registrado','discipulador']
#   ARRAY['miembro_registrado','lider_curso']
#   ARRAY['miembro_registrado','pastor']
# Volver a ser una persona común: ARRAY['miembro_registrado']
```

> **Después de cada cambio hay que cerrar sesión y volver a entrar**: el rol se lee al iniciar
> sesión y queda guardado en la sesión.

### Entrar como otra Persona en la app del usuario (sin gastar cuentas de Google)

`apps/web` tiene un login de prueba, el mismo que usan los e2e. Agregar a `apps/web/.env.local` y
reiniciar esa app:

```
ALLOW_TEST_LOGIN=true
```

No tiene pantalla propia. Con `http://localhost:3001` abierto, en la consola del navegador:

```js
const { csrfToken } = await (await fetch('/api/auth/csrf')).json();
await fetch('/api/auth/callback/test-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo-activa@example.com', csrfToken }),
});
location.href = '/inicio';
```

Cambiando el email se entra como cualquier Persona del seed (`demo-activa@example.com`,
`demo-pendiente-tutor@example.com`, `demo-inactiva@example.com`) o como un email nuevo, para probar
el registro sin usar la cuenta real. Para simular el caso de email no verificado (FR-017), agregar
`emailVerified: 'false'` al cuerpo.

Límites: solo funciona fuera de producción y con la variable activada, y **el backoffice no lo
tiene** — ahí siempre se entra con Google, con el rol que tenga la Persona en la base.

## Al terminar

```bash
docker compose down     # (los datos quedan guardados en el volumen)
```
