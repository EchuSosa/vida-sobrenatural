import { cumpleanosEsteAnio, festejoEnAnio, hoyEnArgentina, proximoCumpleanos, sumarDias } from '@vida-sobrenatural/shared-types';

/** spec 013, T007 (H4.1–H4.3, FR-032, FR-033). */
describe('cumpleaños', () => {
  it('H4.1: hoy es el cumpleaños', () => {
    expect(proximoCumpleanos('1992-10-07', '2026-10-07')).toEqual({ fecha: '2026-10-07', dia: 7, cumple: 34, yaPaso: false, esHoy: true });
  });

  it('mañana', () => {
    expect(proximoCumpleanos('2000-10-08', '2026-10-07')).toMatchObject({ fecha: '2026-10-08', cumple: 26, esHoy: false });
  });

  it('H4.3 / FR-032: el 29/2 cae el 29 en bisiesto y el 28 si no', () => {
    expect(festejoEnAnio('2000-02-29', 2028)).toBe('2028-02-29');
    expect(festejoEnAnio('2000-02-29', 2027)).toBe('2027-02-28');
    expect(cumpleanosEsteAnio('2000-02-29', '2026-10-07')).toMatchObject({ fecha: '2026-02-28', dia: 28, cumple: 26, yaPaso: true });
  });

  it('el 31/12 visto el 28/12 y un 2/1 visto el 28/12 (cruza el año)', () => {
    expect(proximoCumpleanos('1990-12-31', '2026-12-28')).toMatchObject({ fecha: '2026-12-31', cumple: 36 });
    expect(proximoCumpleanos('1990-01-02', '2026-12-28')).toMatchObject({ fecha: '2027-01-02', cumple: 37, yaPaso: false });
    expect(sumarDias('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('H4.4: un mes que ya pasó dice "cumplió"', () => {
    expect(cumpleanosEsteAnio('1980-01-15', '2026-10-07')).toMatchObject({ fecha: '2026-01-15', cumple: 46, yaPaso: true, esHoy: false });
  });

  it('H4.2 / FR-033: a las 02:30 UTC del 7, en Argentina todavía es el 6', () => {
    const hoy = hoyEnArgentina(new Date('2026-10-07T02:30:00Z'));
    expect(hoy).toBe('2026-10-06');
    expect(proximoCumpleanos('1990-10-06', hoy).esHoy).toBe(true);
  });
});
