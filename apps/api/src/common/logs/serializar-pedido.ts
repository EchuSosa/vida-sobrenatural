/**
 * docs/25, S-05: lo que queda en el log de cada pedido. `pino-http` loguea la
 * URL y la *query*, y algunas llevan datos de una persona (`/personas/by-email
 * ?email=…`, búsquedas `?q=…`): va contra "nada de lo que identifica a alguien
 * va a los logs" (Principio X, FR-020 de la 007). Se deja la ruta sin la query
 * y no se loguea `query`; los parámetros de ruta son ids, no datos personales.
 */
export interface PedidoSerializado {
  url?: string;
  query?: unknown;
  [clave: string]: unknown;
}

export function serializarPedido<T extends PedidoSerializado>(pedido: T): Omit<T, 'query'> & { url?: string } {
  const { query: _query, ...resto } = pedido;
  void _query;
  return { ...resto, ...(typeof pedido.url === 'string' ? { url: pedido.url.split('?')[0] } : {}) };
}
