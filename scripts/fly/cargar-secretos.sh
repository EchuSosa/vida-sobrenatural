#!/bin/bash
# docs/26: carga en Fly los secretos de una app, tomados de las variables de entorno del paso (que
# vienen de los secretos de GitHub). Uso: cargar-secretos.sh fly.<app>.toml NOMBRE [NOMBRE…]
# Los que están vacíos (secreto no cargado en GitHub) se saltean, así un secreto opcional (Sentry)
# no pisa con vacío lo que ya hay. Nunca imprime los valores.
set -euo pipefail
config="$1"; shift
app=$(sed -n 's/^app = "\(.*\)"/\1/p' "$config")
[ -n "$app" ] || { echo "No encontré 'app' en $config" >&2; exit 1; }
pares=()
for nombre in "$@"; do
  valor="${!nombre:-}"
  if [ -n "$valor" ]; then pares+=("$nombre=$valor"); else echo "· $nombre vacío: se saltea"; fi
done
[ ${#pares[@]} -gt 0 ] || { echo "Ningún secreto para cargar en $app"; exit 0; }
flyctl secrets set --stage --app "$app" "${pares[@]}" > /dev/null
echo "Cargados en $app: ${#pares[@]} secretos"
