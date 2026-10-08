import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { crearEdicionPorApi, crearPersonaApta, inscribirPorApi, EMAIL_LIDER_1, EMAIL_LIDER_2 } from './helpers-008';

/**
 * spec 008, T021 + T069 (Historia 1, escenarios 1, 2 y 6; Historia 9; FR-038,
 * FR-039): el Admin crea una edición de 8 semanas desde el listado de Grupos
 * (filtro por curso), ve el error por campo si no elige Líderes, y la abre;
 * el Pastor la ve sin ningún control de gestión. `axe` en claro y oscuro.
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

    test('crear una edición: sin Líderes, error por campo; con Líder, queda en curso con su cronograma', async ({ page, permitirErrorDeConsola }) => {
      // El 400 de validación (sin Líderes) lo provoca el test a propósito.
      permitirErrorDeConsola(/status of 400 \(Bad Request\)/);
      test.slow();
      const nombre = `e2e-edicion-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/grupos');
      await page.getByRole('navigation', { name: 'Curso' }).getByRole('link', { name: 'Vida de Servicio' }).click();
      await expect(page).toHaveURL(/curso=vida_de_servicio/);
      await expect(page.getByRole('heading', { name: 'Grupos de Vida de Servicio' })).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Crear una edición' }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByLabel('Nombre').fill(nombre);
      await dialogo.getByLabel('Sede').selectOption({ index: 1 });
      await dialogo.getByLabel('Cantidad de semanas').fill('8');
      await expect(dialogo.getByLabel('Semana 8')).toBeVisible();
      await sinViolaciones(page);

      await dialogo.getByRole('button', { name: 'Crear la edición' }).click();
      await expect(dialogo.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
      await expect(dialogo.locator('#error-lideres')).toBeVisible();

      await dialogo.getByLabel(/E2E LiderCurso/).check();
      await dialogo.getByRole('button', { name: 'Crear la edición' }).click();
      await expect(page).toHaveURL(/\/grupos\/vida-de-servicio\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(nombre);
      await expect(page.getByRole('region', { name: 'Cronograma' }).getByRole('listitem')).toHaveCount(8);
      await expect(page.getByText('La inscripción está abierta')).toBeVisible();
      await sinViolaciones(page);
    });

    test('el Pastor ve la edición y sus inscriptos sin ningún control de gestión', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const grupoId = await crearEdicionPorApi({ nombre: `e2e-lectura-${sufijo}`, lideres: [EMAIL_LIDER_1, EMAIL_LIDER_2] });
      const persona = await crearPersonaApta(`e2e-vs-lectura-${sufijo}@example.com`, 'Lía', `Lectura${sufijo}`);
      await inscribirPorApi(persona.id, grupoId);

      await loguearseComoPastorE2E(page);
      await page.goto(`/grupos/vida-de-servicio/${grupoId}`);
      await expect(page.getByRole('region', { name: 'Inscriptos' })).toContainText(`Lía Lectura${sufijo}`);
      for (const nombre of ['Sumar un Líder', 'Cambiar fechas', 'Dar de baja', 'Cerrar la inscripción', 'Confirmar el cierre']) {
        await expect(page.getByRole('button', { name: nombre, exact: true })).toHaveCount(0);
      }
      await expect(page.getByRole('button', { name: /^Sacar a / })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}
