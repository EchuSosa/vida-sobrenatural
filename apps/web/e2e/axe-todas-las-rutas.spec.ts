import { test, expect } from '@playwright/test';
import { crearAxeBuilder, registrarPersonaDeTest } from './helpers';
import { RUTAS_PUBLICAS } from '../src/app/sitemap';
import { NAV_APP } from '../src/config/nav-app';

/**
 * H-61 (revisión manual, punto 2): audita TODAS las rutas con axe, no solo
 * los flujos críticos que ya cubren los demás e2e — en los dos temas. La
 * lista de rutas sale de sitemap.ts (públicas) y nav-app.ts (con sesión),
 * no de un array a mano que se desactualice (Principio XI).
 *
 * D106/H-22: el tema por defecto es claro, no "system" — `prefers-color-scheme`
 * no alcanza para forzar oscuro (next-themes usa el `defaultTheme` fijo
 * cuando no hay nada guardado, sin mirar el sistema). Se fuerza escribiendo
 * la misma clave de localStorage que lee next-themes antes de cada navegación.
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test('rutas públicas sin violaciones de axe', async ({ page }) => {
      for (const ruta of RUTAS_PUBLICAS) {
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        const { violations } = await crearAxeBuilder(page).analyze();
        expect(violations, `${ruta}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      }
    });

    test('rutas de la app con sesión sin violaciones de axe', async ({ page }) => {
      const email = `e2e-axe-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      for (const item of NAV_APP) {
        await page.goto(item.href);
        await page.waitForLoadState('networkidle');
        const { violations } = await crearAxeBuilder(page).analyze();
        expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      }
    });
  });
}
