import { formatearInicioEvento, instanteEnArgentina, partesEnArgentina } from '@vida-sobrenatural/shared-types';

/** spec 011, T004 — research #15: la hora es siempre la de la iglesia. */
describe('fechas de Eventos en la zona de Argentina', () => {
  it('23:30 del 14 en Argentina es 02:30Z del 15', () => {
    expect(instanteEnArgentina('2026-11-14', '23:30').toISOString()).toBe('2026-11-15T02:30:00.000Z');
  });

  it('partesEnArgentina es la inversa (para precargar el formulario)', () => {
    expect(partesEnArgentina('2026-11-15T02:30:00.000Z')).toEqual({ fecha: '2026-11-14', hora: '23:30' });
  });

  it('formatea el inicio con el día de la semana y la hora de Argentina', () => {
    expect(formatearInicioEvento('2026-11-14T22:00:00Z', null, 'es')).toBe('sábado 14 de noviembre, 19:00');
  });

  it('con fin el mismo día: "… 19:00 a 21:00"', () => {
    expect(formatearInicioEvento('2026-11-14T22:00:00Z', '2026-11-15T00:00:00Z', 'es')).toBe('sábado 14 de noviembre, 19:00 a 21:00');
  });

  it('rango de varios días: "… al domingo 15 de noviembre, 13:00"', () => {
    expect(formatearInicioEvento('2026-11-14T22:00:00Z', '2026-11-15T16:00:00Z', 'es')).toBe(
      'sábado 14 de noviembre, 19:00 al domingo 15 de noviembre, 13:00',
    );
  });
});
