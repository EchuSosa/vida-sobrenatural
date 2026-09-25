/**
 * Test de eslint-rules/pantalla-declara-permiso.mjs (specs/005, T041).
 *
 * Primera regla de eslint-rules/ con test: fija la convención — un
 * `<regla>.test.mjs` hermano, con `node --test`, corrido desde el script
 * `test` de apps/backoffice (donde se resuelve `eslint`; en la raíz del repo
 * no está instalado). Usa el MISMO parser que la config real del backoffice
 * (eslint-config-next/typescript), para que parsee igual que el lint.
 *
 * Además del fixture sintético, el caso histórico: el estado real de
 * `libros/papelera/page.tsx` y `nav.ts` antes de la Historia 3 (H-129),
 * tomados de `git show 7fbeea2`. Un fixture inventado prueba que la regla
 * funciona contra lo que el fixture imagina; éste, contra un bug que existió.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import regla from './pantalla-declara-permiso.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const requireBackoffice = createRequire(path.join(aqui, '..', 'apps', 'backoffice', 'package.json'));
const { RuleTester, Linter } = requireBackoffice('eslint');
const nextTs = (await import(pathToFileURL(requireBackoffice.resolve('eslint-config-next/typescript')).href)).default;
const parser = nextTs.find((c) => c.languageOptions?.parser).languageOptions.parser;

const FIX = path.join(aqui, 'fixtures', 'pantalla-declara-permiso');
const APP = path.join(FIX, 'app');
const opciones = [{ nav: path.join(FIX, 'nav.ts'), app: APP }];
const pagina = (ruta) => path.join(APP, ...ruta.split('/').filter(Boolean), 'page.tsx');
const r = regla.rules['pantalla-declara-permiso'];

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } } });

tester.run('pantalla-declara-permiso', r, {
  valid: [
    {
      name: 'exige el permiso de su entrada',
      filename: pagina('/libros'),
      options: opciones,
      code: "export default async function P() { await requerirPermiso('libros.ver'); return <div />; }",
    },
    {
      name: 'ruta dinámica: /sedes/[id]',
      filename: pagina('/sedes/[id]'),
      options: opciones,
      code: "export default async function P() { await requerirPermiso('sedes.ver'); return null; }",
    },
    {
      name: 'un grupo de rutas (x) no es parte de la URL',
      filename: path.join(APP, '(admin)', 'libros', 'page.tsx'),
      options: opciones,
      code: "export default async function P() { await requerirPermiso('libros.ver'); return null; }",
    },
    {
      name: "única excepción: una entrada 'cualquier-sesion'",
      filename: pagina('/ayuda'),
      options: opciones,
      code: 'export default function P() { return <div />; }',
    },
  ],
  invalid: [
    {
      name: 'fixture sin entrada en NAV_BACKOFFICE',
      filename: pagina('/pantalla-nueva'),
      options: opciones,
      code: "export default async function P() { await requerirPermiso('libros.ver'); return null; }",
      errors: [{ messageId: 'sinEntrada' }],
    },
    {
      name: 'tiene entrada pero no llama a requerirPermiso (H-132)',
      filename: pagina('/libros'),
      options: opciones,
      code: 'export default async function P() { await requerirSesion(); return null; }',
      errors: [{ messageId: 'sinChequeo' }],
    },
    {
      name: 'desajuste de permiso (H-129)',
      filename: pagina('/libros/papelera'),
      options: opciones,
      code: "export default async function P() { await requerirPermiso('libros.ver'); return null; }",
      errors: [{ messageId: 'permisoDistinto' }],
    },
    {
      name: 'un permiso que no es string literal no se puede comprobar',
      filename: pagina('/libros'),
      options: opciones,
      code: "const p = 'libros.ver'; export default async function P() { await requerirPermiso(p); return null; }",
      errors: [{ messageId: 'permisoNoLiteral' }],
    },
  ],
});

describe('el caso histórico de H-129, tomado de git (7fbeea2, antes de la Historia 3)', () => {
  const HIST = path.join(FIX, 'historico-h129');
  const linter = new Linter({ configType: 'flat', cwd: FIX });
  const lint = (code) =>
    linter.verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          plugins: { local: regla },
          languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
          rules: { 'local/pantalla-declara-permiso': ['error', { nav: path.join(HIST, 'nav.ts'), app: APP }] },
        },
      ],
      pagina('/libros/papelera'),
    );
  const paginaReal = readFileSync(path.join(HIST, 'libros-papelera-page.tsx'), 'utf-8');

  it('la página real (chequeo de rol a mano, sin requerirPermiso) queda marcada', () => {
    const mensajes = lint(paginaReal);
    assert.deepEqual(mensajes.map((m) => m.messageId), ['sinChequeo']);
  });

  it('la versión que pedía T034 original (libros.ver contra libros.papelera.ver de nav.ts) queda marcada', () => {
    const variante = paginaReal
      .replace("import { requerirSesion } from '../../../auth';", "import { requerirPermiso } from '../../../auth';")
      .replace('await requerirSesion()', "await requerirPermiso('libros.ver')");
    assert.match(variante, /requerirPermiso\('libros\.ver'\)/);
    assert.deepEqual(lint(variante).map((m) => m.messageId), ['permisoDistinto']);
  });
});

describe('falla cerrada: si no puede leer o entender nav.ts, aborta — nunca cero violaciones', () => {
  const linter = new Linter({ configType: 'flat', cwd: FIX });
  const lintCon = (nav) => () =>
    linter.verify(
      "export default async function P() { await requerirPermiso('libros.ver'); return null; }",
      [
        {
          files: ['**/*.tsx'],
          plugins: { local: regla },
          languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
          rules: { 'local/pantalla-declara-permiso': ['error', { nav, app: APP }] },
        },
      ],
      pagina('/libros'),
    );

  it('nav.ts que no existe', () => {
    assert.throws(lintCon(path.join(FIX, 'no-existe.ts')), /no se puede leer .*falla cerrada/);
  });
  it('nav.ts sin NAV_BACKOFFICE', () => {
    assert.throws(lintCon(path.join(FIX, 'nav-sin-export.ts')), /no declara NAV_BACKOFFICE/);
  });
  it('NAV_BACKOFFICE con un spread (dejó de ser declarativo)', () => {
    assert.throws(lintCon(path.join(FIX, 'nav-con-spread.ts')), /no es un objeto literal|spread/);
  });
});
