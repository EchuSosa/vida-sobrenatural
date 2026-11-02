import { serializarPedido } from '../../src/common/logs/serializar-pedido.js';

/** docs/25, S-05: ni la query ni sus datos personales llegan al log. */
describe('serializarPedido (logs sin datos personales en la URL)', () => {
  it('saca la query de la URL y no loguea `query`', () => {
    const r = serializarPedido({
      id: 'abc',
      method: 'GET',
      url: '/personas/by-email?email=rosa%40example.com',
      query: { email: 'rosa@example.com' },
      params: {},
    });
    expect(r).toEqual({ id: 'abc', method: 'GET', url: '/personas/by-email', params: {} });
    expect(JSON.stringify(r)).not.toContain('rosa');
  });

  it('una búsqueda por nombre tampoco deja el nombre', () => {
    expect(JSON.stringify(serializarPedido({ url: '/personas?q=Rosa%20G%C3%B3mez', query: { q: 'Rosa Gómez' } }))).not.toMatch(/Rosa|G%C3%B3mez/);
  });

  it('sin query, la URL queda igual', () => {
    expect(serializarPedido({ url: '/sedes', method: 'GET' })).toEqual({ url: '/sedes', method: 'GET' });
  });
});
