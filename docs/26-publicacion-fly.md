# 26 — Publicación en Fly.io

Ítem 3 del plan (D259). Todo lo de este documento está **preparado y sin usar**: el workflow no
publica nada hasta que exista la variable `FLY_HABILITADO = true` (paso 6), y Echu avisa cuándo
(2026-11-02: "No avances con el deploy real hasta que te avise").

## Qué se publica

| App | Archivo | Nombre en Fly | URL |
|---|---|---|---|
| API (NestJS) | `fly.api.toml` | `vida-sobrenatural-api` | `https://vida-sobrenatural-api.fly.dev` |
| Web app | `fly.web.toml` | `vida-sobrenatural-web` | `https://vida-sobrenatural-web.fly.dev` |
| Backoffice | `fly.backoffice.toml` | `vida-sobrenatural-backoffice` | `https://vida-sobrenatural-backoffice.fly.dev` |

- Región `gru` (São Paulo), la más cercana a La Plata (docs/13).
- HTTPS automático en los subdominios `*.fly.dev` (`force_https`); el dominio propio viene después
  (D85).
- Una sola imagen (`Dockerfile` de la raíz, `--build-arg APP=…`); arranca con
  `scripts/fly/arrancar.sh`.
- La API corre las migraciones antes de cada versión (`release_command`), guarda los archivos en un
  volumen (`/data`) y queda siempre prendida (las tareas programadas la necesitan). La web y el
  backoffice se apagan solos sin tráfico y se prenden con el primer pedido.
- **Si un nombre ya está tomado en Fly**, se cambia en `app = …` de su `fly.<app>.toml` y en las
  URLs de los otros dos archivos (están escritas una vez por archivo).

## Pasos (en orden)

1. **Cuenta y token (Echu).** Crear la cuenta en fly.io y un token de deploy:
   `fly tokens create org --name github-vida-sobrenatural`.
2. **Crear las tres apps y el volumen** (una vez, desde la raíz del repo):
   ```bash
   fly apps create vida-sobrenatural-api
   fly apps create vida-sobrenatural-web
   fly apps create vida-sobrenatural-backoffice
   fly volumes create almacenamiento --app vida-sobrenatural-api --region gru --size 1
   ```
3. **Base de datos.** `fly mpg create --name vida-sobrenatural-db --region gru` y después
   `fly mpg attach <id> --app vida-sobrenatural-api`, que carga el secreto `DATABASE_URL` en la API.
   Si Managed Postgres no está disponible en `gru` al momento de crearla, usar la región más
   cercana que lo ofrezca (la latencia API ↔ base importa más que la de la persona).
4. **Google (Echu, en Google Cloud Console).** En el cliente OAuth, agregar como URIs de
   redirección autorizadas:
   `https://vida-sobrenatural-web.fly.dev/api/auth/callback/google` y
   `https://vida-sobrenatural-backoffice.fly.dev/api/auth/callback/google`.
5. **Email.** Un proveedor SMTP (candidato Resend, D140) con el remitente verificado.
6. **GitHub.** Cargar los secretos de la tabla de abajo (Settings → Secrets and variables →
   Actions) y crear el entorno `produccion`. Recién cuando Echu lo decida: crear la **variable**
   `FLY_HABILITADO` con el valor `true`.
7. **Publicar.** Actions → "Publicar en Fly.io" → Run workflow → `todo`. Publica la API (con sus
   migraciones) y después la web y el backoffice.
8. **Datos de demo y Admin** (una vez, con datos ficticios, nunca reales):
   ```bash
   fly ssh console --app vida-sobrenatural-api -C "sh -c 'cd /repo/apps/api && node_modules/.bin/prisma db seed && node_modules/.bin/tsx prisma/seed-demo.ts'"
   fly ssh console --app vida-sobrenatural-api -C "sh -c 'cd /repo/apps/api && node_modules/.bin/tsx scripts/recrear-admin.ts --email <email de Echu> --nombre … --apellido …'"
   ```
   (`recrear-admin` está en `docs/21-instalacion.md`.)

## Secretos de GitHub

| Secreto | Para | Cómo se genera / de dónde sale |
|---|---|---|
| `FLY_API_TOKEN` | el workflow | paso 1 |
| `NEXTAUTH_SECRET` | las tres apps (el **mismo** valor) | `openssl rand -base64 32` |
| `INTERNAL_API_SECRET` | las tres apps (el **mismo** valor) | `openssl rand -base64 32` |
| `CODIGO_INGRESO_SECRET` | API | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | web y backoffice | cliente OAuth de Google (paso 4) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SEGURO` | API | proveedor de email (paso 5) |
| `EMAIL_REMITENTE` | API | ej. `Vida Sobrenatural <no-responder@…>` |
| `EMAIL_COMENTARIOS_DESTINO` | API | a quién llegan los comentarios de la app |
| `SENTRY_DSN_API`, `SENTRY_DSN_WEB`, `SENTRY_DSN_BACKOFFICE` | opcionales | Sentry (D101); si no están, no se carga nada |

Variable (no secreto): `FLY_HABILITADO = true`, solo cuando se quiera publicar.

`DATABASE_URL` no va en GitHub: la carga `fly mpg attach` (paso 3). Las URLs públicas y
`NEXT_PUBLIC_*` no son secretas: están en los `fly.<app>.toml`.

## Antes de usarla con personas reales

Publicar con **datos de demo** está bien para mostrarla. Antes de cargar personas reales falta:

- docs/25: S-02 (roles desde la base, PR aparte), S-04 (cabeceras de seguridad y HSTS), S-06 (la IP
  real detrás del proxy de Fly: `fly-client-ip`), S-08 (CORS con las URLs de arriba).
- `docs/06`: Política de Privacidad, consentimiento de menores, backups y prueba de restauración.

## Cómo se probó (2026-11-02)

En el contenedor de desarrollo, con Docker: se construyeron las imágenes de la API y la web, la API
arrancó contra Postgres y respondió (`/`, `/sedes`), `prisma migrate deploy` corrió desde la imagen,
y la web, apuntando a esa API, respondió `/`, `/ingresar` y `/favicon.ico`, con las cabeceras de
producción (`no-store`). La imagen del backoffice compiló entera (`next build` adentro de la
imagen); no llegó a arrancarse porque se llenó el disco del contenedor de pruebas. No se probó
contra Fly (no hay cuenta todavía). Las imágenes pesan ~2 GB (llevan el monorepo entero):
alcanza para empezar; achicarlas (`next` standalone, `pnpm deploy`) queda para después.
