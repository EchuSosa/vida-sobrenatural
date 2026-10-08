import { decidirEstadoInicial, liberaLugar } from '../../src/evento/motor-cupo.js';

/** spec 011, T013 (las dos funciones puras) — FR-015, FR-016, FR-047. */
describe('decidirEstadoInicial', () => {
  const general = { tipo: 'general' as const, requiereAprobacion: false, cupo: 2, permiteListaEspera: false };

  it('sin cupo → confirmada', () => {
    expect(decidirEstadoInicial({ ...general, cupo: null }, 1000)).toBe('confirmada');
  });
  it('con lugar → confirmada', () => {
    expect(decidirEstadoInicial(general, 1)).toBe('confirmada');
  });
  it('con lugar y aprobación → pendiente', () => {
    expect(decidirEstadoInicial({ ...general, requiereAprobacion: true }, 0)).toBe('pendiente');
  });
  it('lleno con lista → lista_espera', () => {
    expect(decidirEstadoInicial({ ...general, permiteListaEspera: true }, 2)).toBe('lista_espera');
  });
  it('lleno sin lista → CUPO_LLENO', () => {
    expect(() => decidirEstadoInicial(general, 2)).toThrow(expect.objectContaining({ code: 'CUPO_LLENO' }));
  });
  it('bautismo con lugar → confirmada (nunca pendiente)', () => {
    expect(decidirEstadoInicial({ ...general, tipo: 'bautismo', requiereAprobacion: true }, 0)).toBe('confirmada');
  });
  it('bautismo lleno → CUPO_LLENO aunque diga lista (FR-047)', () => {
    expect(() => decidirEstadoInicial({ ...general, tipo: 'bautismo', permiteListaEspera: true }, 2)).toThrow(
      expect.objectContaining({ code: 'CUPO_LLENO' }),
    );
  });
});

describe('liberaLugar', () => {
  it.each([
    ['confirmada', true],
    ['pendiente', true],
    ['lista_espera', false],
    ['rechazada', false],
    ['cancelada', false],
  ] as const)('%s → %s', (estado, esperado) => {
    expect(liberaLugar(estado)).toBe(esperado);
  });
});
