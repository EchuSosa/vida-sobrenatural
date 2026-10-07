import { test, expect, registrarPersonaDeTest, auditar, usarTemaOscuro, esperarTema } from './helpers';

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
      if (colorScheme === 'dark') await usarTemaOscuro(page, email);

      await page.goto('/perfil');
      await page.waitForLoadState('networkidle');
      await esperarTema(page, colorScheme === 'dark' ? 'oscuro' : 'claro');

      let resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
      await expect(dialogo).toBeVisible();

      resultados = await auditar(page);
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

      // H-21/H-76: el toast (sonner) entra con una animación — `auditar`
      // espera a que asiente antes de medir contraste.
      resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });
  });
}
