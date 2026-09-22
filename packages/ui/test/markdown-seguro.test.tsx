import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownSeguro } from '../src/components/markdown-seguro.js';

/**
 * H-90/D127: los tres tests que el hallazgo pide explícitamente, no
 * opcionales — si alguno no se pudiera escribir, el diseño estaría mal.
 * `renderToStaticMarkup` alcanza (sin servidor, sin navegador) porque el
 * componente es 100% síncrono y no toca `window`.
 */

function render(texto: string): string {
  return renderToStaticMarkup(<MarkdownSeguro texto={texto} />);
}

test('un <script> en el texto se renderiza inofensivo (no como una etiqueta real)', () => {
  const html = render('Hola <script>alert(1)</script> mundo.');
  assert.ok(!html.includes('<script'), `no debería haber un <script> real: ${html}`);
});

test('un enlace javascript: se renderiza inofensivo (sin ese href)', () => {
  const html = render('[hacé clic acá](javascript:alert(1))');
  assert.ok(!html.includes('javascript:'), `no debería sobrevivir el esquema javascript:: ${html}`);
});

test('un h1 escrito a mano no se vuelve un <h1> (la página ya tiene el suyo)', () => {
  const html = render('# Título escrito a mano\n\nTexto después.');
  assert.ok(!html.includes('<h1'), `no debería renderizarse un <h1>: ${html}`);
  // Inofensivo, no invisible: el texto sigue ahí, sin la marca de encabezado.
  assert.ok(html.includes('Título escrito a mano'), 'el texto del h1 debería seguir presente, sin la etiqueta');
});

test('un enlace http/https válido sí se renderiza, con rel="noopener noreferrer" forzado', () => {
  const html = render('[la fuente](https://ejemplo.org/articulo)');
  assert.ok(html.includes('href="https://ejemplo.org/articulo"'), html);
  assert.ok(html.includes('rel="noopener noreferrer"'), html);
});

test('negrita, itálica, listas, h2 y h3 sí se renderizan (el conjunto permitido funciona)', () => {
  const html = render('## Un h2\n\n### Un h3\n\n**negrita** y *itálica*.\n\n- uno\n- dos');
  assert.ok(html.includes('<h2>Un h2</h2>'), html);
  assert.ok(html.includes('<h3>Un h3</h3>'), html);
  assert.ok(html.includes('<strong>negrita</strong>'), html);
  assert.ok(html.includes('<em>itálica</em>'), html);
  assert.ok(html.includes('<ul>') && html.includes('<li>uno</li>'), html);
});

test('Markdown vacío de marcas (texto plano) se sigue leyendo como texto plano', () => {
  const html = render('Un texto provisorio, sin ninguna marca de Markdown.');
  assert.ok(html.includes('Un texto provisorio, sin ninguna marca de Markdown.'), html);
  assert.ok(!html.includes('<strong'), html);
  assert.ok(!html.includes('<h1') && !html.includes('<h2') && !html.includes('<h3'), html);
});
