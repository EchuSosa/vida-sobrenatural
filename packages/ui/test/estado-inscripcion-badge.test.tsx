import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EstadoInscripcionBadge, type EstadoParaBadge } from '../src/components/estado-inscripcion-badge.js';

/** spec 011, T021 — D81: ningún estado va sin texto; el ícono es decorativo. */
const ESTADOS: EstadoParaBadge[] = ['confirmada', 'pendiente', 'lista_espera', 'rechazada', 'cancelada', 'sin_pago', 'pendiente_verificacion', 'verificado'];

for (const estado of ESTADOS) {
  test(`${estado}: lleva el texto visible y un ícono oculto al lector`, () => {
    const html = renderToStaticMarkup(<EstadoInscripcionBadge estado={estado} texto={`Texto de ${estado}`} />);
    assert.match(html, new RegExp(`Texto de ${estado}`));
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
  });
}
