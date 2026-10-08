import type { FiltroRevisado, TipoComentario } from '@vida-sobrenatural/shared-types';

/** La URL del listado con sus filtros (los valores por defecto no se escriben). */
export function hrefComentarios({ revisado, tipo, pagina }: { revisado: FiltroRevisado; tipo?: TipoComentario; pagina?: number }): string {
  const params = new URLSearchParams();
  if (revisado !== 'no') params.set('revisado', revisado);
  if (tipo) params.set('tipo', tipo);
  if (pagina && pagina > 1) params.set('pagina', String(pagina));
  const query = params.toString();
  return query ? `/comentarios?${query}` : '/comentarios';
}
