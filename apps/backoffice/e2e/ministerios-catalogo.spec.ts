import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { EMAILS_009, aprobarComoAdmin, postularComo, prepararSinPostulacion } from './helpers-009';

/**
 * spec 009, T047 (US4, US6; FR-026 a FR-033, FR-025; SC-006, SC-007): el
 * catálogo de Ministerios en el backoffice, con axe en claro y oscuro. Los
 * Ministerios que crea llevan el prefijo `e2e-` (los borra limpiar-e2e).
 */

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function crearMinisterio(page: Page, nombre: string) {
  await page.goto('/ministerios');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Crear Ministerio' }).click();
  const panel = page.getByRole('dialog');
  await panel.getByLabel('Nombre', { exact: true }).fill(nombre);
  await panel.getByLabel('Descripción').fill('Un Ministerio de prueba.');
  await panel.getByRole('button', { name: 'Crear Ministerio' }).click();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('crear → "Agregar áreas" → dos áreas; el nombre repetido marca el campo; inactivar con gente pide el nombre y se revierte (SC-007)', async ({ page, permitirErrorDeConsola }) => {
      const nombre = `e2e-Catálogo ${colorScheme} ${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/catalogos');
      await page.getByRole('link', { name: 'Ministerios y sus áreas' }).click();
      await expect(page.getByRole('heading', { name: 'Ministerios', level: 1 })).toBeVisible();
      await sinViolaciones(page);

      // Campos vacíos: resumen con foco y el error debajo de cada campo (H-50).
      await page.getByRole('button', { name: 'Crear Ministerio' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Crear Ministerio' }).click();
      await expect(page.getByRole('dialog').getByRole('alert').filter({ hasText: 'Revisá estos campos:' })).toBeFocused();
      await sinViolaciones(page);
      await page.keyboard.press('Escape');

      await crearMinisterio(page, nombre);
      await page.getByRole('button', { name: 'Agregar áreas' }).click();
      await expect(page).toHaveURL(/agregarArea=1/);
      const id = new URL(page.url()).pathname.split('/').pop()!;
      for (const area of ['Comedor', 'Familia']) {
        const panel = page.getByRole('dialog');
        await panel.getByLabel('Nombre del área').fill(area);
        await panel.getByRole('button', { name: 'Agregar área' }).click();
        await expect(page.getByRole('region', { name: 'Áreas' }).getByText(area, { exact: true })).toBeVisible();
        if (area === 'Comedor') await page.getByRole('button', { name: 'Agregar área' }).click();
      }
      await sinViolaciones(page);

      // El mismo nombre (sin tildes ni mayúsculas) no se repite: la API responde 400 con el campo.
      permitirErrorDeConsola(/status of 400/);
      await crearMinisterio(page, nombre.toUpperCase().replace('Á', 'A'));
      await expect(page.getByRole('dialog').locator('#campo-nombre-error')).toHaveText('Ya hay un Ministerio con ese nombre.');
      await page.keyboard.press('Escape');

      // Alguien sirviendo: inactivar pide el nombre exacto.
      await prepararSinPostulacion(EMAILS_009.catalogo);
      await aprobarComoAdmin(await postularComo(EMAILS_009.catalogo, id));
      await page.goto(`/ministerios/${id}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Inactivar', exact: true }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('1 persona sirviendo');
      await dialogo.getByRole('button', { name: 'Sí, inactivar' }).click();
      await expect(dialogo.locator('#campo-confirmacionNombre-error')).toBeVisible();
      await sinViolaciones(page);
      await dialogo.getByLabel('Nombre exacto').fill(nombre);
      await dialogo.getByRole('button', { name: 'Sí, inactivar' }).click();
      await expect(page.getByText('Inactivo').first()).toBeVisible();

      // Con "Todos" aparece inactivo, y se reactiva desde su detalle.
      await page.goto('/ministerios?estado=todos');
      await expect(page.getByRole('row').filter({ hasText: nombre })).toContainText('Inactivo');
      await page.getByRole('link', { name: nombre }).click();
      await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
      await page.getByRole('button', { name: 'Sí, reactivar' }).click();
      await expect(page.getByText('Activo', { exact: true }).first()).toBeVisible();

      // Eliminar con datos: explica por qué y ofrece inactivar (D94).
      await page.getByRole('button', { name: 'Eliminar', exact: true }).first().click();
      await expect(page.getByRole('alertdialog')).toContainText('Si ya no se usa, inactivalo.');
      await page.getByRole('button', { name: 'Entendido' }).click();

      // Dar de baja al miembro (neutro, motivo opcional): sale de la lista.
      await page.getByRole('button', { name: /Dar de baja/ }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, dar de baja' }).click();
      await expect(page.getByText('Todavía nadie sirve en este Ministerio.')).toBeVisible();
    });

    test('eliminar uno vacío lo manda a la papelera y se restaura; el Pastor ve sin acciones', async ({ page }) => {
      const nombre = `e2e-Vacío ${colorScheme} ${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await crearMinisterio(page, nombre);
      await expect(page.getByRole('link', { name: nombre })).toBeVisible();
      await page.getByRole('link', { name: nombre }).click();
      await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="destructivo"], [role="alertdialog"] [data-tono="destructivo"]')).toHaveCount(1);
      await page.getByRole('button', { name: 'Sí, eliminar' }).click();
      await expect(page).toHaveURL(/\/ministerios$/);
      await expect(page.getByRole('link', { name: nombre })).toHaveCount(0);

      await page.getByRole('link', { name: 'Papelera' }).click();
      const restaurar = page.getByRole('button', { name: `Restaurar ${nombre}` });
      await expect(restaurar).toBeVisible();
      await sinViolaciones(page);
      await restaurar.click();
      await expect(restaurar).toHaveCount(0);
      await page.goto('/ministerios');
      await expect(page.getByRole('link', { name: nombre })).toBeVisible();

      await page.context().clearCookies(); // otra sesión: la del Admin no se pisa sola
      await loguearseComoPastorE2E(page);
      await page.goto('/ministerios');
      await expect(page.getByRole('button', { name: 'Crear Ministerio' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Papelera' })).toHaveCount(0);
      await page.getByRole('link', { name: nombre }).click();
      await expect(page.getByText('Ves el catálogo en modo lectura.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inactivar', exact: true })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}
