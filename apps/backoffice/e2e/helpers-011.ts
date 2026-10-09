import { hoyEnArgentina, type EventoDetalle } from '@vida-sobrenatural/shared-types';
import { apiComo, EMAIL_ADMIN } from './helpers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/**
 * spec 011 — helpers de los e2e de Eventos del backoffice. Los Eventos se
 * llaman `e2e-…` para que `limpiar-e2e.ts` los borre.
 */
export async function crearEventoPorApi(datos: Record<string, unknown> = {}): Promise<EventoDetalle> {
  const sedes: { id: string }[] = await (await fetch(`${API_BASE_URL}/sedes`)).json();
  return apiComo<EventoDetalle>(EMAIL_ADMIN, 'POST', '/eventos', {
    sedeId: sedes[0].id,
    nombre: `e2e-evento-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    descripcion: 'Evento de prueba de e2e.',
    inicio: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    requiereInscripcion: true,
    cupo: 10,
    ...datos,
  });
}

/** Un año civil que siempre está en el futuro, para cargar fechas en el formulario. */
export const ANIO_FUTURO = String(new Date().getFullYear() + 1);

const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';

/** El token de una Persona por el test-login de la web (para lo que hace ella misma, como subir un comprobante). */
async function tokenDePersona(email: string): Promise<string> {
  const { request } = await import('@playwright/test');
  const ctx = await request.newContext({ baseURL: WEB_BASE_URL });
  try {
    const { csrfToken } = await (await ctx.get('/api/auth/csrf')).json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });
    return (await (await ctx.get('/api/auth/session')).json()).apiToken as string;
  } finally {
    await ctx.dispose();
  }
}

/** La Persona sube su comprobante (un PDF mínimo) por la API, como haría desde Mis eventos. */
export async function subirComprobantePorApi(email: string, inscripcionId: string): Promise<{ id: string }> {
  const datos = new FormData();
  datos.append('monto', '15000');
  datos.append('medio', 'transferencia');
  // La fecha civil de HOY en Argentina: entre las 21 y las 24 hs, la fecha UTC ya es "mañana" (FECHA_PAGO_FUTURA).
  datos.append('fechaPago', hoyEnArgentina());
  datos.append('comprobante', new Blob([Buffer.from('%PDF-1.4\n%%EOF')], { type: 'application/pdf' }), 'comprobante.pdf');
  const r = await fetch(`${API_BASE_URL}/inscripciones-evento/${inscripcionId}/pagos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenDePersona(email)}` },
    body: datos,
  });
  if (!r.ok) throw new Error(`subir comprobante respondió ${r.status}: ${await r.text()}`);
  return r.json();
}

/** El Admin de e2e anota a una Persona a un Evento. */
export async function anotarEnNombre(eventoId: string, personaId: string): Promise<{ id: string; estado: string }> {
  return apiComo(EMAIL_ADMIN, 'POST', `/eventos/${eventoId}/inscripciones`, { personaId });
}
