/**
 * Test de eslint-rules/sin-texto-fijo-en-sr-only.mjs (H-151). Misma
 * convención que pantalla-declara-permiso.test.mjs: `node --test`, corrido
 * desde el script `test` de apps/backoffice, con el parser de su config.
 *
 * Además de los casos sintéticos, los casos históricos: `sheet.tsx` y
 * `sidebar.tsx` de packages/ui tal como estaban antes de H-151
 * (`git show e336a48:packages/ui/src/components/ui/…`, copiados en
 * fixtures/). La regla tiene que encontrar en ellos exactamente los textos
 * que H-151 encontró a mano — ni uno menos.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import regla from './sin-texto-fijo-en-sr-only.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const requireBackoffice = createRequire(path.join(aqui, '..', 'apps', 'backoffice', 'package.json'));
const { RuleTester, Linter } = requireBackoffice('eslint');
const nextTs = (await import(pathToFileURL(requireBackoffice.resolve('eslint-config-next/typescript')).href)).default;
const parser = nextTs.find((c) => c.languageOptions?.parser).languageOptions.parser;
const r = regla.rules['sin-texto-fijo-en-sr-only'];

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } } });

tester.run('sin-texto-fijo-en-sr-only', r, {
  valid: [
    { name: 'texto que sale de t()', code: "const A = () => <span className=\"sr-only\">{t('cerrar')}</span>;" },
    { name: 'texto que llega como prop', code: 'const A = ({ etiqueta }) => <span className="sr-only">{etiqueta}</span>;' },
    { name: 'texto fijo VISIBLE no es asunto de esta regla', code: 'const A = () => <span className="font-bold">Hola</span>;' },
    {
      name: 'focus:not-sr-only no es sr-only (el texto igual sale de t())',
      code: "const A = () => <a className=\"sr-only focus:not-sr-only\">{t('saltar')}</a>;",
    },
    { name: 'not-sr-only solo no es sr-only', code: 'const A = () => <span className="md:not-sr-only">Visible</span>;' },
    { name: 'sólo espacios', code: 'const A = () => <span className="sr-only">  </span>;' },
  ],
  invalid: [
    {
      name: 'JSXText directo',
      code: 'const A = () => <span className="sr-only">Close</span>;',
      errors: [{ messageId: 'textoFijo', data: { texto: 'Close' } }],
    },
    {
      name: 'en un descendiente de un elemento sr-only',
      code: 'const A = () => <SheetHeader className="sr-only"><SheetTitle>Sidebar</SheetTitle></SheetHeader>;',
      errors: [{ messageId: 'textoFijo', data: { texto: 'Sidebar' } }],
    },
    {
      name: 'string literal entre llaves',
      code: "const A = () => <span className=\"sr-only\">{'Cerrar'}</span>;",
      errors: [{ messageId: 'textoFijo' }],
    },
    {
      name: 'template literal sin expresiones',
      code: 'const A = () => <span className="sr-only">{`Cerrar`}</span>;',
      errors: [{ messageId: 'textoFijo' }],
    },
    {
      name: 'className armado con cn()',
      code: "const A = () => <span className={cn('sr-only', x)}>Cerrar</span>;",
      errors: [{ messageId: 'textoFijo' }],
    },
    {
      name: 'variante responsive: md:sr-only',
      code: 'const A = () => <span className="md:sr-only">Menú</span>;',
      errors: [{ messageId: 'textoFijo' }],
    },
  ],
});

describe('casos históricos: packages/ui antes de H-151 (e336a48)', () => {
  const FIX = path.join(aqui, 'fixtures', 'sin-texto-fijo-en-sr-only');
  const textosEncontrados = (archivo) => {
    const linter = new Linter({ configType: 'flat' });
    const mensajes = linter.verify(readFileSync(path.join(FIX, archivo), 'utf8'), [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: regla },
        rules: { 'local/sin-texto-fijo-en-sr-only': 'error' },
      },
    ], { filename: archivo });
    assert.equal(mensajes.filter((m) => m.fatal).length, 0, 'el fixture tiene que parsear');
    return mensajes.map((m) => m.message.match(/"([^"]*)"/)[1]);
  };

  it('sheet.tsx: encuentra "Close"', () => {
    assert.deepEqual(textosEncontrados('sheet-antes-de-H-151.tsx'), ['Close']);
  });

  it('sidebar.tsx: encuentra "Sidebar", "Displays the mobile sidebar." y "Toggle Sidebar"', () => {
    assert.deepEqual(textosEncontrados('sidebar-antes-de-H-151.tsx'), ['Sidebar', 'Displays the mobile sidebar.', 'Toggle Sidebar']);
  });
});
