import { test, expect } from './helpers';

/**
 * docs/25, S-04: cada página sale con las cabeceras de seguridad (el proxy de Next, regla de
 * shared-types). Fuera de producción no hay CSP ni HSTS (`next dev` usa eval y no hay HTTPS); eso lo
 * cubren los unit de `cabeceras-seguridad`.
 */
test('la página de inicio trae las cabeceras de seguridad', async ({ page }) => {
  const respuesta = await page.goto('/');
  const h = respuesta!.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('geolocation=(self)');
});
