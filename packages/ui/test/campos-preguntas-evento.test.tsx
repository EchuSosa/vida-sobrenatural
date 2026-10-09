import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PreguntaEvento } from '@vida-sobrenatural/shared-types';
import { CamposPreguntasEvento } from '../src/components/campos-preguntas-evento.js';

/** spec 011, ampliación 2026-10-09 — FR-065 (H-50): cada respuesta con su id, su error asociado y la aclaración de lo sensible. */
const preguntas: PreguntaEvento[] = [
  { id: 'p1', texto: '¿Sos celíaca?', tipo: 'si_no', opciones: [], obligatoria: true, sensible: true },
  { id: 'p2', texto: '¿Participaste antes?', tipo: 'opcion', opciones: ['Sí, hace mucho', 'No, nunca'], obligatoria: false, sensible: false },
  { id: 'p3', texto: '¿Algo más?', tipo: 'texto', opciones: [], obligatoria: false, sensible: false },
];
const etiquetas = { si: 'Sí', no: 'No', opcional: '(opcional)', sensible: 'Solo lo ve el equipo que organiza; se borra 30 días después del evento' };
const render = (errores: Record<string, string> = {}) =>
  renderToStaticMarkup(<CamposPreguntasEvento preguntas={preguntas} valores={{ p2: 'No, nunca' }} onCambiar={() => {}} errores={errores} etiquetas={etiquetas} />);

test('Sí/No y Una opción son radios en un fieldset con el id del campo en la primera opción', () => {
  const html = render();
  assert.match(html, /<legend[^>]*>¿Sos celíaca\?<\/legend>/);
  assert.match(html, /id="campo-respuesta-p1"[^>]*value="si"/);
  assert.match(html, /<input type="radio"[^>]*value="No, nunca"[^>]*checked=""|<input type="radio"[^>]*checked=""[^>]*value="No, nunca"/);
  assert.match(html, /<label for="campo-respuesta-p3"[^>]*>¿Algo más\?<span[^>]*> \(opcional\)<\/span><\/label>/);
  assert.match(html, /maxLength="200"|maxlength="200"/);
});

test('la sensible lleva su aclaración asociada', () => {
  const html = render();
  assert.match(html, /id="campo-respuesta-p1-ayuda"[^>]*>.*Solo lo ve el equipo que organiza; se borra 30 días después del evento/);
  assert.match(html, /<fieldset[^>]*aria-describedby="campo-respuesta-p1-ayuda"/);
});

test('con error: el mensaje debajo y en aria-describedby', () => {
  const html = render({ 'respuesta-p1': 'Respondé esta pregunta.', 'respuesta-p3': 'Hasta 200 caracteres.' });
  const fieldset = /<fieldset[^>]*>/.exec(html)?.[0] ?? '';
  assert.match(fieldset, /aria-describedby="campo-respuesta-p1-error campo-respuesta-p1-ayuda"/);
  assert.match(fieldset, /aria-invalid="true"/);
  assert.match(html, /<p id="campo-respuesta-p1-error"[^>]*>Respondé esta pregunta\.<\/p>/);
  const input = /<input id="campo-respuesta-p3"[^>]*>/.exec(html)?.[0] ?? '';
  assert.match(input, /aria-invalid="true"/);
  assert.match(input, /aria-describedby="campo-respuesta-p3-error"/);
});
