import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // packages/ui se consume como fuente TypeScript, no como paquete compilado
  // (research.md, Decisión 1).
  transpilePackages: ["@vida-sobrenatural/ui"],
  // H-39 (revisión manual ronda 3): el indicador de desarrollo tapaba la
  // pestaña "Inicio" de la barra inferior en celular. Next sigue mostrando
  // errores de compilación/runtime igual sin este indicador.
  devIndicators: false,
  // H-78/D124: los `webServer` de e2e (apps/web/playwright.config.ts,
  // apps/backoffice/playwright.config.ts) arrancan `next dev` en este mismo
  // directorio mientras puede haber un `next dev` de desarrollo corriendo a
  // la vez — Next liga el lock de "una sola instancia" a `<distDir>/lock`
  // (node_modules/next/dist/build/lockfile.js), no al puerto, así que sin un
  // distDir propio la segunda instancia se niega a arrancar aunque el
  // puerto sea distinto.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Sin subida de sourcemaps a Sentry sin token/org configurados — evita que
  // el build local falle por falta de credenciales cuando SENTRY_DSN no está
  // seteada (research.md, Decisión 8).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
