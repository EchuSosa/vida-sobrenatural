import { test, expect, auditar, registrarPersonaDeTest } from './helpers';
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
 *
 * H-149: UN test por ruta, no uno que las recorra todas. Recorriéndolas en
 * un solo `test()`, las públicas vivían al borde del timeout de 30 s en CI
 * (un intento timedOut a los 30.143 ms, el reintento pasó en 23.850 ms) y,
 * cuando fallaba, el informe no decía qué ruta. Así la nombra, y cada ruta
 * tiene su propio presupuesto. El timeout NO se subió. Cada test con sesión
 * registra su propia Persona: independiente de los demás, a costa de repetir
 * el registro (ver apps/backoffice/e2e/axe-todas-las-rutas.spec.ts, mismo
 * cambio).
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test.describe('rutas públicas', () => {
      for (const ruta of RUTAS_PUBLICAS) {
        test(`${ruta} sin violaciones de axe`, async ({ page }) => {
          await page.goto(ruta);
          await page.waitForLoadState('networkidle');
          const { violations } = await auditar(page);
          expect(violations, `${ruta}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
        });
      }
    });

    test.describe('rutas de la app con sesión', () => {
      for (const item of NAV_APP) {
        test(`${item.href} sin violaciones de axe`, async ({ page }) => {
          const email = `e2e-axe-${tema}${item.href.replace(/\//g, '-')}-${Date.now()}@example.com`;
          await registrarPersonaDeTest(page, email);
          await page.goto(item.href);
          await page.waitForLoadState('networkidle');
          const { violations } = await auditar(page);
          expect(violations, `${item.href}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
        });
      }
    });
  });
}

/**
 * H-62 (revisión manual ronda 5, punto 5): ninguna de las cinco cosas de
 * este lote la habría cazado la suite anterior — esta línea caza la familia
 * entera de "algo desborda en celular". 320 px es el piso real (H-62), 375
 * es el iPhone SE con el que se hizo la ronda de verificación. No hace
 * falta repetir por tema: el desborde es de layout, no de color.
 */
const ANCHOS_CELULAR = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
];

for (const viewport of ANCHOS_CELULAR) {
  test.describe(`sin scroll horizontal a ${viewport.width}px`, () => {
    test.use({ viewport });

    test('rutas públicas', async ({ page }) => {
      for (const ruta of RUTAS_PUBLICAS) {
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        const sinDesborde = await page.evaluate(
          () => document.scrollingElement!.scrollWidth <= window.innerWidth,
        );
        expect(sinDesborde, `${ruta}: hay scroll horizontal a ${viewport.width}px`).toBe(true);
      }
    });

    test('rutas de la app con sesión', async ({ page }) => {
      const email = `e2e-scroll-${viewport.width}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      for (const item of NAV_APP) {
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
