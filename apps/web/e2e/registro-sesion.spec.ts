import { test, expect, loguearseComoTest } from './helpers';
import { CONSOLA_500 } from '../../../scripts/e2e-casos-infelices';

/**
 * docs/24 (2026-11-04), el "bucle de recargas" de `next dev` en local: no era `next dev`. Si el
 * pedido del navegador a `/api/auth/session` fallaba (red, o el servidor de desarrollo compilando),
 * `useSession` decía "sin sesión" y /registro mandaba a /ingresar. Pero el servidor sí la veía y
 * volvía a /registro, y así sin fin (33 navegaciones en 15 s al reproducirlo). Ahora /registro le
 * pregunta al servidor antes de mandar a ningún lado.
 */
const sesionDelCliente = '**/api/auth/session';

test('si el pedido de sesión del navegador falla, /registro lo dice con "Reintentar" y no entra en un bucle', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  // next-auth avisa en la consola cuando no pudo leer la sesión.
  permitirErrorDeConsola(/ClientFetchError|\[auth\]\[error\]|authjs\.dev#autherror/);
  await loguearseComoTest(page, `e2e-registro-sesion-${Date.now()}@example.com`);
  // Solo los pedidos del navegador (fetch): el servidor sigue viendo la sesión, como en el bug.
  await page.route(sesionDelCliente, (r) => (r.request().resourceType() === 'fetch' ? r.fulfill({ status: 500, body: 'caída' }) : r.continue()));
  const aIngresar: string[] = [];
  page.on('request', (r) => r.isNavigationRequest() && r.url().includes('/ingresar') && aIngresar.push(r.url()));

  await page.goto('/registro');
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos confirmar que ingresaste' })).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);
  expect(aIngresar).toEqual([]);
  await expect(page.getByRole('link', { name: 'Volver a ingresar' })).toHaveAttribute('href', '/ingresar');

  // Vuelve la conexión: "Reintentar" trae el formulario, sin recargar.
  await page.unroute(sesionDelCliente);
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Completá tus datos' })).toBeVisible();
  expect(aIngresar).toEqual([]);
});

test('si la sesión se pierde con /registro abierto, lleva a /ingresar y se queda ahí', async ({ page }) => {
  await loguearseComoTest(page, `e2e-registro-sin-sesion-${Date.now()}@example.com`);
  await page.goto('/registro');
  await expect(page.getByRole('heading', { level: 1, name: 'Completá tus datos' })).toBeVisible();
  // Sin pedidos en vuelo: uno que salió con la cookie vieja la volvería a escribir después del
  // `clearCookies()` (lo mismo que `cambiarDeSesion`, docs/24).
  await page.waitForLoadState('networkidle');
  // Se cierra la sesión en otra pestaña: next-auth se entera por su BroadcastChannel y la vuelve a leer.
  await page.context().clearCookies();
  await page.evaluate(() => new BroadcastChannel('next-auth').postMessage({ event: 'session', data: { trigger: 'signout' } }));
  // Con margen: en `next dev`, /ingresar puede compilarse recién ahora.
  await expect(page).toHaveURL(/\/ingresar$/, { timeout: 15_000 });
  // Y se queda: el servidor tampoco ve sesión, así que no vuelve a /registro.
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/ingresar$/);
});
