# Setup local — antes de la Constitución

> Seguir en orden. Cada paso asume que el anterior ya funciona.

## 1. Prerequisitos

Verificar qué ya tenés instalado:

```bash
node -v      # necesitás Node.js LTS (18+ o 20+)
git --version
docker --version
```

Si falta `uv` (necesario para Spec Kit):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

(En Windows, ver instrucciones en https://github.com/astral-sh/uv)

## 2. Crear el repositorio

```bash
mkdir vida-sobrenatural-app
cd vida-sobrenatural-app
git init
echo "# Iglesia Vida Sobrenatural — App de Gestión" > README.md
git add README.md
git commit -m "Initial commit"
```

## 3. Levantar PostgreSQL con Docker Compose

Copiar el archivo `docker-compose.yml` (compartido aparte) a la raíz del repo. Después:

```bash
docker compose up -d
```

Verificar que quedó corriendo:

```bash
docker compose ps
```

Datos de conexión (ya configurados en el `docker-compose.yml`):
- Host: `localhost`
- Puerto: `5432`
- Usuario: `vidasobrenatural`
- Contraseña: `vidasobrenatural_dev`
- Base de datos: `vidasobrenatural`

> Estas credenciales son solo para desarrollo local — no se usan en producción.

## 4. Instalar y arrancar Spec Kit

```bash
uv tool install specify-cli
```

Dentro de la carpeta del repo:

```bash
specify init . --integration claude
```

Esto genera los archivos de comandos (`/speckit.*`) que Claude Code va a poder usar dentro de este repo.

## 5. Instalar pnpm y armar el monorepo

```bash
npm install -g pnpm
```

Crear la estructura de carpetas:

```bash
mkdir -p apps packages
```

Crear `pnpm-workspace.yaml` en la raíz del repo:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Instalar Turborepo:

```bash
pnpm add -D turbo -w
```

## 6. Armar las tres apps dentro del monorepo

**Backend (NestJS):**

```bash
cd apps
npx @nestjs/cli new api --package-manager pnpm
cd api
```

Abrir `src/main.ts` y fijar el puerto (reemplazar `process.env.PORT ?? 3000` por `3333`, o crear un `.env` con `PORT=3333` si el scaffold ya lee `process.env.PORT`):

```
# apps/api/.env
PORT=3333
```

```bash
pnpm run start:dev   # confirmar que arranca en localhost:3333
cd ../..
```

**App web (Next.js, la que usan las Personas):**

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind
cd web
```

Crear `.env.local`:

```
# apps/web/.env.local (copiar de .env.local.example)
NEXTAUTH_URL=http://localhost:3001
API_BASE_URL=http://localhost:3333
NEXT_PUBLIC_API_BASE_URL=http://localhost:3333
```

```bash
pnpm dev   # arranca en localhost:3001
cd ../..
```

**App backoffice (Next.js, la que usa el Admin/Discipuladores/Líderes):**

```bash
cd apps
npx create-next-app@latest backoffice --typescript --tailwind
cd backoffice
```

Crear `.env.local`:

```
# apps/backoffice/.env.local (copiar de .env.local.example)
NEXTAUTH_URL=http://localhost:3002
API_BASE_URL=http://localhost:3333
NEXT_PUBLIC_API_BASE_URL=http://localhost:3333
```

```bash
pnpm dev   # arranca en localhost:3002
cd ../..
```

> Next.js no toma el puerto desde `.env.local`: se fija en los scripts de `package.json` de cada app — `"dev": "next dev -p 3001"` (web) y `"dev": "next dev -p 3002"` (backoffice), y lo mismo en `start`. El 3000 queda libre a propósito (D104).

## 7. Conectar Prisma al backend (`apps/api`)

```bash
cd apps/api
pnpm add -D prisma
pnpm add @prisma/client
npx prisma init
```

Esto crea `apps/api/prisma/schema.prisma` un archivo de configuración y un `.env`. Editar el `.env` con:

```
DATABASE_URL="postgresql://vidasobrenatural:vidasobrenatural_dev@localhost:5432/vidasobrenatural?schema=public"
```

Probar la conexión con una migración vacía:

```bash
npx prisma migrate dev --name init
```

Si corre sin errores, la base de datos está conectada y lista.

> *(actualización 2026-09-18, H-13)*: el archivo de configuración se llama `apps/api/prisma.config.ts`
> (Prisma lo toma automáticamente, sin flags). En el día a día usá los scripts de
> `apps/api/package.json` en vez de `npx prisma ...` directo: `pnpm --filter api run db:migrate`,
> `pnpm --filter api run db:seed`, `pnpm --filter api run db:studio`.

**Admin de demo (H-12):** el seed (`db:seed`) no crea ninguna Persona con rol admin por defecto —
haría falta un email de Google real para poder loguearse como esa Persona, y no tenemos uno fijo
que sirva para todos. En cambio, seteá `SEED_ADMIN_EMAIL` con tu propio email (el que vayas a usar
para entrar a `apps/backoffice` vía Google) antes de correr el seed:

```bash
SEED_ADMIN_EMAIL="tu-email@gmail.com" pnpm --filter api run db:seed
```

Si esa Persona ya existe, el seed solo le agrega el rol `admin`; si no existe, la crea con datos de
ejemplo (igual que las demás Personas demo). Es idempotente — correrlo de nuevo no duplica nada.

> *(actualización 2026-09-23, H-97)*: **`db:seed` no restaura, aunque el nombre lo sugiera.** Es
> idempotente a propósito (cada sección se guarda con `findFirst`/`findUnique` y saltea lo que ya
> existe) — eso lo hace seguro para correr en cualquier momento sin duplicar nada, pero también
> significa que **no repara** un registro que quedó mal después de tocarlo a mano (probar límites
> en un formulario, un dato que se borró, etc.): si ya existe, `db:seed` lo deja como está.
>
> Para volver a un estado conocido de verdad, están estos dos:
>
> ```bash
> pnpm --filter api run db:reset        # borra la base, migra, y corre db:seed — mínimo limpio
> pnpm --filter api run db:reset-demo   # lo mismo, más db:seed-demo encima (D120) — con volumen
> ```
>
> Los dos envuelven `prisma migrate reset --force` (Prisma borra la base y vuelve a migrar) seguido
> de `prisma db seed` explícito — en la versión instalada (Prisma 7.10.0) `migrate reset --force`
> **no** corre solo el seed configurado en `prisma.config.ts` pese a que lo tiene declarado, así que
> hay que encadenarlo a mano; verificado corriendo el comando y viendo la base vacía después.
> **Cuál usar cuándo:**
> - Después de verificar algo a mano y dejar datos raros → `db:reset` (o `db:reset-demo` si
>   necesitás el volumen de nuevo).
> - Para sumar contenido sin perder lo que ya cargaste a mano → `db:seed` / `db:seed-demo`.
> - `db:reset`/`db:reset-demo` son **destructivos**: borran todo lo que haya en la base, incluido
>   lo que no vino del seed. No correrlos sin confirmar contra qué base están apuntando.

**Bases para los tests de integración y los e2e (H-59/H-78, actualización 2026-09-25, H-98):**
`apps/api/.env.test` y `apps/api/.env.e2e` **no se versionan** — mismo criterio que `apps/api/.env`
(`.gitignore` ignora todo `.env.*`, con la excepción de los `.example`) — así que en un clon nuevo
hay que crearlos a mano antes de poder correr esas dos suites:

```bash
cp apps/api/.env.test.example apps/api/.env.test   # antes de: pnpm --filter api run test:e2e
cp apps/api/.env.e2e.example apps/api/.env.e2e     # antes de: los e2e de apps/web y apps/backoffice
```

Ninguno de los dos necesita secretos reales (nunca se usan contra Google real) — los valores de los
`.example` alcanzan tal cual, sin cambiar nada. Cada uno apunta a su propia base
(`vidasobrenatural_test`/`vidasobrenatural_e2e`, D124) — `test/global-setup.cjs` y
`scripts/e2e-base-datos.cjs` las crean y migran solas si no existen; no hace falta armarlas a mano.

## 8. Inicializar shadcn/ui (en `apps/web`, después replicar en `apps/backoffice`)

```bash
cd apps/web
npx shadcn@latest init
cd ../..
```

Repetir en `apps/backoffice`. Los componentes que se vayan usando se copian a cada app (o se centralizan en `packages/ui` más adelante, cuando haya varios compartidos).

## 9. Agregar Swagger a la API

```bash
cd apps/api
pnpm add @nestjs/swagger
cd ../..
```

La configuración (armar el documento Swagger en `main.ts`) se hace cuando empecemos a escribir los primeros endpoints — no hace falta nada más por ahora.

## 10. Commitear el esqueleto

```bash
git add .
git commit -m "Setup inicial: monorepo (web + backoffice + api) con Prisma + Docker Compose + Spec Kit"
```

## 11. Si una corrida de e2e queda "colgada" y bloquea la siguiente

H-110 (revisión manual): cortar una corrida de `pnpm --filter web run test:e2e` o
`pnpm --filter backoffice run test:e2e` con Ctrl-C podía dejar vivos los servidores que Playwright
había levantado (`next dev`, la API) — la corrida siguiente fallaba con algo como
`http://localhost:3334 is already used`. La base de datos de e2e no corre riesgo en ese corte (la
resetea `globalSetup` en cada corrida, D124) — es solo un proceso que quedó escuchando un puerto.

Causa confirmada: los `webServer.command` de `apps/web/playwright.config.ts` y
`apps/backoffice/playwright.config.ts` que encadenan dos comandos con `&&` corrían por debajo de un
shell (`sh -c "A && B"`) que **no** se reemplazaba a sí mismo por `B` — quedaba como padre de `B`, y
al cortar la corrida Playwright mataba ese shell sin que la señal bajara a su hijo. Ya arreglado
(esos comandos usan `exec` antes del segundo paso, para que el shell se reemplace por el proceso
real en vez de quedar de padre) — no debería volver a pasar. Si igual queda algo colgado (por
ejemplo, cortando el proceso de otra forma que no sea Ctrl-C), la salida rápida:

```bash
lsof -ti:3334,3335,3011,3012,3013 | xargs kill
```

Esos son los puertos fijos de e2e — 3334/3011 (`apps/web`), 3335/3012/3013 (`apps/backoffice`, este
último la instancia auxiliar de `apps/web` que usa para crear datos de prueba vía el flujo real de
registro) — distintos de los de desarrollo (3001/3002/3333, D104), así que este comando nunca toca
un servidor de desarrollo que esté corriendo.

---

**Con esto, recién ahí:** abrir el repo con Claude Code y correr `/speckit.constitution` para escribir la Constitución del proyecto.
