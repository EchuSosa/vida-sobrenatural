import { resumirNavegador } from '@vida-sobrenatural/shared-types';

/** spec 013, T017 (FR-042, research #10): familia + versión mayor + sistema, nunca el user agent entero. */
describe('resumirNavegador (spec 013 T017)', () => {
  it('Chrome en Android', () => {
    expect(resumirNavegador('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36')).toBe('Chrome 141 · Android');
  });
  it('Safari en iOS', () => {
    expect(resumirNavegador('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')).toBe('Safari 17 · iOS');
  });
  it('Firefox de escritorio', () => {
    expect(resumirNavegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('Firefox 131 · Windows');
  });
  it('Edge no se confunde con Chrome', () => {
    expect(resumirNavegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0')).toBe('Edge 141 · Windows');
  });
  it('cadena vacía o desconocida → "Otro"', () => {
    expect(resumirNavegador('')).toBe('Otro');
    expect(resumirNavegador(undefined)).toBe('Otro');
    expect(resumirNavegador('curl/8.0')).toBe('Otro');
  });
});
