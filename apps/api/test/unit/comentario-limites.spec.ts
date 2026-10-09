import { extracto, limiteDeComentarios, reintentarEnSegundos, validarComentario } from '../../src/comentario/comentario-reglas.js';

/** spec 013, T062 (FR-041, FR-043, H5.3, H5.5): las reglas puras de "Contanos qué te parece". */
describe('Comentarios: límites y validación (spec 013 T062)', () => {
  const valido = { tipo: 'problema', texto: 'Hola', aceptaContacto: false, paginaOrigen: '/inicio', app: 'web' };

  it('reintentarEn: el más viejo de la ventana libera su lugar al cumplir una hora; nunca menos de 1', () => {
    const ahora = new Date('2026-10-08T15:00:00Z');
    expect(reintentarEnSegundos(new Date('2026-10-08T14:20:00Z'), ahora)).toBe(20 * 60);
    expect(reintentarEnSegundos(new Date('2026-10-08T14:00:00.500Z'), ahora)).toBe(1);
    expect(reintentarEnSegundos(new Date('2026-10-08T13:00:00Z'), ahora)).toBe(1);
  });

  it('umbral: 5 por hora sin sesión, 20 con sesión', () => {
    expect(limiteDeComentarios(false)).toBe(5);
    expect(limiteDeComentarios(true)).toBe(20);
  });

  it('sin sesión, "Pueden contactarme" sin email ni teléfono → CONTACTO_INVALIDO en el campo contacto', () => {
    expect(validarComentario({ ...valido, aceptaContacto: true }, false)).toEqual({ ok: false, errores: [{ campo: 'contacto', code: 'CONTACTO_INVALIDO' }] });
    const conEmail = validarComentario({ ...valido, aceptaContacto: true, contactoEmail: ' Ana@Example.COM ' }, false);
    expect(conEmail).toMatchObject({ ok: true, datos: { contactoEmail: 'ana@example.com', contactoTelefono: null } });
  });

  it('con sesión ignora el contacto enviado (se usan los del perfil)', () => {
    const r = validarComentario({ ...valido, aceptaContacto: true, contactoEmail: 'otro@example.com', contactoTelefono: 'cualquiera' }, true);
    expect(r).toMatchObject({ ok: true, datos: { aceptaContacto: true, contactoEmail: null, contactoTelefono: null } });
  });

  it('texto vacío o de más de 2000, tipo y app desconocidos, página que no es un path → errores por campo juntos', () => {
    const r = validarComentario({ tipo: 'queja', texto: ' ', app: 'otra', paginaOrigen: 'https://otro.sitio/x' }, false);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errores.map((e) => e.code)).toEqual(['TIPO_INVALIDO', 'TEXTO_INVALIDO', 'APP_INVALIDO', 'PAGINAORIGEN_INVALIDO']);
    expect(validarComentario({ ...valido, texto: 'a'.repeat(2001) }, false).ok).toBe(false);
  });

  it('la página se guarda sin query; los datos técnicos se recortan o se descartan, nunca frenan', () => {
    const r = validarComentario({ ...valido, paginaOrigen: '/personas?q=rosa', navegador: 'x'.repeat(200), ultimoRequestId: '<script>' }, false);
    expect(r).toMatchObject({ ok: true, datos: { paginaOrigen: '/personas', ultimoRequestId: null } });
    expect(r.ok && r.datos.navegador).toHaveLength(80);
  });

  it('extracto: hasta 140 caracteres, cortando en un espacio y con "…"', () => {
    expect(extracto('corto', 140)).toBe('corto');
    const largo = extracto('palabra '.repeat(40), 140);
    expect(largo.endsWith('…')).toBe(true);
    expect(largo.length).toBeLessThanOrEqual(141);
    expect(largo).not.toMatch(/ …$/);
  });
});
