/**
 * H-117 (revisión manual): la seguridad de D127 (guardar Markdown, nunca
 * HTML) vive en el RENDERIZADO, no en el editor — la API guarda `texto`
 * tal cual llegue, sin sanitizar nada, y lo único que lo vuelve inofensivo
 * es que `MarkdownSeguro` use `react-markdown` SIN `rehype-raw`. Eso
 * funciona mientras TODO lo que renderice ese campo (o cualquier otro
 * campo de texto libre guardado sin sanitizar) pase por ahí. El día que
 * alguien lo muestre con `dangerouslySetInnerHTML` en un componente
 * nuevo, lo guardado se vuelve ejecutable — sin que el bug se note hasta
 * que alguien lo explote.
 *
 * Esta regla prohíbe el MECANISMO en todo el repo, no un campo puntual:
 * hoy no se usa en ningún lado (entra en verde), y si algún día hace
 * falta una excepción legítima (ej. una librería de terceros que lo
 * exige), que sea con `eslint-disable-next-line` y un comentario que diga
 * por qué — explícita y revisable en el diff, nunca un ignore general.
 * Mismo criterio que no-link-en-boton-base-ui.mjs (H-01/H-100) y
 * no-session-check-en-page.mjs (H-116): falla en el build, cualquiera sea
 * el archivo.
 */

/** @type {import('eslint').Rule.RuleModule} */
const noDangerouslySetInnerHtml = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe dangerouslySetInnerHTML en todo el repo (H-117) — la seguridad de D127 depende de que ningún renderizador vuelque HTML crudo.',
    },
    messages: {
      dangerouslySetInnerHtml:
        'dangerouslySetInnerHTML está prohibido (H-117): D127 depende de que ningún componente vuelque HTML crudo al DOM — ' +
        'un campo de texto libre guardado sin sanitizar (como la Palabra Profética) se volvería ejecutable. ' +
        'Si esto es una excepción legítima, usá eslint-disable-next-line con un comentario que explique por qué.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const nombre = node.name?.name;
        if (nombre === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'dangerouslySetInnerHtml' });
        }
      },
      Property(node) {
        // Cubre también el uso fuera de JSX (ej. pasado como prop en un
        // objeto, o en código que arma el elemento con React.createElement).
        const clave = node.key?.type === 'Identifier' ? node.key.name : node.key?.value;
        if (clave === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'dangerouslySetInnerHtml' });
        }
      },
    };
  },
};

export default {
  rules: {
    'no-dangerously-set-inner-html': noDangerouslySetInnerHtml,
  },
};
