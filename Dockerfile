# Una imagen por app del monorepo (docs/26): `--build-arg APP=api|web|backoffice`.
# Se construye desde la raíz porque las tres usan packages/shared-types y packages/ui.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=true
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /repo

FROM base AS build
ARG APP
# Las NEXT_PUBLIC_* quedan escritas en el JavaScript del navegador al construir: van como build args
# (están en fly.<app>.toml), no como secretos (no son secretas).
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WEB_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_WEB_APP_URL=$NEXT_PUBLIC_WEB_APP_URL
COPY . .
RUN test -n "$APP" || (echo "Falta --build-arg APP=api|web|backoffice" && exit 1)
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "$APP" run build

FROM base AS app
ARG APP
ENV APP=$APP NODE_ENV=production PORT=8080
COPY --from=build /repo /repo
EXPOSE 8080
CMD ["sh", "scripts/fly/arrancar.sh"]
