import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // packages/ui se consume como fuente TypeScript, no como paquete compilado
  // (research.md, Decisión 1).
  transpilePackages: ["@vida-sobrenatural/ui"],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Sin subida de sourcemaps a Sentry sin token/org configurados — evita que
  // el build local falle por falta de credenciales cuando SENTRY_DSN no está
  // seteada (research.md, Decisión 8).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
