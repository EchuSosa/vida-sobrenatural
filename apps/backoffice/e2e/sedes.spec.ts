import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loguearseComoAdminE2E, asegurarUnaSolaSedeActiva, reactivarSedes } from './helpers';

/**
 * H-30 (revisión manual ronda 2) / H-34 (ronda 3 — la red de regresión que
 * faltaba): desactivar una Sede con confirmación cuando hay otra activa, y
 * el caso de la única Sede activa (bloqueado con un diálogo informativo, no
 * un error). Corre en modo claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear una segunda Sede y desactivarla pide confirmación', async ({ page }) => {
      const nombreSede = `e2e-sede-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await page.getByPlaceholder('Nombre').fill(nombreSede);
      await page.getByPlaceholder('Dirección').fill('Calle 7 y 47, La Plata');
      await page.getByPlaceholder('Horarios (ej. "Domingos 10:30 hs")').fill('Domingos 11 hs');
      // CONTACTO_SEDE_REQUERIDO: hace falta al menos un teléfono o un email de contacto.
      await page.getByLabel('Teléfono de contacto (opcional)').fill('92211230000');
      await page.getByRole('button', { name: 'Crear Sede' }).click();
      await expect(page.getByText('Sede creada.')).toBeVisible();

      const fila = page.getByText(nombreSede).locator('..');
      await expect(fila).toBeVisible();
      await fila.getByRole('button', { name: 'Desactivar' }).click();

      const dialogo = page.getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toHaveCSS('opacity', '1');

      const resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await dialogo.getByRole('button', { name: 'Sí, desactivar' }).click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
      await expect(page.getByText(nombreSede)).toHaveCount(0);
    });

    test('desactivar la única Sede activa la bloquea con un diálogo informativo', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      // H-40: el test prepara su propio estado (exactamente una Sede activa)
      // en vez de saltearse según lo que ya tenga la base.
      const idsAReactivar = await asegurarUnaSolaSedeActiva(page);

      try {
        await page.goto('/sedes');
        await page.waitForLoadState('networkidle');

        const sedesVisibles = page.locator('article');
        await expect(sedesVisibles).toHaveCount(1);

        await sedesVisibles.first().getByRole('button', { name: 'Desactivar' }).click();

        const dialogo = page.getByRole('alertdialog', { name: 'Necesitás al menos una Sede activa' });
        await expect(dialogo).toBeVisible();

        const resultados = await new AxeBuilder({ page }).analyze();
        expect(resultados.violations).toEqual([]);

        await dialogo.getByRole('button', { name: 'Crear una Sede' }).click();
        await expect(dialogo).toBeHidden();
        await expect(page.getByPlaceholder('Nombre')).toBeInViewport();
      } finally {
        // Restaura el estado real de la base — este ambiente también lo usan
        // pruebas manuales, no es descartable entre corridas.
        await reactivarSedes(page, idsAReactivar);
      }
    });
  });
}
