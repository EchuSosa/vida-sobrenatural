import type { EstadoEtapa } from '@vida-sobrenatural/shared-types';

/**
 * Lote 0 global (specs/IMPLEMENTACION.md): el contrato de las cards de Mi
 * camino. La 006 arma la página y las cuatro cards (`CardEtapa`, título,
 * descripción y estado); lo PROPIO de cada etapa (su botón de pedir, el
 * cronograma de Vida de Servicio, la fecha del bautismo…) lo pone la spec de
 * esa etapa en SU archivo `tarjeta-<etapa>.tsx`, que la página renderiza en la
 * zona de acciones. Mientras la spec no lo llene, devuelve `null` y la card
 * muestra solo lo genérico ("Próximamente", "Ya lo hice").
 */
export interface PropsAccionesEtapa {
  estado: EstadoEtapa;
  /** El token para llamar a la API desde un Server Component. */
  apiToken: string;
}
