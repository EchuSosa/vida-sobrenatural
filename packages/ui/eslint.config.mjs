import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import noRawTailwindColors from "../../eslint-rules/no-raw-tailwind-colors.mjs";
import noLinkEnBotonBaseUi from "../../eslint-rules/no-link-en-boton-base-ui.mjs";

/**
 * H-61 (revisión manual): packages/ui no tenía config propia — es donde
 * MÁS importa la regla de colores crudos (D118, Principio XI: los
 * componentes compartidos son la fuente de verdad para las dos apps).
 * Setup mínimo (sin eslint-config-next: esto no es una app Next.js) —
 * parser de TypeScript/JSX, react-hooks (el código ya usa hooks y ya
 * tenía comentarios eslint-disable que lo referencian) y la regla local.
 */
const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    plugins: {
      local: { rules: { ...noRawTailwindColors.rules, ...noLinkEnBotonBaseUi.rules } },
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "local/no-raw-tailwind-colors": "error",
      "local/no-link-en-boton-base-ui": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
  globalIgnores(["dist/**"]),
]);

export default eslintConfig;
