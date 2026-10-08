import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvatarPersona } from '../src/components/avatar-persona.js';

/** spec 013 (H2.1, FR-018): foto con texto alternativo, o iniciales — nunca una caja vacía. */

test('con foto: <img> con el texto alternativo', () => {
  const html = renderToStaticMarkup(<AvatarPersona nombre="Ana" apellido="García" fotoUrl="https://x/foto.jpg" textoAlternativo="Foto de Ana García" />);
  assert.match(html, /^<img /);
  assert.ok(html.includes('alt="Foto de Ana García"'), html);
});

test('sin foto: las iniciales sobre --secondary, anunciadas con el texto alternativo', () => {
  const html = renderToStaticMarkup(<AvatarPersona nombre="José" apellido="Pérez" textoAlternativo="Foto de José Pérez" />);
  assert.ok(html.includes('>JP<'), html);
  assert.ok(html.includes('bg-secondary') && html.includes('text-secondary-foreground'), html);
  assert.ok(html.includes('role="img"') && html.includes('aria-label="Foto de José Pérez"'), html);
});

test('sin texto alternativo es decorativo (el nombre ya está al lado)', () => {
  assert.ok(renderToStaticMarkup(<AvatarPersona nombre="A" apellido="B" fotoUrl="https://x/f.jpg" />).includes('alt=""'));
  assert.ok(renderToStaticMarkup(<AvatarPersona nombre="A" apellido="B" />).includes('aria-hidden="true"'));
});
