import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, sinScrollHorizontal } from './helpers';

/**
 * spec 013, T053 (Historia 4): el listado del mes y el bloque del Inicio. "Hoy"
 * lo decide la API con la fecha civil de Argentina (H4.2 y los bordes de mes
 * y año están en la integración con el reloj fijado: el reloj del navegador no
 * mueve al servidor). Los fixtures de la 013 siembran a "Celia Cumple Hoy",
 * que cumple 30 el día de la corrida.
 */
async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('H4.1: el mes actual por defecto, con "Cumple 30" y la marca "Hoy"; el nombre lleva al perfil', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/cumpleanos');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Cumpleaños de /);
      await expect(page.getByRole('navigation', { name: 'Elegir el mes' }).locator('[aria-current="page"]')).toHaveCount(1);
      const fila = page.getByRole('row').filter({ hasText: 'Celia Cumple Hoy' });
      await expect(fila).toContainText('Cumple 30');
      await expect(fila).toContainText('Hoy');
      await expect(fila.getByRole('link', { name: 'Celia Cumple Hoy' })).toHaveAttribute('href', '/personas/0013e2e0-0000-4000-8000-000000000005');
      await expect(fila.getByRole('link', { name: '+54 9 221 900-1300' }).first()).toHaveAttribute('href', 'tel:+5492219001300');
      await sinViolaciones(page);
    });

    test('H4.6: el bloque del Inicio muestra a quien cumple hoy; vacío, lo dice y enlaza al mes', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/');
      const bloque = page.getByRole('region', { name: 'Cumpleaños de esta semana' });
      await expect(bloque.getByRole('listitem').filter({ hasText: 'Celia Cumple Hoy' })).toContainText('Hoy cumple 30');
      await sinViolaciones(page);

      await page.route(/\/inicio\/cumpleanos-semana(\?|$)/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], hayMas: false }) }));
      await page.reload();
      await expect(bloque).toContainText('Nadie cumple años esta semana.');
      await expect(bloque.getByRole('link', { name: 'Ver los cumpleaños del mes' })).toHaveAttribute('href', '/cumpleanos');
    });
  });
}

test('otro mes con enlaces reales, y "?mes=" inválido vuelve al actual', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/cumpleanos');
  await page.getByRole('navigation', { name: 'Elegir el mes' }).getByRole('link', { name: 'febrero' }).click();
  await expect(page).toHaveURL(/\/cumpleanos\?mes=2$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cumpleaños de febrero');
  await page.goto('/cumpleanos?mes=abc');
  await expect(page).toHaveURL(/\/cumpleanos$/);
});

test('@celular a 360 px sin scroll horizontal, con el teléfono a mano', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loguearseComoAdminE2E(page);
  await page.goto('/cumpleanos');
  const fila = page.getByRole('row').filter({ hasText: 'Celia Cumple Hoy' });
  const telefono = fila.getByRole('link', { name: '+54 9 221 900-1300' }).first();
  await expect(telefono).toBeVisible();
  expect((await telefono.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await sinScrollHorizontal(page)).toBe(true);
});
