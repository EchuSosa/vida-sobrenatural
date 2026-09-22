import { test, expect, auditar } from './helpers';

/**
 * Historia 2 (specs/003-contenido-institucional): subpágina pública de
 * lectura de la Palabra Profética vigente. Con el seed mínimo ya cargado
 * (FR-031) siempre hay una vigente con video (D121).
 *
 * El estado vacío (FR-006, "ninguna vigente todavía") NO tiene su propio
 * e2e en este tramo: todavía no existe un endpoint de escritura para
 * desmarcar la vigente desde afuera (llega en la Historia 3), y tocar la
 * base directo para simularlo dejaría el seed en un estado inconsistente
 * para el resto de la suite. Ya está cubierto en dos capas: el unit test
 * de `findVigente` (test/unit/palabra-profetica-vigente.spec.ts) y el de
 * integración que verifica el 204 real
 * (test/integration/palabra-profetica.integration-spec.ts).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('muestra la Palabra Profética vigente, con el video sin cargar hasta el clic', async ({ page }) => {
      await page.goto('/nosotros/palabra-profetica');

      await expect(page.getByRole('heading', { name: /Fidelidad y crecimiento/ })).toBeVisible();
      await expect(page.getByText('Este año, Dios nos habla de fidelidad y crecimiento', { exact: false })).toBeVisible();

      // FR-005: la miniatura está, pero el iframe de YouTube todavía no.
      const disparadorVideo = page.getByRole('button', { name: /Ver el video/ });
      await expect(disparadorVideo).toBeVisible();
      await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(0);

      await disparadorVideo.click();
      const iframe = page.locator('iframe[src*="youtube-nocookie.com"]');
      await expect(iframe).toBeVisible();
      await expect(iframe).toHaveAttribute('src', /oVLmI6_IoC8/);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
    test('la miga de pan vuelve a Nosotros', async ({ page }) => {
      await page.goto('/nosotros/palabra-profetica');
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });
  });
}
