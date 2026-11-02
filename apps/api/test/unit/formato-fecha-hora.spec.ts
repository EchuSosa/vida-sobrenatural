import { formatearFechaHora, formatearHoraEnArgentina } from '@vida-sobrenatural/shared-types';

/**
 * Fallas conocidas (docs/24, 2026-11-01): `formatearFechaHora` no fijaba la zona y dependía del
 * patrón de unión del ICU de cada motor (error de hidratación en el backoffice). Tiene que dar el
 * mismo texto venga de donde venga, y siempre en la hora de Argentina.
 */
describe('formatearFechaHora', () => {
  it('fecha y hora de Argentina, en 24 h, unidas con coma', () => {
    expect(formatearFechaHora('2026-10-13T14:00:00Z', 'es')).toBe('13 de octubre de 2026, 11:00');
  });

  it('pasada la medianoche en UTC sigue siendo el día anterior en Argentina', () => {
    expect(formatearFechaHora('2026-09-28T01:30:00Z', 'es')).toBe('27 de septiembre de 2026, 22:30');
  });

  it('no depende de la zona del proceso (el servidor en producción corre en UTC)', () => {
    const zona = process.env.TZ;
    try {
      for (const tz of ['UTC', 'America/Argentina/Buenos_Aires', 'Asia/Tokyo']) {
        process.env.TZ = tz;
        expect(formatearFechaHora(new Date('2026-10-13T14:00:00Z'), 'es')).toBe('13 de octubre de 2026, 11:00');
      }
    } finally {
      process.env.TZ = zona;
    }
  });

  it('la hora sola, en 24 h', () => {
    expect(formatearHoraEnArgentina('2026-10-13T21:05:00Z', 'es')).toBe('18:05');
  });
});
