import type { AvisoResumen } from '@vida-sobrenatural/shared-types';

/**
 * spec 012, FR-002 — piezas de la pantalla de Avisos que no son JSX: la fecha
 * relativa ("hace 2 horas") y los parámetros listos para interpolar en los
 * textos de `avisos.eventos.<dominio>.<evento>` (una fecha ISO se muestra
 * como "15 de noviembre", no como "2026-11-15").
 */
const ZONA = 'America/Argentina/Buenos_Aires';

export function fechaCompleta(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: ZONA }).format(new Date(iso));
}

export function fechaRelativa(iso: string, ahora: Date, locale: string): string {
  const segundos = Math.round((new Date(iso).getTime() - ahora.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(segundos);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(segundos / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(segundos / 86_400), 'day');
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: ZONA }).format(new Date(iso));
}

/** Los `params` de un automático, con las fechas en palabras. Nunca hay datos personales acá (FR-013). */
export function paramsParaTexto(params: AvisoResumen['params'], locale: string): Record<string, string | number> {
  const salida: Record<string, string | number> = {};
  for (const [clave, valor] of Object.entries(params ?? {})) {
    if (valor === null || typeof valor === 'boolean') continue;
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const fecha = valor.length === 10 ? new Date(`${valor}T12:00:00-03:00`) : new Date(valor);
      salida[clave] = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: ZONA }).format(fecha);
    } else {
      salida[clave] = valor;
    }
  }
  return salida;
}

/** Ruta de next-intl del texto de un automático (las claves van anidadas: next-intl no admite puntos). */
export function claveTexto(evento: string, parte: 'titulo' | 'detalle'): string {
  return `eventos.${evento}.${parte}`;
}

