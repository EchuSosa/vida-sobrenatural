import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Historia 1 (specs/002-base-transversal): navegación pública, traslado de
 * contenido de Bienvenida/Sede a Primeros pasos/Visitanos, y estados vacíos.
 * Corre en modo claro y oscuro con @axe-core/playwright (Historia 2, FR-013).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('el menú público muestra las secciones y Primeros pasos/Visitanos tienen el contenido trasladado', async ({
      page,
    }) => {
      await page.goto('/');

      const nav = page.getByRole('navigation', { name: 'Principal' });
      for (const label of ['Nosotros', 'Primeros pasos', 'Ministerios', 'Eventos', 'Visitanos']) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
      await expect(page.getByRole('link', { name: 'Dar' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible();

      let resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Primeros pasos' }).click();
      await expect(page).toHaveURL(/\/primeros-pasos/);
      await expect(
        page.getByRole('heading', { name: 'Bienvenido/a a Vida Sobrenatural' }),
      ).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Visitanos' }).click();
      await expect(page).toHaveURL(/\/visitanos/);
      await expect(page.getByRole('heading', { name: 'Visitanos' })).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });

    test('las URLs viejas /bienvenida y /sede ya no existen (sin redirección)', async ({ page }) => {
      const respuestaBienvenida = await page.goto('/bienvenida');
      expect(respuestaBienvenida?.status()).toBe(404);

      const respuestaSede = await page.goto('/sede');
      expect(respuestaSede?.status()).toBe(404);
    });

    test('las secciones sin funcionalidad muestran un estado vacío, no un error', async ({
      page,
    }) => {
      for (const ruta of ['/ministerios', '/eventos', '/dar']) {
        const respuesta = await page.goto(ruta);
        expect(respuesta?.status()).toBe(200);
        await expect(page.getByText(/todavía no/i)).toBeVisible();
      }
    });
  });
}
