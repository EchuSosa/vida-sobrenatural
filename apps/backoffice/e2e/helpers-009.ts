import { apiComo, EMAIL_ADMIN } from './helpers';

/**
 * spec 009 — helpers de e2e propios (IMPLEMENTACION §2.10). Las Personas
 * `e2e-ministerio-…` y los Ministerios `e2e-…` los siembra
 * `apps/api/scripts/sembrar-e2e/009-ministerios.ts` (aptas con el rol a mano
 * mientras no esté la 008).
 */
export const EMAILS_009 = {
  postulante: 'e2e-ministerio-postulante@example.com',
  cambio: 'e2e-ministerio-cambio@example.com',
  catalogo: 'e2e-ministerio-catalogo@example.com',
} as const;

export const MINISTERIOS_009 = {
  bienvenida: 'e2e-Bienvenida',
  adoracion: 'e2e-Adoración',
  mesa: 'e2e-Mesa de entrada',
} as const;

type Estado = { estado: string; pendiente?: { postulacionId: string } | null; membresia?: { postulacionId: string; ministerio: { nombre: string } } };

export function estadoDe(email: string): Promise<Estado> {
  return apiComo<Estado>(email, 'GET', '/ministerios/me');
}

/**
 * Deja a una Persona sembrada sin postulación pendiente ni membresía (los
 * dos temas y los reintentos comparten estas filas): retira la pendiente y,
 * si es miembro, la da de baja como e2e-admin.
 */
export async function prepararSinPostulacion(email: string): Promise<void> {
  let estado = await estadoDe(email);
  if (estado.pendiente) estado = await apiComo<Estado>(email, 'POST', `/postulaciones/me/${estado.pendiente.postulacionId}/retirar`);
  if (estado.estado === 'miembro' && estado.membresia) {
    await apiComo(EMAIL_ADMIN, 'POST', `/postulaciones/${estado.membresia.postulacionId}/dar-de-baja`, {});
  }
}

/** El id de un Ministerio por nombre (de los disponibles para postularse). */
export async function ministerioPorNombre(nombre: string): Promise<{ id: string; celulas: Array<{ id: string; nombre: string }> }> {
  const ministerios = await apiComo<Array<{ id: string; nombre: string; celulas: Array<{ id: string; nombre: string }> }>>(EMAIL_ADMIN, 'GET', '/ministerios/me/disponibles');
  const m = ministerios.find((x) => x.nombre === nombre);
  if (!m) throw new Error(`helpers-009: no está el Ministerio ${nombre}`);
  return m;
}

/** Postula por API como la propia Persona y devuelve el id de la Postulación. */
export async function postularComo(email: string, ministerioId: string, celulaId: string | null = null, motivacion?: string): Promise<string> {
  const estado = await apiComo<Estado>(email, 'POST', `/ministerios/${ministerioId}/postulaciones/me`, { celulaId, motivacion });
  return estado.pendiente!.postulacionId;
}

export async function aprobarComoAdmin(postulacionId: string, confirmarCambio = false): Promise<void> {
  await apiComo(EMAIL_ADMIN, 'POST', `/postulaciones/${postulacionId}/aprobar`, { confirmarCambio });
}
