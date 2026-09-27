import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import noRawTailwindColors from "../../eslint-rules/no-raw-tailwind-colors.mjs";
import noLinkEnBotonBaseUi from "../../eslint-rules/no-link-en-boton-base-ui.mjs";
import noSessionCheckEnPage from "../../eslint-rules/no-session-check-en-page.mjs";
import noDangerouslySetInnerHtml from "../../eslint-rules/no-dangerously-set-inner-html.mjs";
import sinRolDeSesionEnPantallas from "../../eslint-rules/sin-rol-de-sesion-en-pantallas.mjs";
import pantallaDeclaraPermiso from "../../eslint-rules/pantalla-declara-permiso.mjs";
import sinTextoFijoEnSrOnly from "../../eslint-rules/sin-texto-fijo-en-sr-only.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Accesibilidad — Constitución Principio VII (specs/002-base-transversal).
  // eslint-config-next ya registra el plugin jsx-a11y; solo se agregan las
  // reglas de "recommended" (evita "Cannot redefine plugin").
  { rules: jsxA11y.flatConfigs.recommended.rules },
  // H-61: los colores salen de tokens (D118) — ver eslint-rules/no-raw-tailwind-colors.mjs
  // (una sola fuente, la comparten apps/web, apps/backoffice y packages/ui).
  // require-description exige el motivo en cualquier eslint-disable — la
  // "vía de escape documentada" que pide el hallazgo, no una lista silenciosa.
  {
    plugins: {
      local: {
        rules: {
          ...noRawTailwindColors.rules,
          ...noLinkEnBotonBaseUi.rules,
          ...noSessionCheckEnPage.rules,
          ...noDangerouslySetInnerHtml.rules,
          ...sinRolDeSesionEnPantallas.rules,
          ...pantallaDeclaraPermiso.rules,
          ...sinTextoFijoEnSrOnly.rules,
        },
      },
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "local/no-raw-tailwind-colors": "error",
      "local/no-link-en-boton-base-ui": "error",
      "local/no-dangerously-set-inner-html": "error",
      // H-151: texto que sólo oye un lector de pantalla, también desde next-intl (D84).
      "local/sin-texto-fijo-en-sr-only": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
  // H-116: solo los page.tsx de app/ — el chequeo de sesión vive en el
  // layout raíz; BackofficeShell (fuera de app/) sí necesita su propio
  // `if (!session)` como guarda de tipos, no está cubierto a propósito.
  {
    files: ["src/app/**/page.tsx"],
    rules: { "local/no-session-check-en-page": "error" },
  },
  // specs/005, T039/T040 (H-132): toda page.tsx llama a requerirPermiso(X)
  // con la X de su entrada en NAV_BACKOFFICE. Rutas explícitas, sin default
  // (H-130): si nav.ts no se puede leer, el lint aborta — nunca pasa en verde.
  {
    files: ["src/app/**/page.tsx"],
    rules: {
      "local/pantalla-declara-permiso": ["error", { nav: "src/config/nav.ts", app: "src/app" }],
    },
  },
  // specs/005, T066 (FR-013): ninguna pantalla lee session.user.rol — el
  // acceso se decide con requerirPermiso()/tienePermisoSesion() contra el
  // catálogo. Solo quedan afuera los lugares que SÍ tienen que leerlo:
  // auth.ts (arma la sesión y resuelve el permiso), el shell (filtra el
  // menú con itemsParaRoles) y el botón del 404 (H-134: resuelve el destino
  // de aterrizaje con itemDeAterrizaje, del mismo catálogo — de cliente
  // porque un not-found async rompe en desarrollo, ver ese archivo).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/auth.ts", "src/components/backoffice-shell.tsx", "src/components/boton-aterrizaje.tsx"],
    rules: { "local/sin-rol-de-sesion-en-pantallas": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // H-115 (revisión manual): distDir propio por instancia de Playwright
    // (H-78/D124, .gitignore) — sin esto, lint recorre los chunks
    // generados de una corrida de e2e como si fueran código propio.
    ".next-e2e*/**",
    // Logs de turbo (H-101) — hoy solo texto, sin nada que lintear, pero
    // por las dudas si turbo algún día escribe algo más ahí.
    ".turbo/**",
  ]),
]);

export default eslintConfig;
