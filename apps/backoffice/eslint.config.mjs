import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import noRawTailwindColors from "../../eslint-rules/no-raw-tailwind-colors.mjs";
import noLinkEnBotonBaseUi from "../../eslint-rules/no-link-en-boton-base-ui.mjs";
import noSessionCheckEnPage from "../../eslint-rules/no-session-check-en-page.mjs";
import noDangerouslySetInnerHtml from "../../eslint-rules/no-dangerously-set-inner-html.mjs";

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
        },
      },
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "local/no-raw-tailwind-colors": "error",
      "local/no-link-en-boton-base-ui": "error",
      "local/no-dangerously-set-inner-html": "error",
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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
