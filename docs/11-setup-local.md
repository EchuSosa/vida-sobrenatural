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
# apps/web/.env.local
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3333
```

```bash
pnpm dev   # arranca en localhost:3000
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
# apps/backoffice/.env.local
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3333
```

```bash
pnpm dev   # arranca en localhost:3001
cd ../..
```

> Si `pnpm dev` no respeta la variable `PORT` del `.env.local` (depende de la versión de Next.js), fijarlo directo en el script de `package.json`: `"dev": "next dev -p 3001"`.

## 7. Conectar Prisma al backend (`apps/api`)

```bash
cd apps/api
pnpm add -D prisma
pnpm add @prisma/client
npx prisma init
```

Esto crea `apps/api/prisma/schema.prisma` y un archivo `.env`. Editar el `.env` con:

```
DATABASE_URL="postgresql://vidasobrenatural:vidasobrenatural_dev@localhost:5432/vidasobrenatural?schema=public"
```

Probar la conexión con una migración vacía:

```bash
npx prisma migrate dev --name init
```

Si corre sin errores, la base de datos está conectada y lista.

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

---

**Con esto, recién ahí:** abrir el repo con Claude Code y correr `/speckit.constitution` para escribir la Constitución del proyecto.
