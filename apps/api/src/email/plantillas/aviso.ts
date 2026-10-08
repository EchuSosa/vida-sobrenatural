import mensajes from '../mensajes/es.json' with { type: 'json' };
import type { MensajeEmail } from '../email.service.js';
import { COLORES_EMAIL as C } from './colores.js';

/**
 * spec 012, T041 (FR-021, contracts/email-aviso.md) — el mail de un aviso
 * importante. Función pura: quien llama (`EnvioEmailsService`) ya armó los
 * textos (del catálogo o del aviso manual). Una columna, estilos en línea,
 * 480 px como máximo, un solo enlace (el botón, ≥ 44 px) y el pie que explica
 * por qué le llega. Sin datos personales: ni el saludo lleva el nombre.
 */
export type Idioma = 'es';

export interface DatosMailAviso {
  asunto: string;
  titulo: string;
  parrafos: string[];
  textoBoton: string;
  /** Absoluta (`WEB_URL` + ruta). */
  url: string;
  /** `WEB_URL`, para el logo. */
  webUrl: string;
  idioma: Idioma;
}

const M = mensajes.avisos;

/** Para el HTML: lo que escribió el Admin en un aviso manual es texto, nunca marcado. */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function plantillaAviso(p: DatosMailAviso): Omit<MensajeEmail, 'para'> {
  const fuente = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const parrafo = `margin:0 0 16px 0;font-family:${fuente};font-size:16px;line-height:24px;color:${C.texto};`;
  const pie = `margin:0 0 8px 0;font-family:${fuente};font-size:14px;line-height:20px;color:${C.textoSecundario};`;
  const logo = `${p.webUrl.replace(/\/$/, '')}/marca/logo-email.png`;

  const texto = [p.titulo, '', ...p.parrafos.flatMap((x) => [x, '']), `${p.textoBoton}: ${p.url}`, '', '—', M.pie, M.direccion, ''].join('\n');

  const html = `<!DOCTYPE html>
<html lang="${p.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(p.asunto)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.fondo};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fondo};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:${C.tarjeta};border:1px solid ${C.borde};border-radius:8px;">
<tr><td style="padding:32px 24px;">
<img src="${escaparHtml(logo)}" width="160" height="22" alt="${escaparHtml(M.logoAlt)}" style="display:block;border:0;margin:0 0 24px 0;">
<h1 style="margin:0 0 16px 0;font-family:${fuente};font-size:22px;line-height:28px;font-weight:bold;color:${C.texto};">${escaparHtml(p.titulo)}</h1>
${p.parrafos.map((x) => `<p style="${parrafo}">${escaparHtml(x).replace(/\n/g, '<br>')}</p>`).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;"><tr>
<td style="border-radius:8px;background-color:${C.primario};">
<a href="${escaparHtml(p.url)}" style="display:inline-block;padding:12px 24px;min-height:20px;line-height:20px;font-family:${fuente};font-size:16px;font-weight:bold;color:${C.tarjeta};text-decoration:none;border-radius:8px;">${escaparHtml(p.textoBoton)}</a>
</td></tr></table>
<p style="${pie}">${escaparHtml(M.pie)}</p>
<p style="${pie}margin:0;">${escaparHtml(M.direccion)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
  return { asunto: p.asunto, html, texto };
}
