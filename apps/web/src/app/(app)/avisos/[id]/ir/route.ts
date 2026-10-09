import { apiFetch } from '@vida-sobrenatural/shared-types';
import { auth } from '../../../../../auth';

/**
 * spec 012, T024 (FR-003, research #9) — tocar un aviso: lo marca leído y
 * lleva a su destino en un solo toque, sin JS del lado del cliente. Si la API
 * falla o el aviso no es de la Persona, vuelve a la lista (`303` siempre: la
 * próxima carga es un GET).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let destino = '/avisos';
  if (session?.apiToken) {
    try {
      const r = await apiFetch<{ destino: string }>(`/avisos/${encodeURIComponent(id)}/leido`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.apiToken}` },
        cache: 'no-store',
      });
      // Solo rutas propias de la web: nunca un destino con dominio.
      if (r.destino.startsWith('/') && !r.destino.startsWith('//')) destino = r.destino;
    } catch {
      destino = '/avisos';
    }
  }
  return new Response(null, { status: 303, headers: { Location: new URL(destino, request.url).toString(), 'Cache-Control': 'no-store' } });
}
