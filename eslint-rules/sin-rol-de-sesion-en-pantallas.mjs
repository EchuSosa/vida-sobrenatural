/**
 * specs/005-roles-permisos-acceso, T066 (FR-013): ninguna pantalla del
 * backoffice decide el acceso leyendo los roles de la sesión a mano. Toda
 * decisión pasa por `requerirPermiso()` (entrar) o `tienePermisoSesion()`
 * (qué mostrar adentro), que resuelven contra `CATALOGO_PERMISOS` (D132) —
 * si una pantalla vuelve a hacer `rol.includes('admin')`, el catálogo deja
 * de gobernarla en silencio y el día que cambie un permiso, esa pantalla
 * queda con la versión vieja (la forma que la Historia 3 existe para
 * eliminar).
 *
 * Mira el ACCESO a `.rol` sobre un `.user` (`session.user.rol`,
 * `session?.user?.rol`, `const { rol } = session.user`,
 * `const { user: { rol } } = session`), no los nombres de los roles: cubre
 * `rol.includes(...)`, `rol.some(...)` y cualquier variante futura, porque
 * todas empiezan por leer el arreglo. `persona.rol` (los roles de la Persona
 * que se lista, no los de quien mira) no se marca: el discriminante es
 * `.user`, que en este repo es siempre el usuario de la sesión.
 *
 * Las excepciones (auth.ts, que arma la sesión y resuelve el permiso, y
 * backoffice-shell.tsx, que filtra el menú con `itemsParaRoles`) se declaran
 * en eslint.config.mjs, no acá — mismo criterio que no-session-check-en-page.
 */

const esNombre = (nodo, nombre) =>
  (nodo.type === 'Identifier' && nodo.name === nombre) || (nodo.type === 'Literal' && nodo.value === nombre);

/** `algo.user` (con o sin `?.`, con o sin corchetes). */
const esPunteroAUser = (nodo) => nodo?.type === 'MemberExpression' && esNombre(nodo.property, 'user');

const propiedadRol = (patron) =>
  patron.type === 'ObjectPattern' && patron.properties.some((p) => p.type === 'Property' && esNombre(p.key, 'rol'));

const propiedadUserConRol = (patron) =>
  patron.type === 'ObjectPattern' &&
  patron.properties.some((p) => p.type === 'Property' && esNombre(p.key, 'user') && propiedadRol(p.value));

/** @type {import('eslint').Rule.RuleModule} */
const sinRolDeSesionEnPantallas = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe leer session.user.rol en una pantalla del backoffice (FR-013) — el acceso se decide contra CATALOGO_PERMISOS.',
    },
    messages: {
      rolDeSesion:
        'No leas los roles de la sesión a mano (FR-013, D132): usá requerirPermiso() para entrar a la pantalla y ' +
        'tienePermisoSesion() de src/auth.ts para lo que se muestra adentro — así el catálogo gobierna los dos lados.',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (esNombre(node.property, 'rol') && esPunteroAUser(node.object)) {
          context.report({ node, messageId: 'rolDeSesion' });
        }
      },
      VariableDeclarator(node) {
        if (!node.init) return;
        if ((propiedadRol(node.id) && esPunteroAUser(node.init)) || propiedadUserConRol(node.id)) {
          context.report({ node, messageId: 'rolDeSesion' });
        }
      },
    };
  },
};

export default {
  rules: {
    'sin-rol-de-sesion-en-pantallas': sinRolDeSesionEnPantallas,
  },
};
