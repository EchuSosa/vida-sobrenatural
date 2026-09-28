import { franjasCoinciden, MINUTOS_MINIMOS_EN_COMUN } from '@vida-sobrenatural/shared-types';

/**
 * specs/004, T002a (FR-033): dos franjas coinciden si son del mismo día de la
 * semana y comparten al menos MINUTOS_MINIMOS_EN_COMUN (60). Es el corazón de
 * la regla de horario del cruce; se prueba sola, sin base.
 */
describe('franjasCoinciden', () => {
  const f = (diaSemana: number, inicio: number, fin: number) => ({ diaSemana, inicio, fin });

  it('mismo día con 60 minutos exactos en común → sí', () => {
    // martes 18:00–19:00 y martes 18:00–20:00 → 60 min.
    expect(franjasCoinciden(f(2, 1080, 1140), f(2, 1080, 1200))).toBe(true);
  });

  it('mismo día con 59 minutos en común → no', () => {
    // martes 18:00–18:59 y martes 18:00–20:00 → 59 min.
    expect(franjasCoinciden(f(2, 1080, 1139), f(2, 1080, 1200))).toBe(false);
  });

  it('distinto día, aunque las horas se pisen → no', () => {
    expect(franjasCoinciden(f(2, 1080, 1200), f(3, 1080, 1200))).toBe(false);
  });

  it('una franja contenida dentro de otra, con más de 60 min → sí', () => {
    // sábado 10:00–13:00 contiene 10:30–12:30 (120 min).
    expect(franjasCoinciden(f(6, 600, 780), f(6, 630, 750))).toBe(true);
  });

  it('bordes que se tocan (fin de una = inicio de la otra) → no (0 min en común)', () => {
    expect(franjasCoinciden(f(2, 1080, 1140), f(2, 1140, 1260))).toBe(false);
  });

  it('el mínimo es configurable', () => {
    // 30 min en común: no con el default (60), sí con minimo=30.
    const a = f(2, 1080, 1110);
    const b = f(2, 1080, 1200);
    expect(franjasCoinciden(a, b)).toBe(false);
    expect(franjasCoinciden(a, b, 30)).toBe(true);
    expect(MINUTOS_MINIMOS_EN_COMUN).toBe(60);
  });
});
