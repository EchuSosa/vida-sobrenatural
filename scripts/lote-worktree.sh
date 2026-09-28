#!/usr/bin/env bash
#
# specs/004-vida-nueva-discipulado — arma un `git worktree` para trabajar un
# lote (A–D) de la 004 en paralelo, sin pisar puertos ni bases con los otros.
# Idempotente: se puede correr las veces que haga falta.
#
# Uso:  scripts/lote-worktree.sh <a|b|c|d>
#
# Deja el worktree en .worktrees/lote-<letra>/ sobre la rama 004-lote-<letra>,
# con sus propias bases (vidasobrenatural_<letra>, _test_<letra>, _e2e_<letra>)
# y un E2E_PUERTO_OFFSET (10/20/30/40) en su .env.e2e. Copia los .env* (que
# git ignora), corre migraciones y seed, instala y construye shared-types, y
# copia BRIEF-<LETRA>.md y .claude/ si existen.
set -euo pipefail

LETRA="${1:-}"
case "$LETRA" in
  a) OFFSET=10 ;;
  b) OFFSET=20 ;;
  c) OFFSET=30 ;;
  d) OFFSET=40 ;;
  *) echo "Uso: $0 <a|b|c|d>" >&2; exit 2 ;;
esac

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"
RAMA="004-lote-${LETRA}"
WT="${RAIZ}/.worktrees/lote-${LETRA}"
LETRA_MAY="$(printf '%s' "$LETRA" | tr '[:lower:]' '[:upper:]')"

echo "== lote ${LETRA_MAY}: rama ${RAMA}, worktree ${WT}, offset de puertos ${OFFSET}"

# 1. Rama y worktree (idempotentes).
if ! git show-ref --verify --quiet "refs/heads/${RAMA}"; then
  git branch "${RAMA}" main
  echo "  rama ${RAMA} creada desde main"
fi
if ! git worktree list --porcelain | grep -qF "worktree ${WT}"; then
  git worktree add "${WT}" "${RAMA}"
  echo "  worktree agregado"
else
  echo "  worktree ya existía"
fi

# 2. Copiar los .env* (git los ignora, un worktree nuevo no los tiene) y
#    reescribir el nombre de la base en DATABASE_URL con el sufijo _<letra>.
#    El nombre de la base va entre la última "/" y el "?"/fin — se le agrega
#    "_<letra>" tanto a la de dev como a _test y _e2e.
reescribir_base() {
  # $1 = archivo destino
  perl -i -pe "s{/vidasobrenatural(_test|_e2e)?(\?|\")}{/vidasobrenatural\${1}_${LETRA}\${2}}g" "$1"
}
for rel in apps/api/.env apps/api/.env.test apps/api/.env.e2e apps/web/.env.local apps/backoffice/.env.local; do
  if [ -f "${RAIZ}/${rel}" ]; then
    mkdir -p "$(dirname "${WT}/${rel}")"
    cp "${RAIZ}/${rel}" "${WT}/${rel}"
    reescribir_base "${WT}/${rel}"
    echo "  copiado ${rel}"
  fi
done
# Offset de puertos en el .env.e2e del worktree.
ENV_E2E="${WT}/apps/api/.env.e2e"
if [ -f "${ENV_E2E}" ]; then
  if grep -q '^E2E_PUERTO_OFFSET=' "${ENV_E2E}"; then
    perl -i -pe "s/^E2E_PUERTO_OFFSET=.*/E2E_PUERTO_OFFSET=${OFFSET}/" "${ENV_E2E}"
  else
    printf '\nE2E_PUERTO_OFFSET=%s\n' "${OFFSET}" >> "${ENV_E2E}"
  fi
  echo "  E2E_PUERTO_OFFSET=${OFFSET} en .env.e2e"
fi

# 3. Crear las tres bases en el Postgres de docker compose si faltan.
PGUSER="vidasobrenatural"
crear_base() {
  local db="$1"
  if docker compose exec -T postgres psql -U "${PGUSER}" -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    echo "  base ${db} ya existía"
  else
    docker compose exec -T postgres createdb -U "${PGUSER}" "${db}"
    echo "  base ${db} creada"
  fi
}
crear_base "vidasobrenatural_${LETRA}"
crear_base "vidasobrenatural_test_${LETRA}"
crear_base "vidasobrenatural_e2e_${LETRA}"

# 4. Instalar, construir shared-types, migrar y sembrar la base de DESARROLLO
#    del worktree (la de dev; _test y _e2e las prepara cada suite al correr).
cd "${WT}"
echo "== pnpm install (store compartido, rápido)"
pnpm install --silent
pnpm --filter @vida-sobrenatural/shared-types run build >/dev/null
echo "== migrar y sembrar vidasobrenatural_${LETRA} (base de dev del worktree)"
pnpm --filter api exec prisma migrate deploy >/dev/null
SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-estersosaa@gmail.com}" pnpm --filter api run db:seed >/dev/null
echo "  base de dev lista"

# 5. Copiar el encargo del lote y la skill /brief (sin commitear en la raíz).
if [ -f "${RAIZ}/BRIEF-${LETRA_MAY}.md" ]; then
  cp "${RAIZ}/BRIEF-${LETRA_MAY}.md" "${WT}/BRIEF.md"
  echo "  BRIEF-${LETRA_MAY}.md → BRIEF.md"
fi
if [ -d "${RAIZ}/.claude" ]; then
  mkdir -p "${WT}/.claude"
  cp -R "${RAIZ}/.claude/." "${WT}/.claude/"
  echo "  .claude/ copiado"
fi

echo ""
echo "== listo. Worktree del lote ${LETRA_MAY}:"
echo "   ${WT}"
echo "   Verificá adentro:"
echo "     cd ${WT}"
echo "     pnpm --filter api run test"
echo "     pnpm --filter api run test:e2e"
