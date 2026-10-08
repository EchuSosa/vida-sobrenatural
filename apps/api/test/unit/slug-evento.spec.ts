import { baseDeSlug, slugDeEvento, SLUG_EVENTO_MAX } from '../../src/evento/slug.js';

/** spec 011, T017 — FR-011. */
describe('slugDeEvento (FR-011)', () => {
  const nadaExiste = async () => false;

  it('saca tildes y ñ, pasa a minúsculas y une con guiones', async () => {
    expect(await slugDeEvento('Campamento de Jóvenes — Año 2026', nadaExiste)).toBe('campamento-de-jovenes-ano-2026');
  });
  it('signos y espacios de más no dejan guiones repetidos ni en los bordes', async () => {
    expect(await slugDeEvento('  ¡Noche de Alabanza!!  ', nadaExiste)).toBe('noche-de-alabanza');
  });
  it('recorta a 60 caracteres sin terminar en guion', () => {
    const slug = baseDeSlug('a'.repeat(59) + ' ' + 'b'.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(SLUG_EVENTO_MAX);
    expect(slug.endsWith('-')).toBe(false);
  });
  it('un nombre sin letras ni números cae en "evento"', async () => {
    expect(await slugDeEvento('¡¡!!', nadaExiste)).toBe('evento');
  });
  it('si ya existe suma -2, -3…', async () => {
    const existentes = new Set(['retiro', 'retiro-2']);
    expect(await slugDeEvento('Retiro', async (s) => existentes.has(s))).toBe('retiro-3');
  });
  it('el sufijo entra en los 60 caracteres', async () => {
    const base = baseDeSlug('x'.repeat(120));
    const slug = await slugDeEvento('x'.repeat(120), async (s) => s === base);
    expect(slug).toBe(`${'x'.repeat(58)}-2`);
  });
  it('"slugs" está reservado (ruta de la API)', async () => {
    expect(await slugDeEvento('Slugs', nadaExiste)).toBe('slugs-2');
  });
});
