import { request as playwrightRequest, type Page } from '@playwright/test';
import { loguearseComoTest } from './helpers';

/**
 * spec 006 — helpers de e2e propios (specs/IMPLEMENTACION.md §2.10). Salieron
 * de `mi-camino-vida-nueva.spec.ts` (004) para que Mi camino por etapas y el
 * historial previo los usen sin copiarlos.
 */

export const API = () => process.env.API_BASE_URL ?? 'http://localhost:3334';

/** El token de API de una sesión de `apps/web` iniciada con test-login, en un contexto propio (no toca la `page`). */
export async function tokenDe(baseURL: string, email: string): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL });
  try {
    const { csrfToken } = await (await ctx.get('/api/auth/csrf')).json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });
    const session = await (await ctx.get('/api/auth/session')).json();
    return session.apiToken as string;
  } finally {
    await ctx.dispose();
  }
}

export async function api(token: string, metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE', ruta: string, data?: unknown) {
  const ctx = await playwrightRequest.newContext();
  try {
    const response = await ctx.fetch(`${API()}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data,
    });
    const cuerpo = await response.text();
    if (!response.ok()) throw new Error(`${metodo} ${ruta} respondió ${response.status()}: ${cuerpo}`);
    return cuerpo ? JSON.parse(cuerpo) : undefined;
  } finally {
    await ctx.dispose();
  }
}

/** Fecha `YYYY-MM-DD` de hace `anios` años menos un día (cumplidos). */
export function nacidoHace(anios: number): string {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

/**
 * Un menor de 12 con acceso a la app (FR-044 de la 004): se registra por API
 * (queda `pendiente_tutor`) y e2e-admin lo activa con los datos del tutor,
 * como en el backoffice. Después la `page` inicia sesión como él.
 */
export async function registrarMenorActivo(page: Page, baseURL: string, email: string) {
  const token = await tokenDe(baseURL, email);
  const sedes: Array<{ id: string }> = await (await page.request.get(`${API()}/sedes`)).json();
  const persona = await api(token, 'POST', '/personas', {
    apellido: 'Menor',
    nombre: 'Lucía',
    genero: 'femenino',
    fechaNacimiento: nacidoHace(10),
    telefono: '+5492219000003',
    direccion: 'Calle 1 y 50',
    sedeId: sedes[0].id,
    estadoCivil: 'soltero_a',
    profesion: 'estudiante',
    congregaDesde: 2020,
    consentimientoDatos: false,
  });
  const admin = await tokenDe(baseURL, 'e2e-admin@example.com');
  await api(admin, 'PATCH', `/personas/${persona.id}/activar`, { tutorNombre: 'Mamá', tutorApellido: 'Menor', tutorTelefono: '+5492219000004' });
  await loguearseComoTest(page, email);
}
