import { coincide, generarCodigo, huella, limpiarCodigo } from '../../../src/codigo-ingreso/huella.js';

/** spec 007, T012 (FR-003, FR-019): el código y sus huellas. */
describe('huella del código de ingreso', () => {
  beforeAll(() => {
    process.env.CODIGO_INGRESO_SECRET = 'secreto-de-prueba';
  });

  it('genera siempre 6 dígitos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigo()).toMatch(/^\d{6}$/);
    }
  });

  it('completa con ceros a la izquierda', () => {
    expect(generarCodigo(() => 42)).toBe('000042');
    expect(generarCodigo(() => 0)).toBe('000000');
    expect(generarCodigo(() => 999_999)).toBe('999999');
    const codigos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(codigos.size).toBeGreaterThan(1);
  });

  it('misma huella para el mismo valor y distinta con otro secreto', () => {
    expect(huella('482913')).toBe(huella('482913'));
    expect(huella('482913')).not.toBe(huella('482914'));
    expect(huella('482913', 'otro-secreto')).not.toBe(huella('482913'));
    expect(huella('482913')).not.toContain('482913');
  });

  it('compara contra la huella guardada', () => {
    const guardada = huella('000123');
    expect(coincide('000123', guardada)).toBe(true);
    expect(coincide('000124', guardada)).toBe(false);
    expect(coincide('000123', 'abc')).toBe(false);
  });

  it('limpia espacios y guiones, y exige exactamente 6 dígitos', () => {
    expect(limpiarCodigo('482 913')).toBe('482913');
    expect(limpiarCodigo('482-913')).toBe('482913');
    expect(limpiarCodigo(' 482913 ')).toBe('482913');
    expect(limpiarCodigo('48291')).toBeNull();
    expect(limpiarCodigo('4829133')).toBeNull();
    expect(limpiarCodigo('48a913')).toBeNull();
    expect(limpiarCodigo(482913)).toBeNull();
  });

  it('sin CODIGO_INGRESO_SECRET no calcula huellas', () => {
    const antes = process.env.CODIGO_INGRESO_SECRET;
    delete process.env.CODIGO_INGRESO_SECRET;
    expect(() => huella('1')).toThrow(/CODIGO_INGRESO_SECRET/);
    process.env.CODIGO_INGRESO_SECRET = antes;
  });
});
