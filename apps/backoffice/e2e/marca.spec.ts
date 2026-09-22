import { test, expect, loguearseComoAdminE2E, auditar } from './helpers';

/**
 * Historia 5 (specs/003-contenido-institucional, D122): la marca real
 * reemplaza el favicon por defecto de Next.js y agrega el logotipo a la
 * cabecera del sidebar, hoy sin ninguna marca (FR-035, FR-038).
 * apps/backoffice no es PWA (D47) — sin ícono de instalación ni manifest,
 * a diferencia de apps/web.
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('el favicon deriva del isotipo (FR-035)', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/');
      const favicon = page.locator('link[rel="icon"]');
      await expect(favicon.first()).toHaveAttribute('href', /icon\.png/);
    });

    test('la cabecera del sidebar muestra el logotipo, con alt "Vida Sobrenatural" (FR-038)', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Claro/oscuro alternan por CSS (dark:hidden/hidden dark:block) — los
      // dos <img> están en el DOM, sólo uno visible por tema.
      await expect(page.locator('img[alt="Vida Sobrenatural"]:visible')).toHaveCount(1);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });
  });
}
