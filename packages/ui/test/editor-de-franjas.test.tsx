import { test } from 'node:test';
import assert from 'node:assert/strict';
import { franjaPendiente } from '../src/components/editor-de-franjas.js';

/**
 * ajustes-ux #40: lo que está elegido en los selectores y todavía no se
 * agregó. La pantalla lo toma al enviar con la lista vacía, en vez de
 * pedirle a la persona que agregue lo que cree que ya agregó.
 */

test('una franja válida y nueva se puede tomar tal cual', () => {
  assert.deepEqual(franjaPendiente(2, '19:00', '21:00', []), { diaSemana: 2, inicio: 1140, fin: 1260 });
});

test('si la hora de fin no es posterior, no hay franja pendiente', () => {
  assert.equal(franjaPendiente(2, '19:00', '18:00', []), null);
});

test('si ya está cargada (o la pisa), no hay franja pendiente', () => {
  const cargadas = [{ diaSemana: 2, inicio: 1140, fin: 1260 }];
  assert.equal(franjaPendiente(2, '19:00', '21:00', cargadas), null);
  assert.equal(franjaPendiente(2, '20:00', '22:00', cargadas), null);
});
