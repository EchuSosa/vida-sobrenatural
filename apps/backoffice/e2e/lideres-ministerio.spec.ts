import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';

/**
 * spec 016 (D244): los líderes de un Ministerio desde el backoffice. El
 * Admin asigna (buscador) y quita (confirmación neutra, D151); la lista de
 * Ministerios dice quién lidera cada uno o "Sin líder" (texto + ícono, D81);
 * el Perfil muestra "Líder de"; el Pastor solo ve. Las fixtures vienen de
 * `sembrar-e2e/016-lideres-ministerio.ts`: Lidia y Lía lideran e2e-Bienvenida,
 * Nora se asigna y se quita acá.
 */
async function sinViolaciones(page: Page) {
  expect((await auditar(page)).violations).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('⭐ el Admin asigna y quita un líder; la lista y el Perfil lo muestran', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/ministerios');
      const fila = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'e2e-Bienvenida', exact: true }) });
      await expect(fila.getByText('Lidia E2E Líder')).toBeVisible();
      await fila.getByRole('link', { name: 'e2e-Bienvenida', exact: true }).click();

      const lideres = page.getByRole('region', { name: /^Líderes/ });
      await expect(lideres.getByText('Lidia E2E Líder')).toBeVisible();
      await sinViolaciones(page);

      await lideres.getByText('Asignar líder').click();
      await lideres.getByLabel('Buscar por nombre, apellido o email').fill('Nora E2E');
      await lideres.getByRole('button', { name: 'Buscar', exact: true }).click();
      await lideres.getByRole('button', { name: 'Asignar a Nora E2E Líder como líder' }).click();
      await expect(lideres.getByText('Nora E2E Líder')).toBeVisible();
      await expect(lideres.getByText(/Líder desde el/).first()).toBeVisible();

      // El Perfil lo dice.
      await page.goto(`/personas?q=${encodeURIComponent('E2E Líder')}`);
      await page.getByRole('link', { name: 'E2E Líder, Nora' }).click();
      await expect(page.getByText('Líder de: e2e-Bienvenida')).toBeVisible();

      // Quitar: confirmación neutra; queda registrado, no se borra (lo verifica la integración).
      await page.goto('/ministerios');
      await page.getByRole('link', { name: 'e2e-Bienvenida', exact: true }).click();
      await lideres.getByRole('button', { name: 'Quitar: Nora E2E Líder' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('¿Quitar a Nora E2E Líder como líder de e2e-Bienvenida?');
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Quitar como líder' }).click();
      await expect(lideres.getByText('Nora E2E Líder')).toHaveCount(0);
      await expect(lideres.getByText('Lidia E2E Líder')).toBeVisible();
    });

    test('un Ministerio sin líder lo dice en la lista; el Pastor ve sin asignar ni quitar', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/ministerios');
      const sinLider = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'e2e-Mesa de entrada', exact: true }) });
      await expect(sinLider.getByText('Sin líder')).toBeVisible();
      await page.getByRole('link', { name: 'e2e-Bienvenida', exact: true }).click();
      const lideres = page.getByRole('region', { name: /^Líderes/ });
      await expect(lideres.getByText('Lidia E2E Líder')).toBeVisible();
      await expect(lideres.getByText('Asignar líder')).toHaveCount(0);
      await expect(lideres.getByRole('button', { name: /^Quitar:/ })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}
