import { extractoDe } from '../../src/notificaciones/extracto.js';
import { destinoDeAviso } from '../../src/notificaciones/avisos.service.js';

/** spec 012, T020 — FR-002 (extracto) y FR-003 (destino). */
describe('extractoDe (FR-002)', () => {
  it('un mensaje corto queda entero', () => {
    expect(extractoDe('Este domingo hay culto a las 19.')).toBe('Este domingo hay culto a las 19.');
  });

  it('exactamente 140 caracteres queda entero', () => {
    const m = 'a'.repeat(140);
    expect(extractoDe(m)).toBe(m);
  });

  it('141 o más corta en el último espacio y agrega "…"', () => {
    const m = `${'palabra '.repeat(20)}final`; // 165 caracteres
    const e = extractoDe(m);
    expect(e.endsWith('palabra…')).toBe(true);
    expect(e.length).toBeLessThanOrEqual(141);
    expect(e).not.toMatch(/\s…$/);
  });

  it('sin espacios corta a 140 en seco', () => {
    expect(extractoDe('x'.repeat(300))).toBe(`${'x'.repeat(140)}…`);
  });

  it('los saltos de línea cuentan como un espacio', () => {
    expect(extractoDe('Hola\n\nmundo')).toBe('Hola mundo');
  });
});

describe('destinoDeAviso (FR-003)', () => {
  it('manual → el aviso completo', () => {
    expect(destinoDeAviso('e1', { tipo: 'manual', evento: null, params: null })).toBe('/avisos/e1');
  });

  it('automático → el destino del catálogo', () => {
    expect(destinoDeAviso('e1', { tipo: 'automatica', evento: 'evento.cancelado', params: { eventoId: 'x', evento: 'R', slug: 'retiro' } })).toBe('/eventos/retiro');
  });

  it('un evento que no está en el catálogo → el aviso completo', () => {
    expect(destinoDeAviso('e1', { tipo: 'automatica', evento: 'algo.que_no_existe', params: {} })).toBe('/avisos/e1');
  });
});
