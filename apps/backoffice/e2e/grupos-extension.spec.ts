import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';

/**
 * spec 014 (D220–D222, D226): Backoffice › Grupos de extensión, con axe en
 * claro y oscuro. El Admin crea un Grupo "En la iglesia" eligiendo al líder,
 * ve que el género sale del líder, agrega a una persona directamente, la
 * quita e inactiva el Grupo; el Pastor ve sin acciones. Las Personas
 * `e2e-gex-…` las siembra `sembrar-e2e/014-grupos-extension.ts`; los Grupos
 * que crea llevan el prefijo `e2e-` (los borra limpiar-e2e).
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

    test('crear "En la iglesia" con su líder; validación por campo; agregar, quitar e inactivar', async ({ page }) => {
      const nombre = `e2e-Varones ${colorScheme} ${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/grupos-extension');
      await expect(page.getByRole('heading', { name: 'Grupos de extensión', level: 1 })).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('link', { name: 'Crear un grupo' }).click();
      await expect(page).toHaveURL(/\/grupos-extension\/nuevo$/);
      // H-50: vacío → resumen con foco y el error debajo de cada campo.
      await page.getByRole('button', { name: 'Crear el grupo' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá estos campos:' })).toBeFocused();
      await expect(page.locator('#nombre-error')).toBeVisible();
      await expect(page.locator('#lideres-error')).toBeVisible();
      await expect(page.locator('#dias-error')).toBeVisible();
      await sinViolaciones(page);

      await page.getByLabel('Nombre del grupo').fill(nombre);
      await page.getByPlaceholder('Buscar por nombre, apellido o email').first().fill('Leo E2E');
      await page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
      await page.getByRole('button', { name: 'Elegir a Leo E2E Gex' }).click();
      await expect(page.getByText('Este grupo es para: Varones')).toBeVisible();
      await page.getByLabel('lunes').check();
      await page.getByLabel('En la iglesia').check();
      await page.getByLabel('Barrio o zona (opcional)').fill('Centro');
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Crear el grupo' }).click();

      await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible();
      const datos = page.getByRole('region', { name: 'Datos del grupo' });
      await expect(datos).toContainText('Varones');
      await expect(datos).toContainText('Lunes a las 19:00 hs');
      await expect(datos).toContainText('Leo E2E Gex');
      await sinViolaciones(page);

      // Agregar directo (D226) y quitar (confirmación neutra, D151).
      await page.getByLabel('Buscar por nombre, apellido o email').fill('Sumi E2E');
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await page.getByRole('button', { name: 'Agregar a Sumi E2E Gex al grupo' }).click();
      const integrantes = page.getByRole('region', { name: 'Integrantes' });
      await expect(integrantes.getByRole('link', { name: 'Sumi E2E Gex' })).toBeVisible();
      await sinViolaciones(page);
      await integrantes.getByRole('button', { name: 'Quitar a Sumi E2E Gex del grupo' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar' }).click();
      await expect(integrantes.getByText('Todavía no hay integrantes.')).toBeVisible();

      // Sin integrantes ni pedidos, se puede inactivar.
      await page.getByRole('button', { name: 'Inactivar el grupo' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, inactivar' }).click();
      await expect(page.getByText('Inactivo', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reactivar el grupo' })).toBeVisible();
      await sinViolaciones(page);
    });

    test('el Pastor ve la lista y el detalle sin acciones', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/grupos-extension');
      await expect(page.getByText('Podés ver los grupos, pero no cambiarlos.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Crear un grupo' })).toHaveCount(0);
      await sinViolaciones(page);
      await page.getByRole('link', { name: 'e2e-Mujeres del centro' }).click();
      await expect(page.getByRole('heading', { name: 'e2e-Mujeres del centro', level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Aceptar|Quitar/ })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}
