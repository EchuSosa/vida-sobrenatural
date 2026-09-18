import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registrarPersonaDeTest } from './helpers';

/**
 * H-11 (specs/002-base-transversal, revisión manual 2026-09-18): cerrar
 * sesión desde Perfil, con diálogo de confirmación y aviso breve al volver
 * al Inicio. Corre en modo claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('cerrar sesión desde Perfil pide confirmación y vuelve al Inicio con un aviso', async ({
      page,
    }) => {
      const email = `e2e-cerrar-sesion-${colorScheme}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);

      await page.goto('/perfil');
      await page.waitForLoadState('networkidle');

      let resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
      await expect(dialogo).toBeVisible();
      // El diálogo abre con una animación de 100ms (fade-in + zoom-in); sin
      // esperarla, axe puede auditar un fotograma a mitad de transición y
      // reportar un contraste de color que nunca se ve en pantalla quieta.
      await expect(dialogo).toHaveCSS('opacity', '1');

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      // "Volver" no cierra la sesión — sigue en Perfil.
      await page.getByRole('button', { name: 'Volver' }).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(page).toHaveURL(/\/perfil/);

      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await page.getByRole('button', { name: 'Sí, cerrar sesión' }).click();

      await expect(page).toHaveURL('/');
      await expect(page.getByText('Cerraste sesión.')).toBeVisible();
      // Sin sesión, el menú vuelve a ofrecer "Ingresar" — no "Ir a la app".
      await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });
  });
}
