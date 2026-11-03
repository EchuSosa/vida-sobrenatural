#!/bin/sh
# Arranca la app de la imagen (docs/26). APP lo fija el Dockerfile; PORT lo pone fly.<app>.toml.
# Sin pnpm a propósito: en la imagen final corepack lo volvería a bajar en cada arranque.
set -e
case "$APP" in
  api) cd /repo/apps/api && exec node dist/main ;;
  web|backoffice) cd "/repo/apps/$APP" && exec node_modules/.bin/next start -p "${PORT:-8080}" ;;
  *) echo "APP desconocida: '$APP' (api, web o backoffice)" >&2; exit 1 ;;
esac
