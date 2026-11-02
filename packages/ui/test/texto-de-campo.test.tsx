import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDeCampo } from '../src/lib/texto-de-campo.js';

// QA ronda 1, BUG-03: el texto de un error de campo sale de `errors.campos.<CODE>`, o de
// `errors.<CODE>` si el código vive ahí (ej. DIRECCION_NO_UBICADA), o del genérico.
const textos: Record<string, string> = {
  'campos.TELEFONO_INVALIDO': 'Ingresá un teléfono con código de área.',
  DIRECCION_NO_UBICADA: 'No encontramos esa dirección.',
};
const te = Object.assign((clave: string) => textos[clave] ?? clave, { has: (clave: string) => clave in textos });

test('usa errors.campos.<CODE> si existe', () => {
  assert.equal(textoDeCampo(te, 'TELEFONO_INVALIDO', 'Genérico'), 'Ingresá un teléfono con código de área.');
});

test('si no está en campos, usa errors.<CODE>', () => {
  assert.equal(textoDeCampo(te, 'DIRECCION_NO_UBICADA', 'Genérico'), 'No encontramos esa dirección.');
});

test('si no está en ningún lado, el genérico', () => {
  assert.equal(textoDeCampo(te, 'CODIGO_QUE_NO_EXISTE', 'Genérico'), 'Genérico');
});
