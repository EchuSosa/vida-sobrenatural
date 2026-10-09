import { apiComo, crearPersona, EMAIL_ADMIN, type PersonaDeTest } from './helpers';
import { crearEventoPorApi } from './helpers-011';

/**
 * spec 010 — helpers de los e2e de Bautismo del backoffice (IMPLEMENTACION
 * §2.10). Las Solicitudes se arman por la API como `e2e-admin` (pedir en
 * nombre de, aceptar); lo que se prueba es la pantalla.
 */
export async function personaConPedido(sufijo: string, nombre: string, aceptar = false): Promise<PersonaDeTest & { solicitudId: string; apellido: string }> {
  const apellido = `Bautismo${sufijo}`;
  const persona = await crearPersona(`e2e-bautismo-${nombre.toLowerCase()}-${sufijo}@example.com`, { nombre, apellido });
  const { id } = await apiComo<{ id: string }>(EMAIL_ADMIN, 'POST', '/bautismo/solicitudes', { personaId: persona.id, comentario: 'Quiere bautizarse con su familia' });
  if (aceptar) await apiComo(EMAIL_ADMIN, 'POST', `/bautismo/solicitudes/${id}/aceptar`, {});
  return { ...persona, solicitudId: id, apellido };
}

/** Un Evento de bautismo futuro (E8), por la API de la 011. */
export function crearEventoDeBautismo() {
  return crearEventoPorApi({ tipo: 'bautismo', cupo: undefined, inicio: new Date(Date.now() + 20 * 86_400_000).toISOString() });
}

export function estadoDeBautismo(email: string) {
  return apiComo<{ estado: string }>(email, 'GET', '/bautismo/me');
}
