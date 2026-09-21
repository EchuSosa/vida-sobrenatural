/**
 * FR-011 (D121, research.md Decisión 4): reconoce las tres formas
 * habituales de URL de YouTube y extrae el id del video (11 caracteres,
 * alfanumérico + `-`/`_`). Devuelve `null` si no matchea ninguna — el
 * llamador decide qué hacer con eso (rechazar con `YOUTUBE_URL_INVALIDA`
 * si la URL no vino vacía, D121).
 *
 * Sin llamada a la YouTube Data API (research.md Decisión 4): sólo hace
 * falta extraer un id, no confirmar que el video existe o es público.
 */
const PATRONES = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})(?:&.*)?$/,
  /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:\?.*)?$/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})(?:\?.*)?$/,
];

export function extraerIdDeYoutube(url: string): string | null {
  const valor = url.trim();
  for (const patron of PATRONES) {
    const match = valor.match(patron);
    if (match) return match[1];
  }
  return null;
}
