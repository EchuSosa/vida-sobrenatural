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

## Al terminar

```bash
docker compose down     # (los datos quedan guardados en el volumen)
```
