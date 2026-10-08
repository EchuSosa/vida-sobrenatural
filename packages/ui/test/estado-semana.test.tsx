import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EstadoSemana } from '../src/components/estado-semana.js';

const textos = {
  liberada: 'Disponible',
  proxima: 'Próximamente',
  sin_material: 'Sin material',
  cargado_por_liberar: 'Cargado, se ve el día de la fecha',
  vencida_sin_material: 'Ya pasó la fecha y falta el material',
} as const;

/** spec 008, T015 (D81): cada estado tiene su texto y un ícono decorativo; nunca solo color. */
test('cada estado muestra su texto y el ícono es decorativo', () => {
  for (const estado of Object.keys(textos) as Array<keyof typeof textos>) {
    const html = renderToStaticMarkup(<EstadoSemana estado={estado} textos={textos} />);
    assert.ok(html.includes(textos[estado]), html);
    assert.ok(html.includes('aria-hidden="true"'), html);
    assert.ok(html.includes(`data-estado="${estado}"`), html);
  }
});
