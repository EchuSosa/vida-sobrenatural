import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, buttonVariants } from '../src/components/ui/button.js';
import { Input } from '../src/components/ui/input.js';

/**
 * D150: en `apps/web` (que marca su <body> con `data-tactil`) todo `Button`
 * mide al menos 44 px de alto y lleva letra de 16 px, sea cual sea su
 * tamaño; en el backoffice (sin la marca) los tamaños quedan como estaban.
 * Por eso no se cambia el `size` por defecto: se suma la variante `tactil:`.
 */

const TAMANOS_DE_TEXTO = ['default', 'sm', 'lg', 'xl'] as const;
const TAMANOS_DE_ICONO = ['icon', 'icon-sm', 'icon-lg'] as const;

for (const size of TAMANOS_DE_TEXTO) {
  test(`size="${size}": 44 px y 16 px dentro de [data-tactil]`, () => {
    const clases = buttonVariants({ size });
    assert.ok(clases.includes('tactil:min-h-11'), clases);
    assert.ok(clases.includes('tactil:text-base'), clases);
  });
}

for (const size of TAMANOS_DE_ICONO) {
  test(`size="${size}": área de 44×44 dentro de [data-tactil]`, () => {
    const clases = buttonVariants({ size });
    assert.ok(clases.includes('tactil:min-h-11') && clases.includes('tactil:min-w-11'), clases);
  });
}

test('fuera de [data-tactil] (backoffice) el default sigue en h-8', () => {
  const html = renderToStaticMarkup(<Button>Guardar</Button>);
  assert.ok(html.includes('h-8'), html);
});

test('los campos también llegan a 44 px y 16 px en [data-tactil]', () => {
  const html = renderToStaticMarkup(<Input aria-label="x" />);
  assert.ok(html.includes('tactil:min-h-11'), html);
  assert.ok(html.includes('tactil:md:text-base'), html);
});

test('theme.css define la variante `tactil` para las dos apps', () => {
  const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  assert.match(css, /@custom-variant tactil \(&:where\(\[data-tactil\] \*\)\);/);
});
