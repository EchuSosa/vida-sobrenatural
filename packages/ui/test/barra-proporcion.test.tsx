import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BarraProporcion } from '../src/components/barra-proporcion.js';

/** spec 013 (FR-023): decorativa, y nunca un ancho imposible (NaN con total 0, H3.4). */
test('decorativa y con el ancho del porcentaje', () => {
  const html = renderToStaticMarkup(<BarraProporcion porcentaje={37} />);
  assert.ok(html.includes('aria-hidden="true"'), html);
  assert.ok(html.includes('width:37%'), html);
});

test('recorta fuera de rango y trata NaN como 0', () => {
  assert.ok(renderToStaticMarkup(<BarraProporcion porcentaje={140} />).includes('width:100%'));
  assert.ok(renderToStaticMarkup(<BarraProporcion porcentaje={Number.NaN} />).includes('width:0%'));
});
