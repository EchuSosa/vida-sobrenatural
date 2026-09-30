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
SEED_ADMIN_EMAIL=estersosaa@gmail.com pnpm --filter api run db:seed   # mínimo + tu rol admin
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

### Datos de demostración (D120, opcional)

`db:seed` (arriba) es el mínimo para que la app arranque y para los tests — rápido, sin volumen.
Para ver las pantallas del backoffice con algo parecido a datos reales (listas largas, nombres
verosímiles, casos límite), corré **encima** ese segundo seed:

```bash
pnpm --filter api run db:seed-demo
```

Agrega (sin tocar lo que ya puso `db:seed`): ~200 Personas con nombres argentinos verosímiles,
repartidas entre tres Sedes (agrega Buenos Aires y Rosario, además de La Plata); una Sede inactiva
(Rosario) y una eliminada/papelera (Córdoba); dos menores `pendiente_tutor` — uno con un tutor
encontrable por búsqueda (`demo-tutor-encontrable@example.com`, apellido "Zabala Quintero", que
comparte con el menor) y otro sin tutor registrado, para cargar a mano; y datos hostiles a
propósito, cada uno en su propia Persona (nombre larguísimo, apellido compuesto, tildes y ñ, sin
teléfono, dirección de dos renglones, texto largo en `profesionDetalle`).

Todos los emails llevan el prefijo `demo-` (no `e2e-`: `db:limpiar-e2e` no los toca) y es
idempotente — se puede correr las veces que haga falta sin duplicar nada.

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

## Antes de correr los tests (una sola vez)

- **`ALLOW_TEST_LOGIN=true`** tiene que estar en el `.env.local` de **las dos** apps
  (`apps/web` y `apps/backoffice`). Sin eso, cualquier e2e que use el login de prueba falla.
  Esos archivos no están en el repositorio, así que hay que ponerlo a mano en cada máquina.

La suite de integración de la API necesita su propia base (`vidasobrenatural_test`), pero ya no
hay que crearla a mano (H-59): `pnpm --filter api run test:e2e` la crea y le corre las
migraciones sola si no existe, antes de la primera corrida.

## Trabajar en varios `git worktree` a la vez (lotes A–D de la 004)

`scripts/lote-worktree.sh <a|b|c|d>` arma un worktree en `.worktrees/lote-<letra>/` con sus
propias bases (`vidasobrenatural_<letra>`, `_test_<letra>`, `_e2e_<letra>`) y un
`E2E_PUERTO_OFFSET` (10/20/30/40) en su `.env.e2e`, para que las cuatro sesiones corran
integración y e2e sin pisarse en puertos ni en base. En el repo principal el offset es 0 y nada
cambia.

## Si tocás `packages/shared-types`

Desde H-33 ese paquete se compila a `dist/` y los tres `dev` lo construyen antes de arrancar
(`predev`). Pero **no se reconstruye solo mientras el servidor está corriendo**: si editás un tipo
o una constante compartida con las apps levantadas, vas a seguir viendo el valor viejo. Corré:

```bash
pnpm --filter @vida-sobrenatural/shared-types run build
```

o dejá `tsc -w` corriendo en ese paquete mientras trabajás ahí. Si algo "no toma" un cambio de
tipos compartidos, esto es lo primero que hay que descartar.

## Chequear que la base está como se espera

Una sola consulta:

```bash
docker compose exec -T postgres psql -U vidasobrenatural -d vidasobrenatural -c \
  "SELECT nombre, direccion, horarios, activo FROM sedes;
   SELECT email, estado, activo, rol FROM personas ORDER BY email;"
```

**Lo esperado después de correr el seed:**

| Sede | Debe decir |
|---|---|
| La Plata | dirección Calle 23 N°1665 e/ 66 y 67, horario domingos 10:30 (+ online), `activo = t` |

| Persona | estado | activo | rol |
|---|---|---|---|
| `demo-activa@example.com` | activa | t | `{miembro_registrado}` |
| `demo-pendiente-tutor@example.com` | pendiente_tutor | t | `{}` |
| `demo-inactiva@example.com` | pendiente_tutor | **f** | `{}` |
| tu email real (si corriste el seed con `SEED_ADMIN_EMAIL`) | activa | t | incluye `admin` |

**Señales de que algo quedó sucio:**

- Aparecen Personas o Sedes con prefijo `e2e-` → las dejaron los tests; borrarlas con
  `pnpm --filter api run db:limpiar-e2e` (H-67: limpia toda entidad con ese prefijo, no solo
  Personas).
- Hay más de una Sede activa, o ninguna → el seed asume una sola; revisar antes de probar
  Historia 1 / Escenario 1.
- Tu Persona no tiene `admin` → correr el seed con `SEED_ADMIN_EMAIL` y **volver a iniciar sesión**.
- La Sede dice "Dirección a confirmar" o "Domingos 10 y 18 hs" → son los valores viejos; volver a
  correr el seed (los corrige, H-09).

## Volver a un estado limpio

```bash
# opción suave: borra lo que dejaron los tests
pnpm --filter api run db:limpiar-e2e

# opción fuerte: borra la base entera y la vuelve a crear desde cero
docker compose down -v
docker compose up -d
pnpm --filter api run db:migrate
SEED_ADMIN_EMAIL=estersosaa@gmail.com pnpm --filter api run db:seed
pnpm --filter api run db:seed-demo   # opcional — si vas a mirar pantallas con volumen
```

> `down -v` borra el volumen: se pierden todas las Personas, incluida la tuya y su rol. Es lo que
> conviene hacer antes de una ronda de pruebas completa, para partir siempre del mismo estado.

## Probar con distintos roles y personas

### Darle un rol a una Persona

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

### Entrar como otra Persona sin gastar cuentas de Google: `/dev/entrar` (H-R13)

Las dos apps tienen un login de prueba con pantalla, el mismo proveedor que usan los e2e. Hace
falta `ALLOW_TEST_LOGIN=true` en `apps/web/.env.local` **y** en `apps/backoffice/.env.local`
(reiniciar cada app después de agregarlo). Solo existe fuera de producción: sin la variable, o en
producción, `/dev/entrar` es un 404.

- **App:** http://localhost:3001/dev/entrar — escribís un email (o tocás uno de los botones
  rápidos) y entrás como esa persona. Después va a `/registro`: si ya está registrada, eso la manda
  sola a Primeros pasos; si no, arranca su registro.
- **Backoffice:** http://localhost:3002/dev/entrar — sin sesión, el backoffice muestra su pantalla
  de ingreso en cualquier dirección, y debajo del botón de Google aparece el mismo formulario. Con
  una sesión abierta, `/dev/entrar` sirve para cambiar de persona sin cerrar sesión.

Botones rápidos (las cuentas de la revisión manual de la 004): `demo-vn-persona@example.com`,
`demo-vn-persona-2@example.com`, `demo-vn-disc-1@example.com`, `demo-vn-disc-2@example.com`,
`demo-vn-menor@example.com`. No están sembradas: la primera vez que entrás con una, la registrás
en la app (y le das el rol con el comando de arriba si hace falta). También sirve cualquier email
del seed (`demo-activa@example.com`, …) o uno nuevo.

El rol se lee al entrar: si le cambiaste el rol en la base, volvé a entrar por `/dev/entrar`.

## Al terminar

```bash
docker compose down     # (los datos quedan guardados en el volumen)
```
