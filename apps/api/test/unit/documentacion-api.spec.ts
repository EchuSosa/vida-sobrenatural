import { montarDocumentacionApi } from '../../src/common/documentacion-api.js';

/** docs/25, S-07: Swagger no queda publicado en producción. */
describe('montarDocumentacionApi', () => {
  it('en desarrollo y en los tests, sí', () => {
    expect(montarDocumentacionApi({ NODE_ENV: 'development' })).toBe(true);
    expect(montarDocumentacionApi({ NODE_ENV: 'test' })).toBe(true);
    expect(montarDocumentacionApi({})).toBe(true);
  });
  it('en producción, no', () => {
    expect(montarDocumentacionApi({ NODE_ENV: 'production' })).toBe(false);
  });
  it('en producción solo si se pide a propósito', () => {
    expect(montarDocumentacionApi({ NODE_ENV: 'production', SWAGGER_EN_PRODUCCION: 'true' })).toBe(true);
  });
});
