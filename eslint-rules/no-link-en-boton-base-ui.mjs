/**
 * H-100/H-01 (revisión manual): mismo defecto, dos veces — un enlace
 * (`next/link` o un `<a>` a mano) pasado por `render` a un componente
 * construido sobre el `Button` de Base UI (que usa `useButton` por
 * debajo: `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogTrigger`,
 * `DropdownMenuTrigger`, `SheetTrigger`, o `Button` directo). La primera
 * vez (H-01) se arregló en una lista de lugares conocidos; la segunda
 * (H-100) fue un lugar que no estaba en esa lista porque todavía no
 * existía — la jerarquía de durabilidad de H-61 otra vez, resuelta en la
 * capa equivocada. Esta regla es la capa mecánica: falla en el build,
 * cualquiera sea el archivo.
 *
 * El arreglo siempre es el mismo: `ButtonLink` (packages/ui) — un `<a>`
 * de verdad, con el estilo de `Button`, sin pasar por su primitivo.
 *
 * Una sola fuente de verdad (Principio XI): este archivo, no una copia
 * por app — apps/web/eslint.config.mjs, apps/backoffice/eslint.config.mjs
 * y packages/ui/eslint.config.mjs lo importan por ruta relativa (mismo
 * criterio que no-raw-tailwind-colors.mjs).
 */

const COMPONENTES_BOTON_BASE_UI = new Set([
  'Button',
  'AlertDialogAction',
  'AlertDialogCancel',
  'AlertDialogTrigger',
  'DropdownMenuTrigger',
  'SheetTrigger',
]);

const ETIQUETAS_DE_ENLACE = new Set(['Link', 'a']);

function nombreDeJSX(nombreNodo) {
  if (!nombreNodo) return null;
  if (nombreNodo.type === 'JSXIdentifier') return nombreNodo.name;
  if (nombreNodo.type === 'JSXMemberExpression') return nombreDeJSX(nombreNodo.property);
  return null;
}

/**
 * Recorre el valor del `render={...}` a mano (sin depender de utilidades
 * de recorrido de ESLint, que están pensadas para el árbol completo del
 * archivo, no para un subárbol) buscando el primer `<Link>`/`<a>` — a
 * cualquier profundidad, para agarrar también `render={(p) => <Link {...p} />}`,
 * no solo el caso literal.
 */
function buscarElementoDeEnlace(nodo) {
  if (!nodo || typeof nodo !== 'object' || typeof nodo.type !== 'string') return null;
  if (nodo.type === 'JSXElement') {
    const nombre = nombreDeJSX(nodo.openingElement.name);
    if (nombre && ETIQUETAS_DE_ENLACE.has(nombre)) return nodo;
  }
  for (const clave of Object.keys(nodo)) {
    if (clave === 'parent') continue;
    const valor = nodo[clave];
    if (Array.isArray(valor)) {
      for (const item of valor) {
        const encontrado = buscarElementoDeEnlace(item);
        if (encontrado) return encontrado;
      }
    } else {
      const encontrado = buscarElementoDeEnlace(valor);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const noLinkEnBotonBaseUi = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe pasar un <Link>/<a> por render a un componente construido sobre el Button de Base UI (H-01/H-100) — usá ButtonLink.',
    },
    messages: {
      linkEnBoton:
        'Un <{{etiqueta}}> dentro del render de <{{componente}}> le pisa la semántica de enlace ' +
        '(H-01/H-100: queda anunciado como botón, no como enlace). Usá ButtonLink (packages/ui) en su lugar.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const nombreComponente = nombreDeJSX(node.name);
        if (!nombreComponente || !COMPONENTES_BOTON_BASE_UI.has(nombreComponente)) return;

        const atributoRender = node.attributes.find(
          (atributo) => atributo.type === 'JSXAttribute' && atributo.name?.name === 'render',
        );
        if (!atributoRender || !atributoRender.value) return;

        const valor =
          atributoRender.value.type === 'JSXExpressionContainer' ? atributoRender.value.expression : atributoRender.value;
        const elementoDeEnlace = buscarElementoDeEnlace(valor);
        if (!elementoDeEnlace) return;

        context.report({
          node: elementoDeEnlace,
          messageId: 'linkEnBoton',
          data: {
            etiqueta: nombreDeJSX(elementoDeEnlace.openingElement.name),
            componente: nombreComponente,
          },
        });
      },
    };
  },
};

export default {
  rules: {
    'no-link-en-boton-base-ui': noLinkEnBotonBaseUi,
  },
};
