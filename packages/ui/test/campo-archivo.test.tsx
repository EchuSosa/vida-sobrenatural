import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampoArchivo } from '../src/components/campo-archivo.js';

/** spec 011, T021 — FR-031: el error queda asociado al input; etiqueta y ayuda visibles. */
const props = {
  id: 'campo-archivo',
  etiqueta: 'Archivo del flyer',
  ayuda: 'JPG, PNG o WebP, hasta 5 MB.',
  textoBoton: 'Elegir archivo',
  textoSinArchivo: 'Ningún archivo elegido',
  accept: 'image/jpeg,image/png,image/webp',
  archivo: null,
  onElegir: () => {},
};

test('sin error: etiqueta asociada, ayuda y "ningún archivo" en aria-describedby', () => {
  const html = renderToStaticMarkup(<CampoArchivo {...props} />);
  assert.match(html, /<label for="campo-archivo"[^>]*>Archivo del flyer<\/label>/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html, /Ningún archivo elegido/);
  assert.doesNotMatch(html, /aria-invalid="/);
});

test('con error: el input queda inválido y su aria-describedby incluye el mensaje', () => {
  const html = renderToStaticMarkup(<CampoArchivo {...props} error="El flyer tiene que ser JPG, PNG o WebP." />);
  assert.match(html, /aria-invalid="true"/);
  const describedby = /aria-describedby="([^"]+)"/.exec(html)?.[1].split(' ') ?? [];
  const idError = /<p id="([^"]+)" class="[^"]*text-destructive[^"]*">El flyer tiene que ser JPG, PNG o WebP\.<\/p>/.exec(html)?.[1];
  assert.ok(idError, 'el mensaje de error se muestra');
  assert.ok(describedby.includes(idError!), 'el error está en aria-describedby');
});
