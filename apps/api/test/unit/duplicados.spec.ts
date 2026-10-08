import { normalizarTelefono, sinAccesoALaApp, sonPosiblesDuplicados } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, T007 (FR-035, research #7, SC-007): cuándo dos Personas pueden ser
 * la misma — aviso del alta por el Admin (D145).
 */
const rosa = { nombre: 'Rosa', apellido: 'Gómez', fechaNacimiento: '1948-03-12', telefono: '+54 9 221 555 0101' };

describe('sonPosiblesDuplicados (spec 006, T007)', () => {
  it('el mismo teléfono escrito de tres formas coincide', () => {
    for (const telefono of ['+54 221 5550101', '+549221 5550101', '+54 9 2215550101']) {
      expect(sonPosiblesDuplicados(rosa, { ...rosa, nombre: 'Otra', fechaNacimiento: '1990-01-01', telefono })).toEqual(['telefono']);
    }
  });

  it('el mismo número en otro país no coincide', () => {
    expect(normalizarTelefono('+598 221 5550101')).not.toBe(normalizarTelefono('+54 221 5550101'));
    expect(sonPosiblesDuplicados(rosa, { ...rosa, nombre: 'Otra', fechaNacimiento: '1990-01-01', telefono: '+598 221 5550101' })).toEqual([]);
  });

  it('nombre + apellido + fecha, sin importar tildes, mayúsculas ni espacios', () => {
    const otra = { nombre: '  ROSA ', apellido: 'gomez', fechaNacimiento: '1948-03-12T00:00:00.000Z', telefono: '+54 9 11 4000 0000' };
    expect(sonPosiblesDuplicados(rosa, otra)).toEqual(['nombre_apellido_fecha']);
  });

  it('un homónimo con otra fecha de nacimiento no es posible duplicado', () => {
    expect(sonPosiblesDuplicados(rosa, { ...rosa, fechaNacimiento: '1949-03-12', telefono: '+54 9 11 4000 0000' })).toEqual([]);
  });

  it('las dos cosas a la vez', () => {
    expect(sonPosiblesDuplicados(rosa, { ...rosa })).toEqual(['telefono', 'nombre_apellido_fecha']);
  });
});

describe('sinAccesoALaApp (spec 006, FR-037)', () => {
  it('sin email (o vacío) no hay acceso', () => {
    expect(sinAccesoALaApp({ email: null })).toBe(true);
    expect(sinAccesoALaApp({ email: '  ' })).toBe(true);
    expect(sinAccesoALaApp({ email: 'rosa@ejemplo.com' })).toBe(false);
  });
});
