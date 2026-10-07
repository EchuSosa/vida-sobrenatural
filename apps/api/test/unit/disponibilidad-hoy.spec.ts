import { hoyEnArgentina, bloqueoVigente, diaCivilEnArgentina, formatearDiaEnArgentina } from '@vida-sobrenatural/shared-types';

/**
 * specs/004, T004 (research #7): la fecha civil de hoy en Argentina y la
 * vigencia de un bloqueo. Argentina es UTC-3, así que la medianoche local es
 * las 03:00 UTC; hay que probar que un instante de la noche no corre el día.
 */
describe('hoyEnArgentina', () => {
  it('las 23:30 de Argentina (02:30 UTC del día siguiente) siguen siendo el mismo día en Argentina', () => {
    // 2026-03-10 02:30 UTC = 2026-03-09 23:30 en Argentina.
    expect(hoyEnArgentina(new Date('2026-03-10T02:30:00Z'))).toBe('2026-03-09');
  });

  it('las 00:30 UTC (21:30 del día anterior en Argentina) caen el día anterior', () => {
    // 2026-03-10 00:30 UTC = 2026-03-09 21:30 en Argentina.
    expect(hoyEnArgentina(new Date('2026-03-10T00:30:00Z'))).toBe('2026-03-09');
  });

  it('el mediodía UTC cae el mismo día', () => {
    expect(hoyEnArgentina(new Date('2026-03-10T12:00:00Z'))).toBe('2026-03-10');
  });
});

describe('bloqueoVigente', () => {
  const b = { desde: '2026-03-10', hasta: '2026-03-20' };

  it('el día de inicio (inclusive) está vigente', () => {
    expect(bloqueoVigente(b, '2026-03-10')).toBe(true);
  });

  it('el día de fin (inclusive) está vigente', () => {
    expect(bloqueoVigente(b, '2026-03-20')).toBe(true);
  });

  it('un día en el medio está vigente', () => {
    expect(bloqueoVigente(b, '2026-03-15')).toBe(true);
  });

  it('el día anterior al inicio no está vigente', () => {
    expect(bloqueoVigente(b, '2026-03-09')).toBe(false);
  });

  it('el día posterior al fin no está vigente', () => {
    expect(bloqueoVigente(b, '2026-03-21')).toBe(false);
  });
});

describe('diaCivilEnArgentina y formatearDiaEnArgentina (fechas de instantes, Fase 2 del merge)', () => {
  it('un instante de las 22:30 de Argentina es de ese día, no del siguiente (el bug de leerlo en UTC)', () => {
    // 2026-09-28T01:30Z = 27/09 22:30 en Buenos Aires.
    expect(diaCivilEnArgentina('2026-09-28T01:30:00Z')).toBe('2026-09-27');
    expect(formatearDiaEnArgentina('2026-09-28T01:30:00Z', 'es')).toBe('27 de septiembre de 2026');
  });

  it('una fecha civil se muestra tal cual, sin correr el día', () => {
    expect(formatearDiaEnArgentina('2026-09-28', 'es')).toBe('28 de septiembre de 2026');
  });

  it('hoyEnArgentina es la misma función aplicada a "ahora"', () => {
    const ahora = new Date('2026-03-10T02:30:00Z');
    expect(hoyEnArgentina(ahora)).toBe(diaCivilEnArgentina(ahora));
  });
});
