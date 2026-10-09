import type { Browser, Page } from '@playwright/test';
import type { ComentarioDetalle, ComentarioResumen, Pagina } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E, EMAIL_ADMIN } from './helpers';

/**
 * spec 013, T067 (Historia 5: H5.2, H5.7, H5.8; FR-048, SC-006): lo que se
 * manda desde la web aparece en el backoffice — en el Inicio y en "Sin
 * revisar" —, se marca y se deshace; el texto se ve literal; el Pastor lo lee
 * sin el botón; y desde el menú de usuario del backoffice queda con
 * `app = backoffice` y la Persona. axe en claro y oscuro.
 */

const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';

function origenUnico(): string {
  const n = Date.now() + Math.floor(Math.random() * 1e6);
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

/** Un comentario sin sesión mandado por la pantalla real de la web (`/contanos`), con su propio origen. */
async function comentarDesdeLaWeb(browser: Browser, texto: string): Promise<void> {
  const ctx = await browser.newContext({ baseURL: WEB_BASE_URL, extraHTTPHeaders: { 'x-forwarded-for': origenUnico() } });
  try {
    const web = await ctx.newPage();
    await web.goto('/contanos?desde=%2Fvisitanos');
    await web.getByRole('radio', { name: /Un problema/ }).check();
    await web.getByLabel('Contanos', { exact: true }).fill(texto);
    await web.getByRole('button', { name: 'Enviar' }).click();
    await expect(web.getByRole('status').filter({ hasText: '¡Gracias!' })).toBeVisible();
  } finally {
    await ctx.close();
  }
}

async function buscarComentario(fragmento: string): Promise<ComentarioResumen> {
  const pagina = await apiComo<Pagina<ComentarioResumen>>(EMAIL_ADMIN, 'GET', '/comentarios?revisado=todos&take=100');
  const c = pagina.items.find((i) => i.extracto.includes(fragmento));
  if (!c) throw new Error(`No apareció el comentario "${fragmento}"`);
  return c;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('SC-006 y H5.7: el de la web aparece en el Inicio y en "Sin revisar"; se marca, se deshace y el texto se ve literal (FR-048)', async ({ page, browser }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      await comentarDesdeLaWeb(browser, `<b>hola</b> no anda el mapa ${sufijo}`);
      await loguearseComoAdminE2E(page);

      await page.goto('/');
      const bloque = page.getByRole('region', { name: 'Comentarios nuevos' });
      await expect(bloque.getByRole('link', { name: new RegExp(sufijo) })).toBeVisible();
      await sinViolaciones(page);

      await page.goto('/comentarios');
      await expect(page.getByRole('link', { name: 'Sin revisar' })).toHaveAttribute('aria-current', 'page');
      await sinViolaciones(page);
      await page.getByRole('link', { name: new RegExp(sufijo) }).click();
      // El listado también muestra el extracto: esperar al detalle antes de mirar nada.
      await expect(page).toHaveURL(/\/comentarios\/[^/?]+$/);
      await expect(page.getByRole('heading', { level: 1, name: /^Problema del / })).toBeVisible();

      await expect(page.getByText(`<b>hola</b> no anda el mapa ${sufijo}`)).toBeVisible();
      await expect(page.getByText('Sin sesión', { exact: true })).toBeVisible();
      await expect(page.getByText('Web', { exact: true })).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Marcar como revisado' }).click();
      await expect(page.getByText('Lo marcaste como revisado.')).toBeVisible();
      await expect(page.getByText(/^Revisado por /)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
      await sinViolaciones(page);

      await page.goto('/comentarios');
      await expect(page.getByRole('link', { name: new RegExp(sufijo) })).toHaveCount(0);
      await page.getByRole('link', { name: 'Revisados' }).click();
      await expect(page).toHaveURL(/revisado=si/);
      await page.getByRole('link', { name: new RegExp(sufijo) }).click();
      await expect(page).toHaveURL(/\/comentarios\/[^/?]+$/);
      await page.getByRole('button', { name: 'Deshacer' }).click();
      await expect(page.getByText('Volvió a "Sin revisar".')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Marcar como revisado' })).toBeVisible();
    });

    test('H5.8: el Pastor ve el listado y el detalle sin "Marcar como revisado"', async ({ page, browser }) => {
      const sufijo = `pastor-${colorScheme}-${Date.now()}`;
      await comentarDesdeLaWeb(browser, `Para el Pastor ${sufijo}`);
      const c = await buscarComentario(sufijo);
      await loguearseComoPastorE2E(page);
      await page.goto('/comentarios');
      await expect(page.getByRole('link', { name: new RegExp(sufijo) })).toBeVisible();
      await page.goto(`/comentarios/${c.id}`);
      await expect(page.getByRole('heading', { level: 1, name: /^Problema del / })).toBeVisible();
      await expect(page.getByText(`Para el Pastor ${sufijo}`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Marcar como revisado' })).toHaveCount(0);
      await sinViolaciones(page);
    });

    test('H5.2: desde el menú de usuario del backoffice queda con app backoffice, la pantalla y la Persona, sin pedir contacto', async ({ page }) => {
      const sufijo = `menu-${colorScheme}-${Date.now()}`;
      await page.setExtraHTTPHeaders({ 'x-forwarded-for': origenUnico() });
      await loguearseComoAdminE2E(page);
      await page.goto('/cumpleanos');
      await page.getByRole('button', { name: 'Admin de Test' }).click();
      await page.getByRole('menuitem', { name: 'Contanos qué te parece' }).click();

      const panel = page.getByRole('dialog', { name: 'Contanos qué te parece' });
      await expect(panel).toBeVisible();
      await panel.getByRole('radio', { name: /Una sugerencia/ }).check();
      await panel.getByLabel('Contanos', { exact: true }).fill(`Desde el menú ${sufijo}`);
      await panel.getByLabel('Pueden contactarme para preguntarme más').check();
      await expect(panel.getByLabel('Email (opcional)')).toHaveCount(0);
      await sinViolaciones(page);
      await panel.getByRole('button', { name: 'Enviar' }).click();
      await expect(panel.getByRole('status').filter({ hasText: '¡Gracias!' })).toBeVisible();
      await panel.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

      const c = await buscarComentario(sufijo);
      const detalle = await apiComo<ComentarioDetalle>(EMAIL_ADMIN, 'GET', `/comentarios/${c.id}`);
      expect(detalle).toMatchObject({ app: 'backoffice', paginaOrigen: '/cumpleanos', tipo: 'sugerencia', aceptaContacto: true });
      expect(detalle.persona?.nombre).toBeTruthy();
    });
  });
}
