import { CATALOGO_AVISOS, NOMBRES_EVENTOS_AVISO } from '@vida-sobrenatural/shared-types';
import { plantillaAviso } from '../../src/email/plantillas/aviso.js';
import { parrafosDe, textosMailDeEvento } from '../../src/notificaciones/envio-emails.service.js';
import { DATOS_EJEMPLO } from './avisos-datos-ejemplo.js';

/** spec 012, T038 — FR-021, FR-040, SC-006 (contracts/email-aviso.md). */
const base = {
  asunto: 'Hay novedades sobre tu pedido',
  titulo: '¡Ya tenés quien te acompañe en Vida Nueva!',
  parrafos: ['Primer párrafo.', 'Segundo <párrafo> & más.'],
  textoBoton: 'Ir a Mi camino',
  url: 'https://app.ejemplo.org/mi-camino',
  webUrl: 'https://app.ejemplo.org',
  idioma: 'es' as const,
};

describe('plantillaAviso (T038)', () => {
  const { asunto, html, texto } = plantillaAviso(base);

  it('HTML con lang, 480 px como máximo, el logo con alt y el pie', () => {
    expect(asunto).toBe(base.asunto);
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('max-width:480px');
    expect(html).toMatch(/<img src="https:\/\/app\.ejemplo\.org\/marca\/logo-email\.png"[^>]*alt="Vida Sobrenatural"/);
    expect(html).toContain('Te escribimos porque es un aviso importante sobre tu camino en la iglesia.');
    expect(html).toContain('Calle 23 N°1665, La Plata');
  });

  it('un solo enlace: el botón, con la URL absoluta y al menos 44 px de alto', () => {
    const enlaces = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(enlaces).toEqual([base.url]);
    expect(html).toMatch(/padding:12px 24px;min-height:20px;line-height:20px/);
  });

  it('escapa lo que no es marcado', () => {
    expect(html).toContain('Segundo &lt;párrafo&gt; &amp; más.');
    expect(html).not.toContain('<párrafo>');
  });

  it('el texto plano dice lo mismo, con la URL escrita entera', () => {
    expect(texto).toContain(base.titulo);
    expect(texto).toContain('Primer párrafo.');
    expect(texto).toContain('Segundo <párrafo> & más.');
    expect(texto).toContain(`Ir a Mi camino: ${base.url}`);
    expect(texto).toContain('Te escribimos porque es un aviso importante');
  });
});

describe('Textos del mail de cada importante (T038, SC-006)', () => {
  const importantes = NOMBRES_EVENTOS_AVISO.filter((n) => CATALOGO_AVISOS[n].prioridad === 'importante');

  it.each(importantes)('%s tiene asunto, título, párrafos y botón, y el asunto no expone nada sensible', (nombre) => {
    const t = textosMailDeEvento(nombre, DATOS_EJEMPLO[nombre] as Record<string, unknown>, 'es');
    expect(t).not.toBeNull();
    expect(t!.asunto.length).toBeGreaterThan(0);
    expect(t!.titulo.length).toBeGreaterThan(0);
    expect(t!.parrafos.length).toBeGreaterThan(0);
    expect(t!.boton.length).toBeGreaterThan(0);
    const asunto = t!.asunto.toLowerCase();
    for (const prohibido of ['bautismo', 'rechaz', 'baja', '{']) expect({ nombre, asunto, prohibido, aparece: asunto.includes(prohibido) }).toMatchObject({ aparece: false });
    // Fuera de la app no se nombra el bautismo (docs/13 §5): tampoco en el cuerpo.
    if (nombre.startsWith('bautismo.')) expect(JSON.stringify(t).toLowerCase()).not.toContain('bautis');
    // Ningún placeholder queda sin reemplazar.
    expect(JSON.stringify(t)).not.toMatch(/\{\w+\}/);
  });

  it('un evento sin mail devuelve null', () => {
    expect(textosMailDeEvento('discipulado.finalizacion_confirmada', {}, 'es')).toBeNull();
  });
});

describe('Aviso manual por mail (T038)', () => {
  it('el asunto es el título y los párrafos salen de las líneas en blanco', () => {
    expect(parrafosDe('Uno.\nSigue uno.\n\n  Dos.  \n\n\n')).toEqual(['Uno.\nSigue uno.', 'Dos.']);
    const { asunto, html } = plantillaAviso({ ...base, asunto: 'Culto especial', titulo: 'Culto especial', parrafos: ['Uno.\nSigue uno.'] });
    expect(asunto).toBe('Culto especial');
    expect(html).toContain('Uno.<br>Sigue uno.');
  });
});
