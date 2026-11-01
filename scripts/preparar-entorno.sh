#!/usr/bin/env bash
# Deja un entorno de desarrollo listo para correr las tres suites y la app (docs/24, "qué haría
# distinto" #1). Idempotente: se puede correr cuantas veces haga falta. Pensado para el contenedor de
# Claude Code en la nube y para una compu con Postgres instalado (sin Docker). Con Docker, usar
# `docker compose up -d` en lugar del paso 1 (ver specs/revision-manual/COMO-ARRANCAR.md).
#
# Uso: bash scripts/preparar-entorno.sh [--demo]
#   --demo  además siembra los datos de demo del manual de pruebas (docs/23).
set -euo pipefail
cd "$(dirname "$0")/.."

paso() { printf '\n== %s\n' "$*"; }

# 1. Postgres: levantarlo si está instalado y apagado (en el contenedor se cae a veces, docs/24).
paso "Postgres"
if command -v pg_ctlcluster >/dev/null 2>&1; then
  version=$(ls /etc/postgresql 2>/dev/null | sort -n | tail -1)
  if [ -n "$version" ] && ! pg_ctlcluster "$version" main status >/dev/null 2>&1; then
    pg_ctlcluster "$version" main start
  fi
fi
for i in $(seq 1 20); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -h localhost

# Rol y bases (los mismos nombres que los .env de ejemplo). Solo si hay acceso de superusuario local.
if command -v psql >/dev/null 2>&1 && (su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1); then
  su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='vidasobrenatural'\"" | grep -q 1 \
    || su postgres -c "psql -c \"CREATE ROLE vidasobrenatural LOGIN CREATEDB PASSWORD 'vidasobrenatural_dev'\""
  for base in vidasobrenatural vidasobrenatural_test vidasobrenatural_e2e; do
    su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$base'\"" | grep -q 1 \
      || su postgres -c "createdb -O vidasobrenatural $base"
  done
fi

# 2. Archivos .env desde los ejemplos (nunca pisa uno existente). Los secretos de la API y de las dos
#    apps tienen que coincidir: se copian del .env de la API.
paso ".env"
copiar() { [ -f "$2" ] || { cp "$1" "$2"; echo "creado $2"; }; }
copiar apps/api/.env.example apps/api/.env
copiar apps/api/.env.test.example apps/api/.env.test
copiar apps/api/.env.e2e.example apps/api/.env.e2e
for app in web backoffice; do
  destino="apps/$app/.env.local"
  if [ ! -f "$destino" ]; then
    cp "apps/$app/.env.local.example" "$destino"
    for clave in NEXTAUTH_SECRET INTERNAL_API_SECRET; do
      valor=$(grep -E "^$clave=" apps/api/.env | head -1 | cut -d= -f2-)
      [ -n "$valor" ] && sed -i "s|^$clave=.*|$clave=$valor|" "$destino"
    done
    grep -q '^ALLOW_TEST_LOGIN=' "$destino" || echo 'ALLOW_TEST_LOGIN=true' >> "$destino"
    echo "creado $destino"
  fi
done

# 3. Dependencias, cliente de Prisma (Prisma 7 no lo genera al migrar) y tipos compartidos (H-33).
paso "Dependencias, Prisma y tipos compartidos"
[ -d node_modules ] || pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate >/dev/null
pnpm --filter @vida-sobrenatural/shared-types run build >/dev/null

# 4. Migraciones en la base de desarrollo (las de test y e2e las migran sus propias suites).
paso "Migraciones"
pnpm --filter api exec prisma migrate deploy

if [ "${1:-}" = "--demo" ]; then
  paso "Datos mínimos y de demo"
  pnpm --filter api run db:seed
  pnpm --filter api run db:seed-demo
fi

paso "Listo"
echo "API: pnpm --filter api run start:dev (3333) · web: pnpm --filter web dev (3001) · backoffice: pnpm --filter backoffice dev (3002)"
