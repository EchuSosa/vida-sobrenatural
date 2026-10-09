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
  // `pnpm dev:red` (scripts/dev-red.mjs): para probar desde el celular u otra
  // compu en la misma red, Next 16 solo sirve sus recursos de desarrollo a los
  // orígenes permitidos. Fuera de ese comando la variable no existe y no cambia nada.
  ...(process.env.DEV_ORIGENES_PERMITIDOS
    ? { allowedDevOrigins: process.env.DEV_ORIGENES_PERMITIDOS.split(",") }
    : {}),
  // spec 006, T061 (FR-025, D142): lo del Discipulador y del Líder de curso
  // vive en la web app. Los enlaces viejos del backoffice llevan allá,
  // conservando el id; si la sesión no tiene el permiso, la web app hace lo
  // de siempre (la manda a Mi camino).
  async redirects() {
    const web = (process.env.NEXT_PUBLIC_WEB_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
    return [
      { source: "/mis-discipulados", destination: `${web}/mis-discipulados`, permanent: false },
      { source: "/mis-discipulados/:id", destination: `${web}/mis-discipulados/:id`, permanent: false },
      { source: "/mi-disponibilidad", destination: `${web}/mi-disponibilidad`, permanent: false },
      { source: "/mis-grupos", destination: `${web}/mi-camino`, permanent: false },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
