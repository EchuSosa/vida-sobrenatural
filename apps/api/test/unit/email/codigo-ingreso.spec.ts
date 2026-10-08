import { plantillaCodigoIngreso } from '../../../src/email/plantillas/codigo-ingreso.js';
import { COLORES_EMAIL } from '../../../src/email/plantillas/colores.js';

/** spec 007, T011 (FR-017, FR-018): el mail del código. */
describe('plantillaCodigoIngreso', () => {
  const mail = plantillaCodigoIngreso({ codigo: '048213', minutos: 15 });

  it('asunto con el código', () => {
    expect(mail.asunto).toBe('Tu código para entrar: 048213');
  });

  it.each(['html', 'texto'] as const)('el %s tiene el código, los minutos y "si no fuiste vos"', (parte) => {
    expect(mail[parte]).toContain('048213');
    expect(mail[parte]).toContain('Vale por 15 minutos y sirve una sola vez.');
    expect(mail[parte]).toContain('Si no fuiste vos, ignorá este mail');
    expect(mail[parte]).toContain('¡Hola!');
    expect(mail[parte]).toContain('Iglesia Vida Sobrenatural');
  });

  it('el texto plano dice exactamente lo mismo que el HTML', () => {
    const visibleHtml = mail.html
      .replace(/<title>.*<\/title>/, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const visibleTexto = mail.texto.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(visibleHtml).toEqual(visibleTexto);
  });

  it('sin enlaces ni otro dato: el mail solo cambia con el código', () => {
    expect(mail.html).not.toMatch(/<a\s|href=|https?:\/\//);
    expect(mail.texto).not.toMatch(/https?:\/\//);
    const otro = plantillaCodigoIngreso({ codigo: '999999', minutos: 15 });
    expect(otro.html.replaceAll('999999', '048213')).toBe(mail.html);
    expect(otro.texto.replaceAll('999999', '048213')).toBe(mail.texto);
  });

  it('HTML accesible para clientes de correo: lang, ancho máximo, código grande', () => {
    expect(mail.html).toContain('<html lang="es">');
    expect(mail.html).toContain('max-width:480px');
    expect(mail.html).toMatch(/font-size:(3[2-9]|[4-9]\d)px[^"]*letter-spacing/);
  });

  it('solo usa colores de COLORES_EMAIL', () => {
    const usados = new Set(mail.html.match(/#[0-9a-fA-F]{3,6}\b/g));
    const permitidos = new Set<string>(Object.values(COLORES_EMAIL));
    for (const color of usados) expect(permitidos).toContain(color);
  });
});
