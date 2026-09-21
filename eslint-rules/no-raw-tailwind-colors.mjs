/**
 * H-61 (revisión manual): la paleta de marca (D118, docs/17-paleta-y-tokens.md)
 * entró a medias porque nada impedía que un color crudo de Tailwind volviera
 * a colarse (H-54, 24 archivos) — la regla vivía solo en docs/15-guia-ux-ui.md
 * y en CLAUDE.md, el nivel más débil de la jerarquía de durabilidad que
 * describe H-61. Esta regla la hace cumplir en el build.
 *
 * Una sola fuente de verdad (Principio XI): este archivo, no una copia por
 * app — apps/web/eslint.config.mjs, apps/backoffice/eslint.config.mjs y
 * packages/ui/eslint.config.mjs lo importan por ruta relativa.
 *
 * Busca clases de color crudas de la paleta de Tailwind (zinc, gray, slate,
 * neutral, stone, y los colores "de campaña" — red, green, blue, amber...)
 * en cualquier string o template literal, con o sin variantes (dark:,
 * hover:, sm:, etc.) — no solo dentro de `className`: un `cn('text-zinc-500',
 * ...)` o un template literal arman la clase igual, y ese patrón ya apareció
 * en el código real (H-54).
 */

const COLORES = [
  'zinc',
  'gray',
  'slate',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|');

const PROPIEDADES = [
  'text',
  'bg',
  'border',
  'ring',
  'ring-offset',
  'divide',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'outline',
  'decoration',
  'accent',
  'caret',
  'shadow',
  'placeholder',
].join('|');

// (?:^|[\s'"`]) — el borde de la clase: principio de string o separador de
// otra clase (así "vía"/"outline" real como palabra suelta no matchea, solo
// cuando arma una clase de Tailwind). Variantes (dark:, hover:, sm:, etc.)
// antes del nombre de propiedad son opcionales y pueden repetirse.
const PATRON = new RegExp(
  `(?:^|[\\s'"\`])(?:[a-z0-9-]+:)*(?:${PROPIEDADES})-(?:${COLORES})-[0-9]{2,3}\\b`,
);

function revisar(context, node, valor) {
  if (typeof valor !== 'string') return;
  const match = valor.match(PATRON);
  if (!match) return;
  context.report({
    node,
    messageId: 'colorCrudo',
    data: { clase: match[0].trim() },
  });
}

/** @type {import('eslint').Rule.RuleModule} */
const noRawTailwindColors = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe clases de color crudas de Tailwind (D118) — los colores salen de tokens semánticos.',
    },
    messages: {
      colorCrudo:
        'Color crudo de Tailwind prohibido ("{{clase}}") — usá un token semántico (text-muted-foreground, ' +
        'border-border…), ver docs/17-paleta-y-tokens.md. Si de verdad hace falta un color crudo (caso raro, ' +
        'ej. un ícono de marca externa), documentalo con un comentario ' +
        '// eslint-disable-next-line local/no-raw-tailwind-colors -- <por qué> justo arriba.',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        revisar(context, node, node.value);
      },
      TemplateElement(node) {
        revisar(context, node, node.value.cooked ?? undefined);
      },
    };
  },
};

export default {
  rules: {
    'no-raw-tailwind-colors': noRawTailwindColors,
  },
};
