import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampoFecha, componerFecha, partirFecha } from '../src/components/campo-fecha.js';
import { CampoHora } from '../src/components/campo-hora.js';

/**
 * H-R10: el campo de fecha propio (Día / Mes / Año) reemplaza a
 * `<input type="date">`, que en Safari no entregaba el valor. El valor sigue
 * siendo `AAAA-MM-DD`, o `''` mientras falte algo o la fecha no exista.
 */

const ETIQUETAS = {
  dia: 'Día',
  mes: 'Mes',
  anio: 'Año',
  meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

test('componerFecha: tres partes válidas → AAAA-MM-DD con ceros', () => {
  assert.equal(componerFecha({ dia: '5', mes: '3', anio: '1960' }), '1960-03-05');
  assert.equal(componerFecha({ dia: '29', mes: '2', anio: '2024' }), '2024-02-29');
});

test('componerFecha: incompleta o inexistente → vacío', () => {
  assert.equal(componerFecha({ dia: '', mes: '3', anio: '1960' }), '');
  assert.equal(componerFecha({ dia: '5', mes: '', anio: '1960' }), '');
  assert.equal(componerFecha({ dia: '5', mes: '3', anio: '196' }), '');
  assert.equal(componerFecha({ dia: '31', mes: '2', anio: '2026' }), '');
  assert.equal(componerFecha({ dia: '29', mes: '2', anio: '2026' }), '');
  assert.equal(componerFecha({ dia: '0', mes: '1', anio: '2026' }), '');
});

test('partirFecha: ida y vuelta, y vacío para lo que no es una fecha', () => {
  assert.deepEqual(partirFecha('1960-03-05'), { dia: '5', mes: '3', anio: '1960' });
  assert.deepEqual(partirFecha(''), { dia: '', mes: '', anio: '' });
  assert.equal(componerFecha(partirFecha('2026-12-31')), '2026-12-31');
});

test('CampoFecha vacío se ve vacío: ninguna casilla trae un valor', () => {
  const html = renderToStaticMarkup(<CampoFecha id="campo-desde" etiqueta="Desde" value="" onChange={() => {}} etiquetas={ETIQUETAS} />);
  assert.ok(html.includes('<legend'), html);
  assert.ok(html.includes('id="campo-desde"'), html);
  assert.ok(!/<input[^>]*value="\d/.test(html), `ninguna casilla debería traer un número: ${html}`);
  assert.ok(html.includes('<option value="" selected="">'), `el mes debería arrancar sin elegir: ${html}`);
});

test('CampoHora: siempre 24 h, y un minuto guardado fuera de la lista se muestra igual', () => {
  const html = renderToStaticMarkup(<CampoHora id="campo-desde" etiqueta="Desde" value="22:31" onChange={() => {}} etiquetas={{ hora: 'Hora', minutos: 'Minutos' }} />);
  assert.ok(html.includes('<option value="23">23</option>'), html);
  assert.ok(!/p\.m\.|a\.m\./.test(html), html);
  assert.ok(html.includes('<option value="31" selected="">31</option>'), html);
});
