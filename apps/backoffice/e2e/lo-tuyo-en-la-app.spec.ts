import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoLiderCursoE2E, loguearseComoOtroRolE2E, loguearseComoPastorE2E } from './helpers';
import { WEB_BASE_URL } from './helpers-006';

/**
 * spec 006, T053 (Historia 3, escenarios 7–8; FR-025; SC-006): el backoffice
 * ya no ofrece nada del Discipulador ni del Líder de curso (D142). Quien solo
 * tiene esos roles aterriza en "Lo tuyo está en la app"; los enlaces viejos
 * llevan a la web app conservando el id; el Admin y el Pastor no ven esos
 * ítems. Las redirecciones se miran sin seguirlas (la web app es otra app).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('la Discipuladora ve la pantalla terminal con "Ir a la app", sin menú de secciones', async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await loguearseComoOtroRolE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Lo tuyo está en la app', level: 1 })).toBeVisible();
      await expect(page.getByText('Tus discipulados y tu disponibilidad ahora están en la app')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', `${WEB_BASE_URL}/mis-discipulados`);
      await expect(page.getByRole('link', { name: 'Mis discipulados' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Mi disponibilidad' })).toHaveCount(0);
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}

test('el Líder de curso solo: la misma pantalla, que lo lleva a Mi camino', async ({ page }) => {
  await loguearseComoLiderCursoE2E(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lo tuyo está en la app', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', `${WEB_BASE_URL}/mi-camino`);
});

test('las cuatro rutas viejas redirigen a la web app, con el id', async ({ page }) => {
  await loguearseComoOtroRolE2E(page);
  const casos: Array<[string, string]> = [
    ['/mis-discipulados', '/mis-discipulados'],
    ['/mis-discipulados/abc-123', '/mis-discipulados/abc-123'],
    ['/mi-disponibilidad', '/mi-disponibilidad'],
    ['/mis-grupos', '/mi-camino'],
  ];
  for (const [vieja, nueva] of casos) {
    const respuesta = await page.request.get(vieja, { maxRedirects: 0 });
    expect({ vieja, status: respuesta.status() }).toEqual({ vieja, status: 307 });
    expect(respuesta.headers()['location']).toBe(`${WEB_BASE_URL}${nueva}`);
  }
});

test('el Admin y el Pastor no ven Mis discipulados, Mi disponibilidad ni Mis grupos', async ({ page }) => {
  for (const loguearse of [loguearseComoAdminE2E, loguearseComoPastorE2E]) {
    await loguearse(page);
    await page.goto('/solicitudes');
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await expect(menu).toBeVisible();
    for (const nombre of ['Mis discipulados', 'Mi disponibilidad', 'Mis grupos']) {
      await expect(menu.getByRole('link', { name: nombre })).toHaveCount(0);
    }
  }
});
