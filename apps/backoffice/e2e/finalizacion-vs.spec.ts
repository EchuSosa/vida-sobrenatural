import type { Page } from '@playwright/test';
import { test, expect, apiComo, auditar, loguearseComoAdminE2E } from './helpers';
import { EMAIL_LIDER_1, crearEdicionPorApi, crearPersonaApta, inscribirPorApi, inscripcionDe } from './helpers-008';

/**
 * spec 008, T060 (backoffice) + T066 (Historias 7 y 8; FR-033, FR-036; SC-005):
 * el Líder propone una baja y el cierre por API; el Admin los ve en la tarjeta
 * de Pendientes y en la edición, confirma la baja (rojo + ícono, D151) y
 * después el cierre; la inscripta activa queda Apta para Ministerio y la dada
 * de baja no. `axe` en claro y oscuro.
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

    test('confirmar una baja propuesta y después el cierre: solo la activa queda Apta para Ministerio', async ({ page, permitirErrorDeConsola }) => {
      // El 409 de "primero resolvé las bajas" lo provoca el test a propósito.
      permitirErrorDeConsola(/status of 409 \(Conflict\)/);
      const sufijo = `${colorScheme}${Date.now()}`;
      // La última semana es hoy: ya se puede proponer el cierre (FR-035).
      const grupoId = await crearEdicionPorApi({ nombre: `e2e-cierre-${sufijo}`, semanas: 3 });
      const queda = await crearPersonaApta(`e2e-vs-queda-${sufijo}@example.com`, 'Queda', `Cierre${sufijo}`);
      const sale = await crearPersonaApta(`e2e-vs-sale-${sufijo}@example.com`, 'Sale', `Cierre${sufijo}`);
      await inscribirPorApi(queda.id, grupoId);
      await inscribirPorApi(sale.id, grupoId);
      const inscripcionSale = await inscripcionDe(grupoId, sale.id);
      await apiComo(EMAIL_LIDER_1, 'POST', `/vida-de-servicio/mis-grupos/${grupoId}/inscripciones/${inscripcionSale}/baja/proponer`, { tipo: 'abandono', comentario: 'Dejó de venir' });
      await apiComo(EMAIL_LIDER_1, 'POST', `/vida-de-servicio/mis-grupos/${grupoId}/finalizacion/proponer`);

      await loguearseComoAdminE2E(page);
      await page.goto('/');
      const pendientes = page.getByRole('region', { name: 'Pendientes' });
      await expect(pendientes).toContainText(/edici(ón|ones) de Vida de Servicio para cerrar/);
      await expect(pendientes).toContainText(/bajas? de Vida de Servicio para revisar/);

      await page.waitForLoadState('networkidle');
      await page.goto(`/grupos/vida-de-servicio/${grupoId}`);
      const bajas = page.getByRole('region', { name: 'Bajas propuestas' });
      await expect(bajas).toContainText('Dejó de venir');
      await sinViolaciones(page);

      // Con la baja sin resolver, el cierre no se confirma y lo dice.
      await page.getByRole('button', { name: 'Confirmar el cierre', exact: true }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="destructivo"], [role="alertdialog"] [data-tono="destructivo"]')).toHaveCount(1);
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cerrar la edición' }).click();
      await expect(page.getByText(/Primero resolvé las bajas propuestas/)).toBeVisible();

      await bajas.getByRole('button', { name: `Confirmar la baja de Sale Cierre${sufijo}` }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo.getByRole('radio', { name: 'Abandonó' })).toBeChecked();
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Sí, confirmar la baja' }).click();
      await expect(page.getByRole('region', { name: 'Bajas propuestas' })).toHaveCount(0);

      await page.getByRole('button', { name: 'Confirmar el cierre', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cerrar la edición' }).click();
      await expect(page.getByRole('main')).toContainText('Terminada');

      const roles = async (id: string) => (await apiComo<{ roles: { delProceso: string[] } }>('e2e-admin@example.com', 'GET', `/personas/${id}/perfil`)).roles.delProceso;
      expect(await roles(queda.id)).toContain('apto_ministerio');
      expect(await roles(sale.id)).not.toContain('apto_ministerio');
    });
  });
}
