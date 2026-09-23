/**
 * H-116 (revisión manual): el chequeo de sesión del backoffice vivía
 * repetido a mano en nueve `page.tsx`, y otras ocho no lo tenían — la
 * protección dependía de que quien escribiera cada pantalla se acordara de
 * pegar el bloque (la jerarquía de H-61, en la capa de seguridad). El
 * arreglo lo sube a `apps/backoffice/src/app/layout.tsx` (un solo lugar,
 * `requerirSesion()` en auth.ts para el resto) — esta regla es la capa
 * mecánica: si un `page.tsx` vuelve a traer su propio `if (!session)`, es
 * señal de que algo no está colgando del layout, y falla en el build,
 * cualquiera sea el archivo. Mismo criterio que no-link-en-boton-base-ui.mjs
 * (H-100/H-01).
 *
 * Solo mira el identificador `session` (la convención uniforme de este
 * repo, `const session = await auth();`) — no cualquier chequeo de
 * verdad/falsedad, para no marcar código que no tiene nada que ver con
 * esto. Se aplica vía `files` en cada eslint.config.mjs, no acá adentro,
 * para que la regla sea reutilizable y la ubicación sea explícita en la
 * config (una sola fuente de verdad, Principio XI).
 */

/** @type {import('eslint').Rule.RuleModule} */
const noSessionCheckEnPage = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe un `if (!session)` a mano en un page.tsx del backoffice (H-116) — el chequeo de sesión vive en el layout.',
    },
    messages: {
      sessionCheckEnPage:
        'El chequeo de sesión ya vive en apps/backoffice/src/app/layout.tsx (H-116) — ' +
        'esta página no necesita (ni debe) repetirlo. Usá requerirSesion() de ../auth si necesitás el objeto de sesión tipado.',
    },
    schema: [],
  },
  create(context) {
    return {
      IfStatement(node) {
        const { test } = node;
        if (
          test.type === 'UnaryExpression' &&
          test.operator === '!' &&
          test.argument.type === 'Identifier' &&
          test.argument.name === 'session'
        ) {
          context.report({ node, messageId: 'sessionCheckEnPage' });
        }
      },
    };
  },
};

export default {
  rules: {
    'no-session-check-en-page': noSessionCheckEnPage,
  },
};
