import { esItemActual } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, T022 (FR-023): la pestaña Mi camino queda marcada en sus subrutas,
 * en Mis discipulados y en Mi disponibilidad; las demás, solo en lo suyo.
 */
describe('esItemActual (spec 006, FR-023)', () => {
  const miCamino = { href: '/mi-camino', rutasRelacionadas: ['/mis-discipulados', '/mi-disponibilidad'] };
  const eventos = { href: '/mis-eventos' };

  it('Mi camino: su ruta, sus subrutas y las rutas relacionadas', () => {
    for (const ruta of ['/mi-camino', '/mi-camino/vida-nueva', '/mis-discipulados', '/mis-discipulados/x', '/mi-disponibilidad']) {
      expect({ ruta, actual: esItemActual(miCamino, ruta) }).toEqual({ ruta, actual: true });
    }
  });

  it('compara por segmento: un prefijo de texto no alcanza', () => {
    expect(esItemActual(miCamino, '/mi-caminos')).toBe(false);
    expect(esItemActual(miCamino, '/mis-eventos')).toBe(false);
    expect(esItemActual(eventos, '/mis-eventos')).toBe(true);
    expect(esItemActual(eventos, '/mi-camino')).toBe(false);
  });
});
