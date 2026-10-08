import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BotonConfirmar, TEXTO_VOLVER_POR_DEFECTO } from '../src/components/confirm-destructive-dialog.js';

/**
 * D151: el tono decide el aspecto de la confirmación. `destructivo` (lo que
 * no se deshace): botón rojo con ícono. `neutro` (lo reversible): botón
 * principal, sin rojo ni ícono de advertencia. El "Cancelar" por defecto
 * pasa a "Volver" (docs/15: "Cancelar" choca con la acción de negocio).
 */

test('destructivo: botón rojo con ícono', () => {
  const html = renderToStaticMarkup(<BotonConfirmar tono="destructivo" onClick={() => {}}>Sí, eliminar</BotonConfirmar>);
  assert.ok(html.includes('bg-destructive'), html);
  assert.ok(html.includes('<svg'), html);
  assert.ok(html.includes('Sí, eliminar'), html);
});

test('neutro: sin rojo y sin ícono de advertencia', () => {
  const html = renderToStaticMarkup(<BotonConfirmar tono="neutro" onClick={() => {}}>Sí, retirar el pedido</BotonConfirmar>);
  assert.ok(!html.includes('bg-destructive'), html);
  assert.ok(html.includes('bg-primary'), html);
  assert.ok(!html.includes('lucide-triangle-alert'), html);
});

test('el texto para cerrar sin hacer nada es "Volver", no "Cancelar"', () => {
  assert.equal(TEXTO_VOLVER_POR_DEFECTO, 'Volver');
});
