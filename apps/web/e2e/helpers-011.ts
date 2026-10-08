import type { EventoDetalle } from '@vida-sobrenatural/shared-types';
import { API, api, tokenDe } from './helpers-006';

/**
 * spec 011 — helpers de e2e de Eventos en la web (specs/IMPLEMENTACION.md
 * §2.10). Los Eventos se crean por la API como el Admin de e2e y se llaman
 * `e2e-…` para que `limpiar-e2e.ts` los borre.
 */
export const EMAIL_ADMIN_E2E = 'e2e-admin@example.com';

export async function crearEventoComoAdmin(baseURL: string, datos: Record<string, unknown> = {}): Promise<EventoDetalle> {
  const token = await tokenDe(baseURL, EMAIL_ADMIN_E2E);
  const sedes: { id: string }[] = await (await fetch(`${API()}/sedes`)).json();
  return api(token, 'POST', '/eventos', {
    sedeId: sedes[0].id,
    nombre: `e2e-evento-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    descripcion: 'Un evento de prueba para la cartelera.',
    inicio: new Date(Date.now() + 3 * 3_600_000).toISOString(),
    ...datos,
  });
}

export async function accionDeAdmin(baseURL: string, eventoId: string, accion: 'cancelar' | 'eliminar') {
  const token = await tokenDe(baseURL, EMAIL_ADMIN_E2E);
  await api(token, 'POST', `/eventos/${eventoId}/${accion}`);
}
