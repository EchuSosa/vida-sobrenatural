import type { EventoPublico, Pagina } from '@vida-sobrenatural/shared-types';

/**
 * spec 011 (research #10) — lecturas públicas de Eventos para los Server
 * Components de la web, con ISR de 60 s: la información del Evento puede
 * tardar hasta un minuto en verse; la disponibilidad real la decide la API
 * al anotarse (FR-016).
 */
const API = () => process.env.API_BASE_URL ?? 'http://localhost:3333';
export const REVALIDAR_EVENTOS_SEGUNDOS = 60;

/**
 * La cartelera se lee siempre fresca (una consulta liviana): un Evento recién
 * creado o cancelado entra o sale enseguida, y la página ya es dinámica por
 * `?pagina=`. La página de cada Evento sí usa la revalidación de 60 s.
 */
export async function obtenerCartelera(skip: number, take: number): Promise<Pagina<EventoPublico>> {
  const r = await fetch(`${API()}/eventos/publicos?skip=${skip}&take=${take}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`GET /eventos/publicos respondió ${r.status}`);
  return r.json();
}

/** `null` si no existe o está eliminado (FR-043): la página responde 404. */
export async function obtenerEventoPublico(slug: string): Promise<EventoPublico | null> {
  const r = await fetch(`${API()}/eventos/publicos/${encodeURIComponent(slug)}`, { next: { revalidate: REVALIDAR_EVENTOS_SEGUNDOS } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET /eventos/publicos/:slug respondió ${r.status}`);
  return r.json();
}

/** Para el sitemap (FR-006). Si la API no responde, el sitemap sale sin Eventos en vez de fallar. */
export async function obtenerSlugsDeEventos(): Promise<Array<{ slug: string; updatedAt: string }>> {
  try {
    const r = await fetch(`${API()}/eventos/publicos/slugs`, { next: { revalidate: REVALIDAR_EVENTOS_SEGUNDOS } });
    return r.ok ? r.json() : [];
  } catch {
    return [];
  }
}
