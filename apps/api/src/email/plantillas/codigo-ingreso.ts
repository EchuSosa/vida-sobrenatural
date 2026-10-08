import mensajes from '../mensajes/es.json' with { type: 'json' };
import type { MensajeEmail } from '../email.service.js';
import { COLORES_EMAIL as C } from './colores.js';

/**
 * spec 007 (T011, FR-017, FR-018, contracts/email-codigo-ingreso.md) — el
 * mail del código. Función pura: solo el código y los minutos. Ningún dato de
 * la Persona (ni el nombre, ni si el email está registrado): el mail es
 * idéntico para cualquier email salvo el código. Sin enlaces a la app.
 */
const M = mensajes.codigoIngreso;

function rellenar(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (entero, clave: string) => (clave in valores ? String(valores[clave]) : entero));
}

export function plantillaCodigoIngreso({ codigo, minutos }: { codigo: string; minutos: number }): Omit<MensajeEmail, 'para'> {
  const asunto = rellenar(M.asunto, { codigo });
  const instrucciones = rellenar(M.instrucciones, { minutos });

  const texto = [M.saludo, '', M.intro, '', codigo, '', instrucciones, '', M.siNoFuisteVos, '', M.firma, ''].join('\n');

  const fuente = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const parrafo = `margin:0 0 16px 0;font-family:${fuente};font-size:16px;line-height:24px;color:${C.texto};`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${asunto}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.fondo};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fondo};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:${C.tarjeta};border:1px solid ${C.borde};border-radius:8px;">
<tr><td style="padding:32px 24px;">
<p style="${parrafo}">${M.saludo}</p>
<p style="${parrafo}">${M.intro}</p>
<p style="margin:0 0 16px 0;padding:16px;background-color:${C.apagado};border-radius:8px;text-align:center;font-family:'Courier New', Courier, monospace;font-size:36px;line-height:44px;font-weight:bold;letter-spacing:6px;color:${C.texto};">${codigo}</p>
<p style="${parrafo}">${instrucciones}</p>
<p style="${parrafo}color:${C.textoSecundario};">${M.siNoFuisteVos}</p>
<p style="margin:0;font-family:${fuente};font-size:16px;line-height:24px;font-weight:bold;color:${C.primario};">${M.firma}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
  return { asunto, html, texto };
}
