import { request as playwrightRequest, type Page } from '@playwright/test';

/**
 * Helpers compartidos por los e2e de H-29/H-30 (H-34, revisión manual ronda 3).
 */

const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/** Login vía test-login como la Persona admin+discipulador de e2e (globalSetup la siembra). */
export async function loguearseComoAdminE2E(page: Page) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  await page.request.post('/api/auth/callback/test-login', {
    form: { email: 'e2e-admin@example.com', csrfToken },
  });
}

async function obtenerApiTokenAdmin(page: Page): Promise<string> {
  const sessionResponse = await page.request.get('/api/auth/session');
  const session = await sessionResponse.json();
  return session.apiToken;
}

/**
 * H-40 (revisión manual, revisión de código): el e2e de "única Sede activa"
 * se salteaba según cuántas Sedes tuviera la base — un test que se saltea
 * según datos de ambiente no existe. Deja exactamente una Sede activa
 * (desactivando las demás por API, sin pasar por el formulario) y devuelve
 * los ids que había que reactivar, para restaurar el estado real al
 * terminar — este es un ambiente compartido con pruebas manuales, no una
 * base descartable.
 */
export async function asegurarUnaSolaSedeActiva(page: Page): Promise<string[]> {
  const apiToken = await obtenerApiTokenAdmin(page);
  const sedes: { id: string }[] = await (await page.request.get(`${API_BASE_URL}/sedes`)).json();
  const [, ...resto] = sedes;

  for (const sede of resto) {
    await page.request.patch(`${API_BASE_URL}/sedes/${sede.id}`, {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { activo: false },
    });
  }
  return resto.map((sede) => sede.id);
}

/** Revierte asegurarUnaSolaSedeActiva — reactiva las Sedes que se desactivaron para el test. */
export async function reactivarSedes(page: Page, ids: string[]) {
  const apiToken = await obtenerApiTokenAdmin(page);
  for (const id of ids) {
    await page.request.patch(`${API_BASE_URL}/sedes/${id}`, {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { activo: true },
    });
  }
}

/**
 * Crea, vía `apps/web` (que sí tiene el flujo de registro completo), un
 * menor real en estado `pendiente_tutor` — insumo de los e2e de H-29. Usa un
 * `APIRequestContext` propio, apuntado a `apps/web`, independiente de la
 * `page` del test (que navega `apps/backoffice`).
 */
export async function crearMenorPendienteTutor(email: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: WEB_BASE_URL });
  try {
    const csrfResponse = await ctx.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });

    const sessionResponse = await ctx.get('/api/auth/session');
    const session = await sessionResponse.json();

    const sedes = await (await ctx.get(`${API_BASE_URL}/sedes`)).json();
    const sedeId = sedes[0]?.id;
    if (!sedeId) throw new Error('crearMenorPendienteTutor: no hay ninguna Sede — corré db:seed primero.');

    const response = await ctx.post(`${API_BASE_URL}/personas`, {
      headers: { Authorization: `Bearer ${session.apiToken}`, 'Content-Type': 'application/json' },
      data: {
        apellido: 'Menor',
        nombre: 'E2E',
        genero: 'femenino',
        fechaNacimiento: '2012-01-01',
        telefono: '+54 9 221 9000001',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        tiempoCongregacion: 'menos_6_meses',
        consentimientoDatos: false,
      },
    });
    if (!response.ok()) {
      throw new Error(`crearMenorPendienteTutor: POST /personas respondió ${response.status()}: ${await response.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/**
 * Crea, vía `apps/web`, una Persona activa real — usada como "tutor ya
 * registrado" en el camino de vínculo del e2e de H-29.
 */
export async function crearPersonaActiva(email: string, apellido: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: WEB_BASE_URL });
  try {
    const csrfResponse = await ctx.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });

    const sessionResponse = await ctx.get('/api/auth/session');
    const session = await sessionResponse.json();

    const sedes = await (await ctx.get(`${API_BASE_URL}/sedes`)).json();
    const sedeId = sedes[0]?.id;
    if (!sedeId) throw new Error('crearPersonaActiva: no hay ninguna Sede — corré db:seed primero.');

    const response = await ctx.post(`${API_BASE_URL}/personas`, {
      headers: { Authorization: `Bearer ${session.apiToken}`, 'Content-Type': 'application/json' },
      data: {
        apellido,
        nombre: 'E2E',
        genero: 'femenino',
        fechaNacimiento: '1990-01-01',
        telefono: '+54 9 221 9000002',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        tiempoCongregacion: 'menos_6_meses',
        consentimientoDatos: true,
      },
    });
    if (!response.ok()) {
      throw new Error(`crearPersonaActiva: POST /personas respondió ${response.status()}: ${await response.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}
