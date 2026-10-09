# Cómo arrancar el entorno para probar

Resumen práctico de los prerrequisitos de los quickstarts. Para el detalle de cada cosa, ver
`specs/001-fase-bienvenida/quickstart.md`, `specs/002-base-transversal/quickstart.md` y
`docs/11-setup-local.md`.

## Una sola vez (ya está hecho)

Los archivos `apps/api/.env`, `apps/web/.env.local` y `apps/backoffice/.env.local` ya tienen las
variables necesarias (base de datos, secretos, credenciales de Google, URLs de la API).

**Lote 0 global (specs 006–013), variables nuevas** — copialas de los `.env*.example` si tu
archivo es anterior:

- `apps/api/.env`: `SMTP_HOST="localhost"`, `SMTP_PORT=1025`, `EMAIL_REMITENTE`,
  `CODIGO_INGRESO_SECRET`, `WEB_URL="http://localhost:3001"`, `TAREAS_PROGRAMADAS="true"`.
  **Sin `SMTP_HOST` la API no arranca** (D140). `apps/api/.env.test` y `.env.e2e` también las
  llevan (con `TAREAS_PROGRAMADAS="false"`).
- `apps/backoffice/.env.local`: `NEXT_PUBLIC_WEB_APP_URL="http://localhost:3001"` (enlaces y QR a
  la web app).

## Cada vez que vas a probar

Desde la raíz del repo:

```bash
docker compose up -d                                    # base de datos y Mailpit (emails en http://localhost:8025)
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

### Probar desde el celular u otra compu (misma red wifi)

En vez de las tres terminales, una sola:

```bash
pnpm dev:red
```

Detecta la IP de esta compu en el wifi, levanta la API, la web app y el backoffice con esa IP y
muestra las direcciones para abrir desde el celular u otra compu (por ejemplo
`http://192.168.0.15:3001`). Si elige mal la IP: `IP=192.168.0.15 pnpm dev:red`.

- Los `.env` no se tocan; en esta compu sigue andando `localhost`.
- **Google no funciona desde la IP** (solo acepta las direcciones registradas): entrá con
  `/dev/entrar` o con el código por email (los mails llegan a Mailpit, `http://<IP>:8025`).
- Si el celular no abre la página: que esté en el mismo wifi (no en datos) y que el firewall de la
  Mac deje entrar conexiones a `node` (Ajustes del Sistema › Red › Firewall).
- Sugerencia para probar roles a la vez: Admin y Pastor en perfiles distintos de Chrome en la
  compu; la Persona y el Discipulador en el celular.

> El seed es idempotente: se puede correr las veces que haga falta. `SEED_ADMIN_EMAIL` con tu email
> real de Google es lo que te da el rol `admin` para entrar al backoffice (H-12).

### Entrar con un código por email (spec 007)

En las dos apps, además de Google, se puede entrar con **cualquier email** (Hotmail, Yahoo…): en
<http://localhost:3001/ingresar> (o en la pantalla sin sesión del backoffice) escribí el email y tocá
"Enviarme el código". El mail no sale a internet: lo atrapa **Mailpit**. Abrí
<http://localhost:8025>, buscá el mail "Tu código para entrar: …" y escribí esos 6 números. Vale 15
minutos y sirve una sola vez; se pueden pedir hasta 5 por hora para el mismo email.

Para probar como otra Persona sin Google, alcanza con su email: el código llega a Mailpit igual.

### Avisos y mails de avisos (spec 012)

- La pestaña **Avisos** de la app (<http://localhost:3001/avisos>) muestra los avisos de la Persona;
  el seed demo (`db:seed-demo`) le deja ~25 a la primera Persona Admin (o a la primera Persona, si
  todavía nadie es Admin), leídos y sin leer, para ver el paginado.
- Los **mails de avisos importantes** salen solos con la API levantada (`TAREAS_PROGRAMADAS="true"`,
  cada 30 s, y apenas se confirma la acción) y caen en **Mailpit** (<http://localhost:8025>), igual
  que el código de ingreso. Sin Mailpit levantado quedan para reintentar (1 min, 10 min, 1 h, 6 h) y
  al quinto fallo aparecen en el backoffice, en Notificaciones → "Mails que no salieron".
- Correr una tarea a mano, contra la base de `DATABASE_URL`:

  ```bash
  pnpm --filter api run tareas:correr emails         # manda los mails pendientes que ya vencieron
  pnpm --filter api run tareas:correr recordatorios  # recordatorios de Eventos de hoy (8 de la mañana)
  ```

- **Mandar un aviso** desde el backoffice: Notificaciones → "Enviar un aviso" (solo Admin).

### Datos de demostración (D120) — los que usa el manual de pruebas

`db:seed` (arriba) es el mínimo para que la app arranque y para los tests — rápido, sin volumen.
Para recorrer la app con datos (y para seguir [`docs/23-manual-de-pruebas.md`](../../docs/23-manual-de-pruebas.md)),
corré **encima** ese segundo seed:

```bash
pnpm --filter api run db:seed-demo
```

**Conviene cargarlo sobre una base nueva**, para que la historia quede completa y en orden
(sobre una base con datos viejos agrega lo que falta, pero no reacomoda lo que ya estaba):

```bash
docker compose down -v && docker compose up -d
pnpm --filter api exec prisma migrate deploy
SEED_ADMIN_EMAIL=estersosaa@gmail.com pnpm --filter api run db:seed
pnpm --filter api run db:seed-demo
```

Es idempotente: correrlo dos veces no duplica nada. Todas las personas son **ficticias** y sus
emails empiezan con `demo-` y terminan en `@example.com` (`db:limpiar-e2e` no las toca).

Qué deja, para que ninguna pantalla quede vacía:

- **Una historia completa** (`prisma/seed-demo/historia-demo.ts`): un Admin y un Pastor de demo;
  cuatro Discipuladores con agenda y distinta carga (Laura sin nadie y con una propuesta esperando,
  Marcela con un grupo lleno de dos, Jorge con tres en curso y uno terminado, Pablo de vacaciones);
  la bandeja de Vida Nueva en cada estado (pendiente, con una propuesta declinada, propuesta sin
  respuesta hace 5 días, aprobada, rechazada y retirada); grupos con encuentros y un pedido de dar
  por terminado; un menor de 14 con su tutora; una persona sin email cargada por el Admin con su
  pedido de Vida Nueva; y comentarios de "Contanos qué te parece" sin revisar y revisados.
- **Lo de cada spec** (`prisma/seed-demo/<spec>.ts`): ~200 personas en tres Sedes (una inactiva y
  una en la papelera), personas en cada estado de Mi camino y del "Ya lo hice", ediciones de Vida
  de Servicio (en curso con la inscripción abierta, y terminada), postulaciones a Ministerios en
  cada estado (una pendiente a uno que requiere formación), pedidos de bautismo en cada estado con
  tres Eventos de bautismo (próximo, pasado sin confirmar y pasado), Eventos con inscriptos, uno
  lleno con lista de espera y un campamento con pagos para verificar, avisos leídos y sin leer
  (sobre todo para el Admin de demo), cumpleaños hoy y mañana, menores pendientes de tutor y datos
  "hostiles" (nombres larguísimos, tildes, sin teléfono…).

El Inicio del backoffice muestra números en todos los bloques: lo que espera respuesta por tipo,
los pendientes (propuesta declinada, sin respuesta, discipulado para terminar, bajas, bautismos,
postulaciones, inscripciones y pagos), cumpleaños de la semana y las métricas.

#### Con quién entrar por `/dev/entrar` para cada rol

| Rol | Email | Quién es |
|---|---|---|
| Admin | `demo-admin@example.com` | Mónica Cabrera (backoffice y app) |
| Pastor | `demo-pastor@example.com` | Roberto Medina (backoffice, solo lectura) |
| Discipuladora | `demo-disc-laura@example.com` | Laura Gómez: martes y jueves, una propuesta esperando |
| Discipuladora | `demo-disc-marcela@example.com` | Marcela Ruiz: grupo de dos con encuentros |
| Discipulador | `demo-disc-jorge@example.com` | Jorge Acosta: tres en curso (uno es menor), un pedido de terminar |
| Discipulador | `demo-disc-pablo@example.com` | Pablo Herrera: de vacaciones, no aparece en el cruce |
| Líder de curso | `demo-vs-lider-1@example.com` | Lidera la edición de Vida de Servicio en curso |
| Miembro recién registrada | `demo-nueva@example.com` | Florencia Arias: no empezó nada |
| Miembro con Vida Nueva pedida | `demo-vn-pendiente@example.com` | Sofía Molina |
| Miembro haciendo Vida Nueva | `demo-vn-en-curso@example.com` | Agustina Paz, con Marcela |
| Miembro que terminó Vida Nueva | `demo-vn-terminada@example.com` | Emanuel Ortiz: puede pedir Vida de Servicio |
| Miembro haciendo Vida de Servicio | `demo-vs-activa-1@example.com` | |
| Miembro apta para un Ministerio | `demo-apta@example.com` | |
| Miembro de un Ministerio | `demo-miembro@example.com` | |
| Bautismo pedido / con fecha | `demo-bautismo-revision@example.com` / `demo-bautismo-fecha-1@example.com` | |
| Tutora y menor | `demo-tutora-silvina@example.com` / `demo-menor-tomas@example.com` | Silvina y Tomás Ledesma (14) |
| Menor sin tutor (no entra) | `demo-pendiente-tutor@example.com` | Para activarlo desde Pendientes tutor |

La lista completa, con qué probar con cada una, está en el manual (`docs/23`, sección 2.2).

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

Botones rápidos: las personas de demo de la tabla de arriba (Admin, Pastor, Laura, Jorge, la
Líder de curso, Florencia, Sofía, Agustina, la apta para Ministerio y la tutora). Existen si
corriste `db:seed-demo`; si no, entrar con una arranca su registro. También sirve cualquier email
del seed o uno nuevo (para probar el registro desde cero).

El rol se lee al entrar: si le cambiaste el rol en la base, volvé a entrar por `/dev/entrar`.

## Al terminar

```bash
docker compose down     # (los datos quedan guardados en el volumen)
```
