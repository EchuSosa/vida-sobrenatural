import { test, expect } from '@playwright/test';
import { auditar } from './helpers';

/**
 * Historia 5 (specs/003-contenido-institucional, D122): la marca real
 * (isotipo/logotipo de packages/ui/src/assets/marca/) reemplaza el nombre
 * en texto plano y el ícono por defecto de Next.js — favicon, ícono de PWA,
 * barra de navegación, pie de página y Open Graph (FR-035 a FR-042). El
 * scroll horizontal general a 320/375px ya lo cubre
 * axe-todas-las-rutas.spec.ts (H-62) para toda ruta pública; acá se repite
 * puntualmente sobre "/" con nav y pie juntos, que es donde vive la marca.
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('favicon, ícono de PWA y manifest derivan del isotipo (FR-035/FR-036)', async ({ page }) => {
      await page.goto('/');

      const favicon = page.locator('link[rel="icon"]');
      await expect(favicon.first()).toHaveAttribute('href', /icon\.png/);

      const appleIcon = page.locator('link[rel="apple-touch-icon"]');
      await expect(appleIcon).toHaveAttribute('href', /apple-icon\.png/);

      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveAttribute('href', /manifest\.webmanifest/);

      const respuestaManifest = await page.request.get(await manifestLink.getAttribute('href') as string);
      expect(respuestaManifest.ok()).toBe(true);
      const manifest = await respuestaManifest.json();
      expect(manifest.icons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ src: '/icons/icon-192.png' }),
          expect.objectContaining({ src: '/icons/icon-512.png' }),
        ]),
      );
    });

    test('la barra de navegación muestra el logotipo, con alt "Vida Sobrenatural" (FR-037)', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header');
      // Claro/oscuro alternan por CSS (dark:hidden/hidden dark:block) — los
      // dos <img> están en el DOM, sólo uno visible por tema; :visible
      // evita depender de cuál de los dos aparece primero.
      await expect(header.locator('img[alt="Vida Sobrenatural"]:visible')).toHaveCount(1);
      // El texto plano "Vida Sobrenatural" que mostraba antes ya no está.
      await expect(header.getByText('Vida Sobrenatural', { exact: true })).toHaveCount(0);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('el pie de página muestra el logotipo (FR-039)', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      await expect(footer.locator('img[alt="Vida Sobrenatural"]:visible')).toHaveCount(1);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('sin scroll horizontal a 320px con el logotipo en la barra y el pie', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const sinDesborde = await page.evaluate(() => document.scrollingElement!.scrollWidth <= window.innerWidth);
      expect(sinDesborde).toBe(true);
    });
  });
}

test('la imagen de Open Graph incorpora el logotipo (FR-041)', async ({ page }) => {
  await page.goto('/');
  // La URL trae un hash de build (convención de Next.js) — se lee del
  // propio <meta>, no se asume fija.
  const urlOg = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(urlOg).toBeTruthy();
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', 'Vida Sobrenatural');

  const respuesta = await page.request.get(urlOg as string);
  expect(respuesta.ok()).toBe(true);
  expect(respuesta.headers()['content-type']).toContain('image/png');
});
