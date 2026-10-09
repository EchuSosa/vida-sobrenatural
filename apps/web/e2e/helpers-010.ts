import { api, sesionDe, tokenDe } from './helpers-006';
import { crearEventoComoAdmin, EMAIL_ADMIN_E2E } from './helpers-011';

/**
 * spec 010 — helpers de e2e de Bautismo en la web (IMPLEMENTACION §2.10). Lo
 * que hace el Admin (habilitar, pedir en nombre, aceptar y asignar fecha) va
 * por la API como `e2e-admin`, para no depender de las pantallas del
 * backoffice; la Persona hace lo suyo desde la card.
 */
async function comoAdmin(baseURL: string, metodo: 'POST' | 'PUT', ruta: string, data?: unknown) {
  return api(await tokenDe(baseURL, EMAIL_ADMIN_E2E), metodo as 'POST', ruta, data);
}

export async function personaIdDe(baseURL: string, email: string): Promise<string> {
  return (await sesionDe(baseURL, email)).personaId;
}

/** FR-021: el Admin le habilita el bautismo (sin Vida Nueva). */
export async function habilitarBautismo(baseURL: string, email: string): Promise<void> {
  const personaId = await personaIdDe(baseURL, email);
  await comoAdmin(baseURL, 'PUT', `/personas/${personaId}/habilitacion-bautismo`);
}

/** Un Evento de bautismo futuro (E8), creado como el Admin. */
export async function crearEventoDeBautismo(baseURL: string, lugar = 'Club Universitario, calle 4 y 51'): Promise<{ id: string; slug: string; nombre: string }> {
  return crearEventoComoAdmin(baseURL, { tipo: 'bautismo', lugar, inicio: new Date(Date.now() + 10 * 86_400_000).toISOString() });
}

/** El Admin pide el bautismo en nombre de la Persona y lo acepta, con o sin fecha. Devuelve la Solicitud. */
export async function pedirYAceptar(baseURL: string, email: string, eventoId?: string): Promise<string> {
  const personaId = await personaIdDe(baseURL, email);
  const { id } = await comoAdmin(baseURL, 'POST', '/bautismo/solicitudes', { personaId });
  await comoAdmin(baseURL, 'POST', `/bautismo/solicitudes/${id}/aceptar`, eventoId ? { eventoId } : {});
  return id as string;
}

/** El estado de la card, como lo ve la Persona (para comprobar sin depender del texto). */
export async function estadoBautismo(baseURL: string, email: string): Promise<{ estado: string }> {
  return api(await tokenDe(baseURL, email), 'GET', '/bautismo/me');
}
