import { calcularEdad } from '../../src/persona/calcular-edad.js';

describe('calcularEdad', () => {
  it('devuelve 18 el mismo día que la persona cumple 18 años', () => {
    const hoy = new Date(Date.UTC(2026, 5, 15)); // 15/06/2026
    const fechaNacimiento = new Date(Date.UTC(2008, 5, 15)); // 15/06/2008
    expect(calcularEdad(fechaNacimiento, hoy)).toBe(18);
  });

  it('devuelve 17 un día antes de cumplir 18 años', () => {
    const hoy = new Date(Date.UTC(2026, 5, 14)); // 14/06/2026
    const fechaNacimiento = new Date(Date.UTC(2008, 5, 15)); // 15/06/2008
    expect(calcularEdad(fechaNacimiento, hoy)).toBe(17);
  });

  it('devuelve 18 un día después de cumplir 18 años', () => {
    const hoy = new Date(Date.UTC(2026, 5, 16)); // 16/06/2026
    const fechaNacimiento = new Date(Date.UTC(2008, 5, 15)); // 15/06/2008
    expect(calcularEdad(fechaNacimiento, hoy)).toBe(18);
  });

  it('resta uno cuando todavía no llegó el mes de cumpleaños este año', () => {
    const hoy = new Date(Date.UTC(2026, 2, 1)); // marzo 2026
    const fechaNacimiento = new Date(Date.UTC(2008, 5, 15)); // junio 2008
    expect(calcularEdad(fechaNacimiento, hoy)).toBe(17);
  });
});
