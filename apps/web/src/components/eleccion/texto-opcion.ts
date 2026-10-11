/**
 * spec 015: "Bienvenida · Seguridad", o solo el Ministerio si se eligió entero
 * (no tiene áreas, docs/22). Fuera de `selector-ministerios.tsx` (que es
 * 'use client') para que la usen también las páginas del servidor.
 */
export function textoOpcion(o: { ministerio: string; celula: string | null }): string {
  return o.celula ? `${o.ministerio} · ${o.celula}` : o.ministerio;
}
