import type { Page } from '@playwright/test';

/**
 * spec 006 (lote C, D142): lo del Discipulador vive en la web app. Los e2e
 * del backoffice que cruzan las dos apps (el Admin acá, la Discipuladora
 * allá) abren sus pantallas en la web app auxiliar que levanta
 * playwright.config.ts (`PLAYWRIGHT_WEB_BASE_URL`), con la misma `page`: el
 * test-login de la web deja su sesión y `loguearseComoAdminE2E` la vuelve a
 * cambiar cuando el test regresa al backoffice.
 */
export const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';

/** La URL absoluta de una ruta de la web app. */
export function enLaWeb(ruta: string): string {
  return `${WEB_BASE_URL}${ruta}`;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

async function testLogin(page: Page, email: string) {
  const { csrfToken } = await (await page.request.get(enLaWeb('/api/auth/csrf'))).json();
  await page.request.post(enLaWeb('/api/auth/callback/test-login'), { form: { email, csrfToken } });
}

/**
 * Inicia sesión en la WEB APP con test-login. Con sesión, la web app aplica el
 * tema GUARDADO de la Persona (no el del sistema): si se pasa `tema`, se guarda
 * ese antes (como desde Perfil) y se vuelve a entrar, para que axe audite de
 * verdad el modo del test.
 */
export async function loguearseEnLaWeb(page: Page, email: string, tema?: 'light' | 'dark') {
  await testLogin(page, email);
  if (!tema) return;
  const { apiToken } = await (await page.request.get(enLaWeb('/api/auth/session'))).json();
  const respuesta = await page.request.patch(`${API_BASE_URL}/personas/me/preferencias`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: { temaPreferido: tema === 'dark' ? 'oscuro' : 'claro' },
  });
  if (!respuesta.ok()) throw new Error(`No se pudo guardar el tema de ${email}: ${respuesta.status()}`);
  await testLogin(page, email);
}

/** Los Discipuladores de la 004 (los siembra sembrar-e2e-admin.ts), en la web app. */
export async function discipuladorEnLaWeb(page: Page, cual: 1 | 2 | 'sin-agenda' = 1, tema?: 'light' | 'dark') {
  const email =
    cual === 1 ? 'e2e-discipulador@example.com' : cual === 2 ? 'e2e-discipulador-2@example.com' : 'e2e-discipulador-sin-agenda@example.com';
  await loguearseEnLaWeb(page, email, tema);
}
