import { test, expect } from '@playwright/test';
import { auditar, loguearseComoAdminE2E } from './helpers';
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
        const { violations } = await auditar(page);
        expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
      }
    });
  });
}

/**
 * H-62 (revisión manual ronda 5, punto 5): mismo chequeo que
 * apps/web/e2e/axe-todas-las-rutas.spec.ts — ver el comentario ahí. 320 px
 * es el piso real, 375 el iPhone SE de la ronda de verificación.
 */
const ANCHOS_CELULAR = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
];

for (const viewport of ANCHOS_CELULAR) {
  test.describe(`sin scroll horizontal a ${viewport.width}px`, () => {
    test.use({ viewport });

    test('todas las rutas del backoffice', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      for (const item of NAV_BACKOFFICE) {
        await page.goto(item.href);
        await page.waitForLoadState('networkidle');
        const sinDesborde = await page.evaluate(
          () => document.scrollingElement!.scrollWidth <= window.innerWidth,
        );
        expect(sinDesborde, `${item.href}: hay scroll horizontal a ${viewport.width}px`).toBe(true);
      }
    });
  });
}
