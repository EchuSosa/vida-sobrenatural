import { request as playwrightRequest } from '@playwright/test';
import { cronogramaPropuesto, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import { API, api, sesionDe, tokenDe } from './helpers-006';

/**
 * spec 008 — helpers de e2e propios (specs/IMPLEMENTACION.md §2.10), todo por
 * la API como lo haría cada actor: el Admin crea la edición, registra Vida
 * Nueva hecha y aprueba; el Líder carga material.
 */
export const EMAIL_ADMIN = 'e2e-admin@example.com';
export const EMAIL_LIDER_1 = 'e2e-lider-curso@example.com';
export const EMAIL_LIDER_2 = 'e2e-lider-vs-2@example.com';

/** Un PDF mínimo válido (la API mira la firma, no la extensión). */
export const PDF_MINIMO = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(300, 0x20), Buffer.from('\n%%EOF\n')]);

/** Una edición en curso (por defecto: 8 semanas, empezó hace 14 días) con sus Líderes. */
export async function crearEdicionPorApi(baseURL: string, o: { nombre: string; semanas?: number; inicio?: string; lideres?: string[] }): Promise<string> {
  const admin = await tokenDe(baseURL, EMAIL_ADMIN);
  const inicio = o.inicio ?? sumarDias(hoyEnArgentina(), -14);
  const sedes = (await api(admin, 'GET', '/sedes')) as Array<{ id: string }>;
  const lideres = await Promise.all((o.lideres ?? [EMAIL_LIDER_1]).map(async (email) => (await sesionDe(baseURL, email)).personaId));
  const { grupoId } = (await api(admin, 'POST', '/grupos/vida-de-servicio', {
    nombre: o.nombre,
    sedeId: sedes[0].id,
    fechaInicio: inicio,
    semanas: cronogramaPropuesto(inicio, o.semanas ?? 8),
    lideres,
  })) as { grupoId: string };
  return grupoId;
}

/** La iglesia registra que la Persona (ya registrada) hizo Vida Nueva: puede pedir Vida de Servicio (FR-008). */
export async function registrarVidaNuevaHecha(baseURL: string, email: string): Promise<string> {
  const { personaId } = await sesionDe(baseURL, email);
  const admin = await tokenDe(baseURL, EMAIL_ADMIN);
  await api(admin, 'POST', `/personas/${personaId}/completitudes`, { etapa: 'vida_nueva' });
  return personaId;
}

/** El Admin aprueba el pedido pendiente de la Persona en esa edición. */
export async function aprobarPorApi(baseURL: string, personaId: string, grupoId: string): Promise<void> {
  const admin = await tokenDe(baseURL, EMAIL_ADMIN);
  const pendiente = await solicitudPendiente(admin, personaId);
  await api(admin, 'POST', `/vida-de-servicio/solicitudes/${pendiente}/aprobar`, { grupoId });
}

/** El Admin la pide en su nombre y la aprueba (para armar inscriptos rápido). */
export async function inscribirPorApi(baseURL: string, personaId: string, grupoId: string): Promise<void> {
  const admin = await tokenDe(baseURL, EMAIL_ADMIN);
  const { solicitudId } = (await api(admin, 'POST', '/vida-de-servicio/solicitudes', { personaId, grupoId })) as { solicitudId: string };
  await api(admin, 'POST', `/vida-de-servicio/solicitudes/${solicitudId}/aprobar`, { grupoId });
}

async function solicitudPendiente(admin: string, personaId: string): Promise<string> {
  const perfil = (await api(admin, 'GET', `/personas/${personaId}/vida-de-servicio`)) as { solicitudPendienteId: string | null };
  if (!perfil.solicitudPendienteId) throw new Error('helpers-008: la Persona no tiene un pedido pendiente');
  return perfil.solicitudPendienteId;
}

/** El Líder carga el material de una semana (texto y, si se pasa, un PDF). */
export async function cargarMaterialPorApi(baseURL: string, emailLider: string, grupoId: string, numero: number, o: { titulo: string; texto?: string; pdf?: string } = { titulo: 'Material' }): Promise<void> {
  const token = await tokenDe(baseURL, emailLider);
  const ctx = await playwrightRequest.newContext();
  try {
    const multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }> = { titulo: o.titulo, texto: o.texto ?? 'Para leer esta semana' };
    if (o.pdf) {
      multipart.archivosNuevos = { name: o.pdf, mimeType: 'application/pdf', buffer: PDF_MINIMO };
      multipart.textoAlternativo = '';
    }
    const r = await ctx.put(`${API()}/vida-de-servicio/mis-grupos/${grupoId}/semanas/${numero}`, { headers: { Authorization: `Bearer ${token}` }, multipart });
    if (!r.ok()) throw new Error(`cargarMaterialPorApi respondió ${r.status()}: ${await r.text()}`);
  } finally {
    await ctx.dispose();
  }
}
