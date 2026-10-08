import { apiFetch, type EstadoMiMinisterio } from '@vida-sobrenatural/shared-types';
import type { PropsAccionesEtapa } from './acciones-etapa';
import { CardMinisterioCliente } from './card-ministerio';

/**
 * spec 009, T035 (FR-011 a FR-014) — lo propio de la card de Ministerio en Mi
 * camino (ver `acciones-etapa.ts`): pide `GET /ministerios/me` y muestra el
 * estado de la Persona con sus acciones. Si la API falla, lo atrapa el
 * `error.tsx` de Mi camino, como el resto de la página.
 */
export async function AccionesMinisterio({ apiToken }: PropsAccionesEtapa) {
  const estado = await apiFetch<EstadoMiMinisterio>('/ministerios/me', {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  return <CardMinisterioCliente estadoInicial={estado} />;
}
