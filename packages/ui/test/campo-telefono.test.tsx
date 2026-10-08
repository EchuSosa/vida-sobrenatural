import { test } from 'node:test';
import assert from 'node:assert/strict';
import { separarTelefono } from '../src/components/campo-telefono.js';

test('separarTelefono: con espacios, como lo guarda el alta', () => {
  assert.deepEqual(separarTelefono('+54 9 221 555 0101'), { codigoPais: '+54', numero: '92215550101' });
});

test('separarTelefono: sin espacio usa el código de la lista, no los primeros 4 dígitos', () => {
  assert.deepEqual(separarTelefono('+5492215550101'), { codigoPais: '+54', numero: '92215550101' });
  assert.deepEqual(separarTelefono('+598 99 123 456'), { codigoPais: '+598', numero: '99123456' });
  assert.deepEqual(separarTelefono('+1 555 0101'), { codigoPais: '+1', numero: '5550101' });
});

test('separarTelefono: sin código conocido o vacío → +54 y el número', () => {
  assert.deepEqual(separarTelefono('221 555 0101'), { codigoPais: '+54', numero: '2215550101' });
  assert.deepEqual(separarTelefono(''), { codigoPais: '+54', numero: '' });
});
