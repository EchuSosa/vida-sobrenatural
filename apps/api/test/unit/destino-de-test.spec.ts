import { mkdtempSync, mkdirSync, existsSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import guardas from '../../../../scripts/destino-de-test.cjs';

const { TOKEN_ENV, crearDestinoDeTest, verificarDestinoDeTest, borrarDestinoDeTest, verificarBaseDeTest } = guardas;

/**
 * H-130: la guarda de destinos de test (scripts/destino-de-test.cjs). Cada
 * caso de rechazo es una forma en que un teardown podría caer en el
 * entorno de desarrollo — la pregunta de H-130: "¿qué pasa si la variable
 * no está, o está apuntando a otro lado?".
 */
describe('verificarDestinoDeTest / borrarDestinoDeTest (H-130)', () => {
  const entornoOriginal = { token: process.env[TOKEN_ENV], storage: process.env.STORAGE_DIR_UNIT };
  const aLimpiar: string[] = [];

  afterEach(() => {
    process.env[TOKEN_ENV] = entornoOriginal.token;
    delete process.env.STORAGE_DIR_UNIT;
    // Solo carpetas que este test creó con mkdtemp en el temporal.
    for (const ruta of aLimpiar.splice(0)) rmSync(ruta, { recursive: true, force: true });
  });

  function destinoValido() {
    const ruta = crearDestinoDeTest('STORAGE_DIR_UNIT');
    aLimpiar.push(ruta);
    return ruta;
  }

  it('aborta si la variable no está definida — no hay default', () => {
    destinoValido();
    expect(() => verificarDestinoDeTest(undefined, 'STORAGE_DIR')).toThrow(/no está definida/);
  });

  it('aborta si está definida pero apunta afuera del temporal (ej. ./storage/portadas, la de desarrollo)', () => {
    destinoValido();
    const fuera = path.join(process.cwd(), `.h130-unit-fuera-${Date.now()}`);
    mkdirSync(fuera, { recursive: true });
    aLimpiar.push(fuera);
    expect(() => verificarDestinoDeTest(fuera, 'STORAGE_DIR')).toThrow(/no está dentro del temporal/);
  });

  it('aborta con una carpeta del temporal que no tiene la marca (no la creó una corrida de test)', () => {
    destinoValido();
    const ajena = mkdtempSync(path.join(tmpdir(), 'otra-herramienta-'));
    aLimpiar.push(ajena);
    expect(() => verificarDestinoDeTest(ajena)).toThrow(/no tiene la marca/);
  });

  it('aborta con un destino de test de OTRA corrida (token distinto)', () => {
    const vieja = destinoValido();
    destinoValido(); // nueva corrida: nuevo token en process.env
    expect(() => verificarDestinoDeTest(vieja)).toThrow(/de OTRA corrida/);
  });

  it('aborta con un symlink del temporal que apunta afuera (mira la ruta real)', () => {
    destinoValido();
    const fuera = path.join(process.cwd(), `.h130-unit-fuera-link-${Date.now()}`);
    mkdirSync(fuera, { recursive: true });
    writeFileSync(path.join(fuera, 'no-borrar.txt'), 'x');
    aLimpiar.push(fuera);
    const enlace = path.join(tmpdir(), `vs-test-enlace-${Date.now()}`);
    symlinkSync(fuera, enlace);
    aLimpiar.push(enlace);
    expect(() => borrarDestinoDeTest(enlace)).toThrow(/no está dentro del temporal/);
    expect(existsSync(path.join(fuera, 'no-borrar.txt'))).toBe(true);
  });

  it('aborta si el proceso no tiene el token (ej. un worker que no lo heredó)', () => {
    const ruta = destinoValido();
    delete process.env[TOKEN_ENV];
    expect(() => verificarDestinoDeTest(ruta)).toThrow(/no tiene DESTINO_DE_TEST_TOKEN/);
  });

  it('borra el destino de esta corrida, y nada más', () => {
    const ruta = destinoValido();
    writeFileSync(path.join(ruta, 'portada.jpg'), 'x');
    borrarDestinoDeTest(ruta, 'STORAGE_DIR');
    expect(existsSync(ruta)).toBe(false);
  });
});

describe('verificarBaseDeTest (H-130, la de verificarBaseE2e para la integración)', () => {
  it('aborta si DATABASE_URL no está definida', () => {
    expect(() => verificarBaseDeTest(undefined)).toThrow(/no está definida/);
  });

  it('aborta con una URL válida que apunta a otra base, y dice de dónde vino', () => {
    expect(() => verificarBaseDeTest('postgresql://u:p@localhost:5432/vidasobrenatural', 'la terminal')).toThrow(
      /apunta a "vidasobrenatural".*vino de la terminal/,
    );
  });

  it('aborta con una URL inválida', () => {
    expect(() => verificarBaseDeTest('no-es-una-url')).toThrow(/no es una URL válida/);
  });

  it('acepta la base de test', () => {
    expect(verificarBaseDeTest('postgresql://u:p@localhost:5432/vidasobrenatural_test?schema=public')).toBe('vidasobrenatural_test');
  });

  it('acepta la base de test con sufijo de worktree (_a.._d), pero no otro sufijo', () => {
    expect(verificarBaseDeTest('postgresql://u:p@localhost:5432/vidasobrenatural_test_a?schema=public')).toBe('vidasobrenatural_test_a');
    expect(verificarBaseDeTest('postgresql://u:p@localhost:5432/vidasobrenatural_test_d?schema=public')).toBe('vidasobrenatural_test_d');
    expect(() => verificarBaseDeTest('postgresql://u:p@localhost:5432/vidasobrenatural_test_z')).toThrow(/no a "vidasobrenatural_test"/);
  });
});
