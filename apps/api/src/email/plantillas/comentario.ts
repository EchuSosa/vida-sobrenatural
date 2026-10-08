import mensajes from '../mensajes/es.json' with { type: 'json' };
import type { AppOrigen, TipoComentario } from '@vida-sobrenatural/shared-types';
import type { MensajeEmail } from '../email.service.js';
import { COLORES_EMAIL as C } from './colores.js';

/**
 * spec 013 (T060, FR-044, H5.6, contracts/comentarios-api.md) — el mail a la
 * desarrolladora por cada comentario. El asunto no lleva el texto ni datos de
 * contacto (solo el tipo); el cuerpo lleva el texto, escapado, y el enlace al
 * detalle del backoffice si se conoce su URL. Los datos de contacto no van:
 * se ven en el backoffice, con permiso.
 */
const M = mensajes.comentario;

function rellenar(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (entero, clave: string) => (clave in valores ? String(valores[clave]) : entero));
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function plantillaComentario({
  tipo,
  texto,
  app,
  paginaOrigen,
  enlace,
}: {
  tipo: TipoComentario;
  texto: string;
  app: AppOrigen;
  paginaOrigen: string;
  enlace: string | null;
}): Omit<MensajeEmail, 'para'> {
  const nombreTipo = M.tipos[tipo];
  const asunto = rellenar(M.asunto, { tipo: nombreTipo });
  const datos = rellenar(M.datos, { tipo: nombreTipo, app, pagina: paginaOrigen });

  const textoPlano = [M.intro, '', datos, '', M.textoTitulo, texto, '', enlace ? `${M.verEnBackoffice}: ${enlace}` : M.sinEnlace, '', M.firma, ''].join('\n');

  const fuente = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const parrafo = `margin:0 0 16px 0;font-family:${fuente};font-size:16px;line-height:24px;color:${C.texto};`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.fondo};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fondo};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${C.tarjeta};border:1px solid ${C.borde};border-radius:8px;">
<tr><td style="padding:32px 24px;">
<p style="${parrafo}">${escapar(M.intro)}</p>
<p style="${parrafo}color:${C.textoSecundario};">${escapar(datos)}</p>
<p style="${parrafo}font-weight:bold;">${escapar(M.textoTitulo)}</p>
<p style="${parrafo}padding:16px;background-color:${C.apagado};border-radius:8px;white-space:pre-wrap;">${escapar(texto)}</p>
<p style="${parrafo}">${enlace ? `<a href="${escapar(enlace)}" style="color:${C.primario};text-decoration:underline;">${escapar(M.verEnBackoffice)}</a>` : escapar(M.sinEnlace)}</p>
<p style="margin:0;font-family:${fuente};font-size:16px;line-height:24px;font-weight:bold;color:${C.primario};">${escapar(M.firma)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
  return { asunto, html, texto: textoPlano };
}
