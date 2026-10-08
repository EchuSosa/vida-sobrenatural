import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, registrarPersonaDeTest, sinScrollHorizontal, usarTemaOscuro } from './helpers';
import { crearEdicionPorApi, registrarVidaNuevaHecha } from './helpers-008';

/**
 * spec 008, T028 (Historia 2, escenarios 1, 2, 3 y 6; FR-009, FR-010, FR-012;
 * SC-001): la Persona con Vida Nueva hecha pide Vida de Servicio eligiendo la
 * edición, ve "Recibimos tu pedido", lo retira (confirmación neutra, D151) y
 * vuelve a pedirlo. La que no tiene Vida Nueva ve por qué y no ve el botón.
 * `axe` en claro y oscuro.
 */

const card = (page: Page) => page.getByRole('region', { name: 'Vida de Servicio', exact: true });

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  // Después de navegar del lado del cliente, Next escribe el <title> un instante más tarde (metadatos en streaming).
  await expect(page).toHaveTitle(/.+/);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
    // Registra Personas por el flujo real y arma la edición por la API: más que el promedio.
    test.slow();

    test('pedir eligiendo edición, retirar y volver a pedir @celular', async ({ page, baseURL }) => {
      const sufijo = `${tema}-${Date.now()}`;
      const edicion = `e2e-pedir-${sufijo}`;
      await crearEdicionPorApi(baseURL!, { nombre: edicion });
      const email = `e2e-vs-pide-${sufijo}@example.com`;
      await registrarPersonaDeTest(page, email);
      await registrarVidaNuevaHecha(baseURL!, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);

      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(card(page)).toContainText(/ediciones? abiertas?/);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page);

      await card(page).getByRole('button', { name: 'Quiero anotarme' }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByRole('radio', { name: new RegExp(edicion) }).check();
      await sinViolaciones(page, tema);
      const enviar = dialogo.getByRole('button', { name: 'Enviar mi pedido' });
      expect((await enviar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await enviar.click();
      await expect(card(page)).toContainText('Recibimos tu pedido');
      await expect(card(page)).toContainText(`Pediste la edición ${edicion}`);
      await sinViolaciones(page, tema);

      await card(page).getByRole('button', { name: 'Retirar mi pedido' }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await page.getByRole('button', { name: 'Sí, retirar' }).click();
      await expect(card(page).getByRole('button', { name: 'Quiero anotarme' })).toBeVisible();

      await card(page).getByRole('button', { name: 'Quiero anotarme' }).click();
      await page.getByRole('alertdialog').getByRole('radio', { name: new RegExp(edicion) }).check();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Enviar mi pedido' }).click();
      await expect(card(page)).toContainText('Recibimos tu pedido');
    });

    test('sin Vida Nueva: ve qué le falta, el enlace a Vida Nueva y ningún botón para pedir (SC-001) @celular', async ({ page }) => {
      const email = `e2e-vs-sin-vn-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(card(page)).toContainText('Para anotarte primero tenés que hacer Vida Nueva.');
      await expect(card(page).getByRole('link', { name: 'Ver Vida Nueva' })).toBeVisible();
      await expect(card(page).getByRole('button', { name: 'Quiero anotarme' })).toHaveCount(0);
      await sinViolaciones(page, tema);
    });
  });
}
