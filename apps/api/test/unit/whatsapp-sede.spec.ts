import {
  enlaceWhatsapp,
  formatearWhatsappArgentino,
  normalizarWhatsappArgentino,
} from '@vida-sobrenatural/shared-types';

/**
 * D218: el WhatsApp de Secretaría de la Sede es un celular argentino y se
 * guarda normalizado como lo pide `wa.me` (549 + característica + número,
 * sin 0 ni 15), escriba como lo escriba el Admin.
 */
describe('normalizarWhatsappArgentino (D218)', () => {
  it.each([
    ['221 555 0101', '5492215550101'],
    ['2215550101', '5492215550101'],
    ['0221 15 555-0101', '5492215550101'],
    ['221 15 555 0101', '5492215550101'],
    ['+54 9 221 555-0101', '5492215550101'],
    ['+54 221 555 0101', '5492215550101'],
    ['549 221 5550101', '5492215550101'],
    ['11 4555 0101', '5491145550101'],
    ['011 15 4555-0101', '5491145550101'],
    ['(0351) 15-455-0101', '5493514550101'],
  ])('"%s" → %s', (entrada, esperado) => {
    expect(normalizarWhatsappArgentino(entrada)).toBe(esperado);
  });

  it.each(['', '   ', '123', '555 0101', 'hola', '221 555 01011234', '+1 202 555 0101', '0800 555 0101'])(
    'rechaza "%s"',
    (entrada) => {
      expect(normalizarWhatsappArgentino(entrada)).toBeNull();
    },
  );

  it('arma el enlace de wa.me y lo muestra legible', () => {
    expect(enlaceWhatsapp('5492215550101')).toBe('https://wa.me/5492215550101');
    expect(formatearWhatsappArgentino('5492215550101')).toBe('+54 9 221 555-0101');
  });
});
