/**
 * H-151 (revisión manual): D84 dice que ningún texto de interfaz va fijo en
 * el código, y lo sostenía la prosa — packages/ui tenía tres reglas propias y
 * ninguna sobre texto. Los componentes vendorizados de shadcn trajeron
 * "Close", "Toggle Sidebar", "Sidebar" y "Displays the mobile sidebar.":
 * fijos, en inglés, y justo en el texto que no se ve — el que sólo oye un
 * lector de pantalla, así que nadie lo nota mirando la pantalla.
 *
 * Acotada para ser practicable: marca texto literal (JSXText o un string
 * literal entre llaves) DENTRO de un elemento con la clase `sr-only`, o de
 * cualquiera de sus descendientes — `<SheetHeader className="sr-only">
 * <SheetTitle>Sidebar</SheetTitle>` también cuenta. No mira `aria-label`,
 * `title` ni `placeholder` literales: hoy hay más de diez en las apps, y
 * meterlos acá volvería la regla un lote de migración (queda en H-151).
 *
 * `focus:not-sr-only` no cuenta como `sr-only` (el "Saltar al contenido" se
 * ve al enfocarlo); `md:sr-only` y demás variantes sí.
 */

function tieneSrOnly(texto) {
  return texto.split(/\s+/).some((clase) => clase === 'sr-only' || clase.endsWith(':sr-only'));
}

/** Las cadenas literales que arman un className: "…", {"…"}, {`…`}, {cn("…", x)}. */
function cadenasDeClassName(valor) {
  if (!valor) return [];
  if (valor.type === 'Literal' && typeof valor.value === 'string') return [valor.value];
  if (valor.type === 'JSXExpressionContainer') return cadenasDeExpresion(valor.expression);
  return [];
}

function cadenasDeExpresion(expr) {
  if (!expr) return [];
  if (expr.type === 'Literal' && typeof expr.value === 'string') return [expr.value];
  if (expr.type === 'TemplateLiteral') return expr.quasis.map((q) => q.value.cooked ?? '');
  if (expr.type === 'CallExpression') return expr.arguments.flatMap(cadenasDeExpresion);
  if (expr.type === 'LogicalExpression') return [...cadenasDeExpresion(expr.left), ...cadenasDeExpresion(expr.right)];
  if (expr.type === 'ConditionalExpression') return [...cadenasDeExpresion(expr.consequent), ...cadenasDeExpresion(expr.alternate)];
  return [];
}

function esSrOnly(elementoJsx) {
  const atributo = elementoJsx.openingElement.attributes.find(
    (a) => a.type === 'JSXAttribute' && a.name?.name === 'className',
  );
  return !!atributo && cadenasDeClassName(atributo.value).some(tieneSrOnly);
}

function dentroDeSrOnly(nodo) {
  for (let actual = nodo.parent; actual; actual = actual.parent) {
    if (actual.type === 'JSXElement' && esSrOnly(actual)) return true;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
const sinTextoFijoEnSrOnly = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe texto literal dentro de un elemento sr-only (H-151, D84): el texto que sólo oye un lector de pantalla sale de next-intl, como el resto.',
    },
    messages: {
      textoFijo:
        'Texto fijo "{{texto}}" dentro de un elemento sr-only (H-151, D84): lo oye un lector de pantalla y nadie lo ve. ' +
        'Tiene que salir de next-intl — en packages/ui, como prop que cada app llena con su t().',
    },
    schema: [],
  },
  create(context) {
    const reportar = (node, texto) => {
      if (!texto.trim() || !dentroDeSrOnly(node)) return;
      context.report({ node, messageId: 'textoFijo', data: { texto: texto.trim().slice(0, 40) } });
    };
    return {
      JSXText(node) {
        reportar(node, node.value);
      },
      JSXExpressionContainer(node) {
        if (node.parent?.type !== 'JSXElement' && node.parent?.type !== 'JSXFragment') return;
        const expr = node.expression;
        if (expr.type === 'Literal' && typeof expr.value === 'string') reportar(node, expr.value);
        if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) reportar(node, expr.quasis[0].value.cooked ?? '');
      },
    };
  },
};

export default {
  rules: {
    'sin-texto-fijo-en-sr-only': sinTextoFijoEnSrOnly,
  },
};
