import { INVERSO_RELACION, iniciales, relacionDesde } from '@vida-sobrenatural/shared-types';

/** spec 013, T005 (research #6, D112): el vínculo visto desde cada lado, y las iniciales del avatar. */
describe('relacionDesde', () => {
  it('tutor: el menor (sujeto) ve a su tutor; el tutor (familiar) ve a quien tiene a cargo', () => {
    expect(relacionDesde('tutor', 'sujeto')).toBe('tutor_de');
    expect(relacionDesde('tutor', 'familiar')).toBe('a_cargo_de');
  });

  it('hijo_a y padre_madre son opuestas', () => {
    expect(relacionDesde('hijo_a', 'sujeto')).toBe('hijo_a');
    expect(relacionDesde('hijo_a', 'familiar')).toBe('padre_madre');
    expect(relacionDesde('padre_madre', 'sujeto')).toBe('padre_madre');
    expect(relacionDesde('padre_madre', 'familiar')).toBe('hijo_a');
  });

  it('conyuge y hermano_a son simétricas', () => {
    for (const tipo of ['conyuge', 'hermano_a'] as const) {
      expect(relacionDesde(tipo, 'sujeto')).toBe(tipo);
      expect(relacionDesde(tipo, 'familiar')).toBe(tipo);
    }
  });

  it('INVERSO_RELACION no tiene inversa para tutor (no se guarda "a cargo")', () => {
    expect(INVERSO_RELACION.tutor).toBeUndefined();
    expect(INVERSO_RELACION.hijo_a).toBe('padre_madre');
  });
});

describe('iniciales', () => {
  it('toma la primera letra del nombre y del apellido, en mayúscula y con tildes', () => {
    expect(iniciales('José', 'Pérez')).toBe('JP');
    expect(iniciales('élida', 'ñandú')).toBe('ÉÑ');
  });

  it('con apellido compuesto, solo la primera letra', () => {
    expect(iniciales('Ana María', 'De la Fuente Zabala')).toBe('AD');
  });

  it('con nombre vacío no rompe', () => {
    expect(iniciales('', 'García')).toBe('G');
    expect(iniciales('  ', '')).toBe('');
  });
});
