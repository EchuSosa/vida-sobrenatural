import { cronogramaPropuesto, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import { EMAIL_ADMIN, apiComo, crearPersona, idDePersona, type PersonaDeTest } from './helpers';

/**
 * spec 008 — helpers de e2e propios (specs/IMPLEMENTACION.md §2.10): todo por
 * la API, como lo haría cada actor (el Admin crea la edición y aprueba, la
 * Persona pide, el Líder propone), para que cada test arranque de lo suyo.
 */
export const EMAIL_LIDER_1 = 'e2e-lider-curso@example.com';
export const EMAIL_LIDER_2 = 'e2e-lider-vs-2@example.com';

/** Una edición en curso (por defecto: 8 semanas, empezó hace 14 días) con sus Líderes. */
export async function crearEdicionPorApi(o: { nombre: string; semanas?: number; inicio?: string; lideres?: string[] } = { nombre: 'e2e' }): Promise<string> {
  const inicio = o.inicio ?? sumarDias(hoyEnArgentina(), -14);
  const sedes = await apiComo<Array<{ id: string }>>(EMAIL_ADMIN, 'GET', '/sedes');
  const lideres = await Promise.all((o.lideres ?? [EMAIL_LIDER_1]).map((email) => idDePersona(email)));
  const { grupoId } = await apiComo<{ grupoId: string }>(EMAIL_ADMIN, 'POST', '/grupos/vida-de-servicio', {
    nombre: o.nombre,
    sedeId: sedes[0].id,
    fechaInicio: inicio,
    semanas: cronogramaPropuesto(inicio, o.semanas ?? 8),
    lideres,
  });
  return grupoId;
}

/** Una Persona con Vida Nueva hecha (registrada por el Admin, FR-008): ya puede pedir Vida de Servicio. */
export async function crearPersonaApta(email: string, nombre: string, apellido: string): Promise<PersonaDeTest> {
  const persona = await crearPersona(email, { nombre, apellido });
  await apiComo(EMAIL_ADMIN, 'POST', `/personas/${persona.id}/completitudes`, { etapa: 'vida_nueva' });
  return persona;
}

/** El Admin la pide en su nombre y la aprueba en esa edición. Devuelve el id de la Solicitud. */
export async function inscribirPorApi(personaId: string, grupoId: string): Promise<string> {
  const { solicitudId } = await apiComo<{ solicitudId: string }>(EMAIL_ADMIN, 'POST', '/vida-de-servicio/solicitudes', { personaId, grupoId });
  await apiComo(EMAIL_ADMIN, 'POST', `/vida-de-servicio/solicitudes/${solicitudId}/aprobar`, { grupoId });
  return solicitudId;
}

/** La Inscripción de una Persona en una edición, por el detalle del Admin. */
export async function inscripcionDe(grupoId: string, personaId: string): Promise<string> {
  const d = await apiComo<{ inscriptos: Array<{ inscripcionId: string; personaId: string }> }>(EMAIL_ADMIN, 'GET', `/grupos/vida-de-servicio/${grupoId}`);
  const i = d.inscriptos.find((x) => x.personaId === personaId);
  if (!i) throw new Error('helpers-008: la Persona no está inscripta en esa edición');
  return i.inscripcionId;
}
