import { correspondeAlEvento, edadCumplidaEn, tieneRestriccionDeDestinatarios, type DestinatariosEvento } from '@vida-sobrenatural/shared-types';

/** spec 011, ampliación 2026-10-09 — FR-060, FR-061 (D229): quién está entre los destinatarios. */
const mujeresDesde15: DestinatariosEvento = { genero: 'mujeres', edadMinima: 15, edadMaxima: null };
// 14/11/2026 a las 10 de Argentina.
const INICIO = '2026-11-14T13:00:00.000Z';

describe('edadCumplidaEn', () => {
  it('cuenta años cumplidos al día civil de Argentina', () => {
    expect(edadCumplidaEn('2011-11-14', INICIO)).toBe(15);
    expect(edadCumplidaEn('2011-11-15', INICIO)).toBe(14);
    expect(edadCumplidaEn(new Date('2000-02-29T00:00:00.000Z'), '2026-02-28')).toBe(25);
  });
  it('un evento a las 23:30 de Argentina cae en ese día, no en el siguiente de UTC', () => {
    expect(edadCumplidaEn('2011-11-15', '2026-11-15T02:30:00.000Z')).toBe(14);
  });
});

describe('correspondeAlEvento (FR-061)', () => {
  it('una mujer de 20 corresponde; un varón no; una de 14 no', () => {
    expect(correspondeAlEvento({ genero: 'femenino', fechaNacimiento: '2006-03-01' }, mujeresDesde15, INICIO)).toBe(true);
    expect(correspondeAlEvento({ genero: 'masculino', fechaNacimiento: '2006-03-01' }, mujeresDesde15, INICIO)).toBe(false);
    expect(correspondeAlEvento({ genero: 'femenino', fechaNacimiento: '2012-01-01' }, mujeresDesde15, INICIO)).toBe(false);
  });
  it('cumple 15 el mismo día del Evento: corresponde', () => {
    expect(correspondeAlEvento({ genero: 'femenino', fechaNacimiento: '2011-11-14' }, mujeresDesde15, INICIO)).toBe(true);
  });
  it('edad máxima inclusiva y "todas las personas" sin límites', () => {
    const jovenes: DestinatariosEvento = { genero: 'todas', edadMinima: null, edadMaxima: 30 };
    expect(correspondeAlEvento({ genero: 'masculino', fechaNacimiento: '1996-11-14' }, jovenes, INICIO)).toBe(true);
    expect(correspondeAlEvento({ genero: 'masculino', fechaNacimiento: '1995-11-13' }, jovenes, INICIO)).toBe(false);
    const todas: DestinatariosEvento = { genero: 'todas', edadMinima: null, edadMaxima: null };
    expect(correspondeAlEvento({ genero: 'masculino', fechaNacimiento: '1950-01-01' }, todas, INICIO)).toBe(true);
    expect(tieneRestriccionDeDestinatarios(todas)).toBe(false);
    expect(tieneRestriccionDeDestinatarios(jovenes)).toBe(true);
  });
  it('varones', () => {
    const varones: DestinatariosEvento = { genero: 'varones', edadMinima: null, edadMaxima: null };
    expect(correspondeAlEvento({ genero: 'masculino', fechaNacimiento: '1990-01-01' }, varones, INICIO)).toBe(true);
    expect(correspondeAlEvento({ genero: 'femenino', fechaNacimiento: '1990-01-01' }, varones, INICIO)).toBe(false);
  });
});
