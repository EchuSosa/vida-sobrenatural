import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E } from './helpers';
import { idDeEdicion015, prepararEleccionCharlada } from './helpers-015';

/**
 * spec 015 (D239, D242) — el Admin en el backoffice, con axe en claro y
 * oscuro: abre y cierra la elección de ministerio de la edición, y confirma un
 * área de una elección con la charla hecha, viendo las notas privadas antes
 * de actuar. La persona elige y la líder hace la charla en la web app
 * (`apps/web/e2e/eleccion-ministerio.spec.ts`).
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

    test('abre y cierra la elección de la edición, y confirma un área desde la bandeja con las notas a la vista', async ({ page }) => {
      const eleccionId = await prepararEleccionCharlada();
      const edicion = await idDeEdicion015();
      await loguearseComoAdminE2E(page);

      // La edición: cerrar y volver a abrir la elección (texto + ícono, D81).
      await page.goto(`/grupos/vida-de-servicio/${edicion}`);
      await expect(page.getByText('La elección de ministerio está abierta')).toBeVisible();
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Cerrar la elección de ministerio' }).click();
      await expect(page.getByText('La elección de ministerio está cerrada.')).toBeVisible();
      await page.getByRole('button', { name: 'Abrir la elección de ministerio' }).click();
      await expect(page.getByText('La elección de ministerio está abierta')).toBeVisible();

      // La bandeja la muestra abierta, y el detalle con las notas de la charla.
      await page.goto('/solicitudes?tipo=eleccion_ministerio');
      await expect(page.getByRole('main')).toContainText('Clara E2E Elección');
      await sinViolaciones(page);
      await page.goto(`/solicitudes/eleccion-ministerio/${eleccionId}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Elección de ministerio de Clara E2E Elección');
      await expect(page.getByRole('region', { name: 'Notas de la charla (privadas)' })).toContainText('e2e-nota: responsable y puntual');
      await expect(page.getByText('Me gusta cuidar a la gente.')).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Confirmar e2e-Bienvenida · Seguridad' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('¿Confirmar e2e-Bienvenida · Seguridad?');
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Sí, confirmar' }).click();
      await expect(page.getByText('Confirmada: ya sirve ahí')).toBeVisible();
      await expect(page.getByText('Resuelta', { exact: true })).toBeVisible();
      await sinViolaciones(page);

      await prepararEleccionCharlada();
    });
  });
}
