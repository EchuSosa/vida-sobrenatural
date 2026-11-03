import type { Page } from '@playwright/test';
import { test, expect, auditar, crearPersonaActiva, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { CONSOLA_500, TEXTO_ERROR_INTERNO, apiCaida, tresClics, contarPedidos } from '../../../scripts/e2e-casos-infelices';

/**
 * spec 018, US2 (D263): el Admin da de baja a una Persona en su nombre desde su Perfil. Cada test usa
 * una Persona nueva. Casos infelices: palabra equivocada, API caída, tres toques; el Pastor no ve el
 * botón (D132).
 */
async function abrirPerfil(page: Page, apellido: string) {
  await page.goto(`/personas?q=${encodeURIComponent(apellido)}`);
  await page.getByRole('link', { name: new RegExp(`^${apellido}, E2E`) }).click();
  return page.getByRole('region', { name: 'Baja de la app' });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('⭐ el Admin la da de baja con BAJA y un motivo; deja de estar en el listado', async ({ page }) => {
      test.slow();
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      const apellido = `e2e-Baja${colorScheme}${Date.now()}`;
      await crearPersonaActiva(`e2e-baja-bo-${colorScheme}-${Date.now()}@example.com`, apellido);
      await loguearseComoAdminE2E(page);
      const seccion = await abrirPerfil(page, apellido);
      await seccion.getByRole('button', { name: 'Dar de baja de la app' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText(`¿Dar de baja a E2E ${apellido}?`);
      await dialogo.getByRole('button', { name: 'Sí, dar de baja' }).click();
      await expect(dialogo.locator('#campo-confirmacion-error')).toHaveText('Escribí BAJA para confirmar.');
      expect((await auditar(page)).violations).toEqual([]);
      await dialogo.getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
      await dialogo.getByLabel('Motivo (opcional, interno)').fill('Lo pidió por WhatsApp');
      await dialogo.getByRole('button', { name: 'Sí, dar de baja' }).click();
      await expect(page.getByText('Listo: se dio de baja a la persona y se borraron sus datos.')).toBeVisible();
      await expect(page).toHaveURL(/\/personas$/);
      await page.goto(`/personas?q=${encodeURIComponent(apellido)}`);
      await expect(page.getByRole('link', { name: new RegExp(`^${apellido}`) })).toHaveCount(0);
    });
  });
}

test('si la API falla, avisa y la persona sigue igual; tres toques dan una sola baja', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const apellido = `e2e-BajaInfeliz${Date.now()}`;
  await crearPersonaActiva(`e2e-baja-bo-infeliz-${Date.now()}@example.com`, apellido);
  await loguearseComoAdminE2E(page);
  const seccion = await abrirPerfil(page, apellido);
  const caida = await apiCaida(page, 'POST', /\/personas\/[^/]+\/baja$/);
  await seccion.getByRole('button', { name: 'Dar de baja de la app' }).click();
  await page.getByRole('alertdialog').getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, dar de baja' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  expect(caida.intentos).toBe(1);

  await page.unrouteAll();
  await page.reload();
  const pedidos = contarPedidos(page, 'POST', /\/personas\/[^/]+\/baja$/);
  await seccion.getByRole('button', { name: 'Dar de baja de la app' }).click();
  await page.getByRole('alertdialog').getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
  await tresClics(page.getByRole('alertdialog').getByRole('button', { name: 'Sí, dar de baja' }));
  await expect(page).toHaveURL(/\/personas$/);
  expect(pedidos.n).toBe(1);
});

test('el Pastor no ve "Dar de baja de la app"', async ({ page }) => {
  const apellido = `e2e-BajaPastor${Date.now()}`;
  await crearPersonaActiva(`e2e-baja-bo-pastor-${Date.now()}@example.com`, apellido);
  await loguearseComoPastorE2E(page);
  await abrirPerfil(page, apellido);
  await expect(page.getByRole('button', { name: 'Dar de baja de la app' })).toHaveCount(0);
});
