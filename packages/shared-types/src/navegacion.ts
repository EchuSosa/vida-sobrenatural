/**
 * spec 011 (research #11) — `destino` seguro para volver después de ingresar
 * (lo usan el ingreso de la 007 y la inscripción a Eventos de la 011). Solo
 * rutas internas de la web app: una ruta absoluta que empieza con una sola
 * `/`. Cualquier otra cosa (otro dominio, `//`, `/\`, `javascript:`, vacío)
 * vuelve a `/inicio`, para que el parámetro no sea un redirect abierto.
 */
export const DESTINO_POR_DEFECTO = '/inicio';

export function destinoSeguro(valor: string | null | undefined): string {
  if (typeof valor !== 'string') return DESTINO_POR_DEFECTO;
  const v = valor.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return DESTINO_POR_DEFECTO;
  if (/[\u0000-\u001f]/.test(v)) return DESTINO_POR_DEFECTO;
  return v;
}
