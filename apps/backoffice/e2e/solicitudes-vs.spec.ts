import type { Page } from '@playwright/test';
import { test, expect, apiComo, auditar, loguearseComoAdminE2E } from './helpers';
import { crearEdicionPorApi, crearPersonaApta } from './helpers-008';

/**
 * spec 008, T034 (Historia 3, escenarios 1, 2, 3 y 5; FR-013 a FR-017): el
 * Admin filtra la bandeja por tipo, abre un pedido de Vida de Servicio y lo
 * aprueba eligiendo la edición; rechaza otro con motivo; y pide en nombre de
 * una Persona desde su perfil. `axe` en claro y oscuro.
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

    test('aprobar eligiendo edición y rechazar otro pedido', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const edicion = `e2e-aprobar-${sufijo}`;
      const grupoId = await crearEdicionPorApi({ nombre: edicion });
      const ana = await crearPersonaApta(`e2e-vs-ana-${sufijo}@example.com`, 'Ana', `Aprueba${sufijo}`);
      const beto = await crearPersonaApta(`e2e-vs-beto-${sufijo}@example.com`, 'Beto', `Rechaza${sufijo}`);
      const { solicitudId: s1 } = await apiComo<{ solicitudId: string }>(ana.email, 'POST', '/vida-de-servicio/solicitudes/me', { grupoId });
      const { solicitudId: s2 } = await apiComo<{ solicitudId: string }>(beto.email, 'POST', '/vida-de-servicio/solicitudes/me', { grupoId });

      await loguearseComoAdminE2E(page);
      await page.goto(`/solicitudes?tipo=vida_de_servicio&buscar=${encodeURIComponent(`Aprueba${sufijo}`)}`);
      await expect(page.getByRole('table')).toContainText('Vida de Servicio');
      await page.waitForLoadState('networkidle');
      await page.goto(`/solicitudes/vida-de-servicio/${s1}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(`Ana Aprueba${sufijo}`);
      await expect(page.getByRole('region', { name: 'Cómo cumple el requisito' })).toContainText('La iglesia registró que hizo Vida Nueva');
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Aprobar inscripción' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo.getByRole('radio', { name: new RegExp(edicion) })).toBeChecked();
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Aprobar', exact: true }).click();
      await expect(page.getByText(`Quedó inscripta en ${edicion}.`)).toBeVisible();

      await page.waitForLoadState('networkidle');
      await page.goto(`/solicitudes/vida-de-servicio/${s2}`);
      await page.getByRole('button', { name: 'Rechazar' }).click();
      await page.getByRole('alertdialog').getByLabel('Motivo (opcional)').fill('Este año no hay lugar');
      await page.getByRole('alertdialog').getByRole('button', { name: 'Rechazar el pedido' }).click();
      await expect(page.getByText('«Este año no hay lugar»')).toBeVisible();
    });

    test('pedir en nombre de una Persona desde su perfil', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      await crearEdicionPorApi({ nombre: `e2e-en-nombre-${sufijo}` });
      const persona = await crearPersonaApta(`e2e-vs-nombre-${sufijo}@example.com`, 'Carla', `EnNombre${sufijo}`);

      await loguearseComoAdminE2E(page);
      await page.goto(`/personas/${persona.id}`);
      const seccion = page.getByRole('region', { name: 'Vida de Servicio' });
      await expect(seccion).toContainText('Puede anotarse');
      await seccion.getByRole('button', { name: 'Pedir Vida de Servicio en su nombre' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText(`Carla EnNombre${sufijo}`);
      await dialogo.getByRole('radio', { name: new RegExp(`e2e-en-nombre-${sufijo}`) }).check();
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Cargar el pedido' }).click();
      await expect(seccion).toContainText('Tiene un pedido esperando respuesta');
      await sinViolaciones(page);
    });
  });
}
