import { test, expect } from '@playwright/test';
import { crearAxeBuilder, loguearseComoAdminE2E } from './helpers';
import { NAV_BACKOFFICE } from '../src/config/nav';

/**
 * H-61 (revisión manual, punto 2): audita TODAS las rutas con axe, no solo
 * los flujos críticos que ya cubren los demás e2e — en los dos temas. La
 * lista de rutas sale de nav.ts (NAV_BACKOFFICE), no de un array a mano que
 * se desactualice (Principio XI). Todas las rutas del backoffice requieren
 * sesión — no hay una lista pública separada acá.
 *
 * D106/H-22: el tema por defecto es claro, no "system" — se fuerza oscuro
 * escribiendo la misma clave de localStorage que lee next-themes, ver el
 * mismo comentario en apps/web/e2e/axe-todas-las-rutas.spec.ts.
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test('todas las rutas del backoffice sin violaciones de axe', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      for (const item of NAV_BACKOFFICE) {
        await page.goto(item.href);
        await page.waitForLoadState('networkidle');
        const { violations } = await crearAxeBuilder(page).analyze();
        expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      }
    });
  });
}
