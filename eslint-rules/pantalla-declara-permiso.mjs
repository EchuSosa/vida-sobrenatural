/**
 * specs/005-roles-permisos-acceso, Historia 4 (T039, FR-016/FR-017): toda
 * pantalla del backoffice declara su permiso — y lo EXIGE. H-116 subió el
 * chequeo de SESIÓN al layout (una sola vez para todo el backoffice); esta
 * regla hace lo mismo con el de PERMISO: vuelve mecánico que cada
 * `page.tsx` llame a `requerirPermiso(X)` con la X de su entrada en
 * `NAV_BACKOFFICE` (apps/backoffice/src/config/nav.ts), el registro
 * ruta→permiso que ya usan el menú y el smoke de axe.
 *
 * Qué marca, por `page.tsx`:
 * - la ruta no tiene entrada en `NAV_BACKOFFICE`;
 * - la página no llama a `requerirPermiso` (H-132: doce pantallas hacían solo
 *   `requerirSesion()` o nada, y la versión anterior de esta regla —que
 *   comparaba solo cuando ya había un `requerirPermiso`— les habría dado
 *   verde a las doce: "medía la conformidad de los conformes");
 * - la llama con un permiso distinto del de su entrada (H-129: la papelera de
 *   Libros con `libros.ver` en la página y `libros.papelera.ver` en nav.ts);
 * - la llama con algo que no es un string literal (no se puede comprobar).
 * Única excepción: una entrada declarada `permiso: 'cualquier-sesion'`.
 *
 * FALLA CERRADA. Si no puede leer `nav.ts`, o no entiende lo que encuentra
 * (sin `NAV_BACKOFFICE`, un spread, un `href` o `permiso` que no es literal),
 * ABORTA el lint con un error explicativo. Nunca "cero violaciones" por no
 * haber encontrado su fuente: una regla que no ve nada y por eso no marca
 * nada es peor que no tener regla (H-127: la guarda que nace abierta).
 *
 * Cómo lee `nav.ts` (un módulo TypeScript) desde un `.mjs`: no lo ejecuta —
 * lo parsea con el mismo parser que ESLint ya usa para los `.tsx` de esa
 * app (`context.languageOptions.parser`) y extrae del árbol el arreglo
 * literal de `NAV_BACKOFFICE`. Ejecutarlo arrastraría lucide-react y
 * shared-types en tiempo de lint; leer el árbol valida lo que está escrito,
 * y obliga a que nav.ts siga siendo declarativo.
 *
 * Lo que NO mira: que el `requerirPermiso` esté en el camino que
 * efectivamente se ejecuta (una llamada dentro de una rama muerta cuenta),
 * ni que se haga `await`. Mira la declaración, no el flujo.
 *
 * Opciones (obligatorias, sin default — H-130): `{ nav, app }`, rutas a
 * nav.ts y al directorio `src/app`, relativas al cwd de ESLint o absolutas.
 * Se aplica vía `files` en eslint.config.mjs, igual que
 * no-session-check-en-page.
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const cache = new Map();

function abortar(mensaje) {
  throw new Error(`[pantalla-declara-permiso] ${mensaje} — la regla falla cerrada: sin su fuente no puede afirmar nada (T039, H-127).`);
}

function sinEnvolturas(nodo) {
  let actual = nodo;
  while (actual && ['TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion'].includes(actual.type)) {
    actual = actual.expression;
  }
  return actual;
}

const nombreDeClave = (clave) => (clave.type === 'Identifier' ? clave.name : clave.type === 'Literal' ? clave.value : null);

function extraerNav(rutaNav, parser) {
  let texto;
  let mtime;
  try {
    mtime = statSync(rutaNav).mtimeMs;
    texto = readFileSync(rutaNav, 'utf-8');
  } catch (error) {
    abortar(`no se puede leer ${rutaNav} (${error.code ?? error.message})`);
  }
  const clave = `${rutaNav}:${mtime}`;
  if (cache.has(clave)) return cache.get(clave);

  if (!parser || (typeof parser.parseForESLint !== 'function' && typeof parser.parse !== 'function')) {
    abortar('no hay un parser configurado con el que leer nav.ts');
  }
  let ast;
  try {
    const opciones = { sourceType: 'module', ecmaVersion: 'latest', filePath: rutaNav, range: true, loc: true };
    ast = typeof parser.parseForESLint === 'function' ? parser.parseForESLint(texto, opciones).ast : parser.parse(texto, opciones);
  } catch (error) {
    abortar(`no se pudo parsear ${rutaNav}: ${error.message}`);
  }

  let arreglo = null;
  for (const sentencia of ast.body) {
    const decl = sentencia.type === 'ExportNamedDeclaration' ? sentencia.declaration : sentencia;
    if (decl?.type !== 'VariableDeclaration') continue;
    for (const d of decl.declarations) {
      if (d.id.type === 'Identifier' && d.id.name === 'NAV_BACKOFFICE') arreglo = sinEnvolturas(d.init);
    }
  }
  if (!arreglo) abortar(`${rutaNav} no declara NAV_BACKOFFICE`);
  if (arreglo.type !== 'ArrayExpression') abortar(`NAV_BACKOFFICE en ${rutaNav} no es un arreglo literal`);

  const entradas = new Map();
  for (const elemento of arreglo.elements) {
    const objeto = sinEnvolturas(elemento);
    if (objeto?.type !== 'ObjectExpression') abortar(`NAV_BACKOFFICE tiene un elemento que no es un objeto literal (línea ${elemento?.loc?.start.line})`);
    const campos = {};
    for (const prop of objeto.properties) {
      if (prop.type !== 'Property') abortar(`NAV_BACKOFFICE tiene un spread u otra propiedad no literal (línea ${prop.loc?.start.line})`);
      const nombre = nombreDeClave(prop.key);
      if (nombre === 'href' || nombre === 'permiso') {
        const valor = sinEnvolturas(prop.value);
        if (valor.type !== 'Literal' || typeof valor.value !== 'string') {
          abortar(`el "${nombre}" de una entrada de NAV_BACKOFFICE no es un string literal (línea ${prop.loc?.start.line})`);
        }
        campos[nombre] = valor.value;
      }
    }
    if (!campos.href || !campos.permiso) abortar(`una entrada de NAV_BACKOFFICE no tiene href y permiso (línea ${objeto.loc?.start.line})`);
    entradas.set(campos.href, campos.permiso);
  }
  if (entradas.size === 0) abortar(`NAV_BACKOFFICE en ${rutaNav} está vacío`);
  cache.set(clave, entradas);
  return entradas;
}

/** `src/app/sedes/[id]/page.tsx` → `/sedes/[id]`; los grupos `(x)` no son parte de la URL. */
function rutaDePagina(archivo, dirApp) {
  const relativa = path.relative(dirApp, path.dirname(archivo));
  if (relativa.startsWith('..') || path.isAbsolute(relativa)) {
    abortar(`${archivo} no está dentro de ${dirApp} — revisá la opción "app" y el "files" de la config`);
  }
  const segmentos = relativa.split(path.sep).filter((s) => s && !(s.startsWith('(') && s.endsWith(')')));
  return '/' + segmentos.join('/');
}

/** @type {import('eslint').Rule.RuleModule} */
const pantallaDeclaraPermiso = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Toda page.tsx del backoffice llama a requerirPermiso(X) con la X de su entrada en NAV_BACKOFFICE (FR-016/FR-017, H-132).',
    },
    messages: {
      sinEntrada:
        'La ruta "{{ruta}}" no tiene entrada en NAV_BACKOFFICE (src/config/nav.ts). Agregala con su permiso del catálogo — ' +
        'es el registro ruta→permiso del menú, del smoke de axe y de esta regla.',
      sinChequeo:
        'La ruta "{{ruta}}" declara "{{permiso}}" en NAV_BACKOFFICE pero la página no lo exige: llamá a ' +
        "requerirPermiso('{{permiso}}') (src/auth.ts). Sin eso, cualquier sesión entra por URL (H-132).",
      permisoDistinto:
        "La página de \"{{ruta}}\" exige requerirPermiso('{{enPagina}}') pero NAV_BACKOFFICE le asigna \"{{permiso}}\". " +
        'Uno de los dos está mal — decidí cuál y hacé que coincidan (H-129).',
      permisoNoLiteral:
        'requerirPermiso(...) en "{{ruta}}" no recibe un string literal: esta regla no puede comprobar que coincida con NAV_BACKOFFICE.',
    },
    schema: [
      {
        type: 'object',
        properties: { nav: { type: 'string' }, app: { type: 'string' } },
        required: ['nav', 'app'],
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const opciones = context.options[0];
    if (!opciones?.nav || !opciones?.app) abortar('faltan las opciones "nav" y "app" (sin default a propósito)');
    const cwd = context.cwd ?? process.cwd();
    const rutaNav = path.resolve(cwd, opciones.nav);
    const dirApp = path.resolve(cwd, opciones.app);
    const entradas = extraerNav(rutaNav, context.languageOptions?.parser);
    const archivo = context.filename ?? context.getFilename();
    const ruta = rutaDePagina(archivo, dirApp);
    const llamadas = [];

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'requerirPermiso') llamadas.push(node);
      },
      'Program:exit'(programa) {
        if (!entradas.has(ruta)) {
          context.report({ node: programa, messageId: 'sinEntrada', data: { ruta } });
          return;
        }
        const permiso = entradas.get(ruta);
        if (permiso === 'cualquier-sesion') return;
        if (llamadas.length === 0) {
          context.report({ node: programa, messageId: 'sinChequeo', data: { ruta, permiso } });
          return;
        }
        for (const llamada of llamadas) {
          const arg = llamada.arguments[0];
          if (arg?.type !== 'Literal' || typeof arg.value !== 'string') {
            context.report({ node: llamada, messageId: 'permisoNoLiteral', data: { ruta } });
          } else if (arg.value !== permiso) {
            context.report({ node: llamada, messageId: 'permisoDistinto', data: { ruta, enPagina: arg.value, permiso } });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    'pantalla-declara-permiso': pantallaDeclaraPermiso,
  },
};
