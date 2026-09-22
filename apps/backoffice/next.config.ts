import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // packages/ui se consume como fuente TypeScript, no como paquete compilado
  // (research.md, Decisión 1).
  transpilePackages: ["@vida-sobrenatural/ui"],
  // H-78/D124: ver el mismo comentario en apps/web/next.config.ts — distDir
  // propio para que el `next dev` de e2e no choque con el de desarrollo.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
