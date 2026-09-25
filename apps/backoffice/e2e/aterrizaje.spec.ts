import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoOtroRolE2E, loguearseSinPersonaE2E } from './helpers';

/**
 * H-134 (specs/005, T068): `/` resuelve DESTINO, no permiso. Tres casos:
 * quien tiene Inicio se queda en Inicio; quien no, aterriza en el primer
 * ítem de SU menú (derivado de sus roles); y una sesión sin ninguna
 * pantalla (`rol = []`) ve una pantalla terminal — sin redirect, porque
 * redirigir ahí sería un bucle infinito. El 404 usa el mismo resolutor.
 */

test('un Discipulador que entra a / aterriza en el primer ítem de su menú, no en un 404', async ({ page, permitirErrorDeConsola }) => {
  // El propio test visita una ruta inexistente: Chromium loguea el 404 del documento.
  permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
  await loguearseComoOtroRolE2E(page); // e2e-otro-rol: ['discipulador'], sin inicio.ver
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // El destino se deriva del menú de esa sesión, no de una ruta escrita en el test.
  // El primer link de la LISTA del menú (el logo, que va a `/`, no es un ítem).
  const primerItem = page.getByRole('navigation', { name: 'Principal' }).getByRole('list').getByRole('link').first();
  const destino = await primerItem.getAttribute('href');
  expect(destino).not.toBe('/');
  await expect(page).toHaveURL(new RegExp(`${destino}$`));
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toHaveCount(0);

  // Y el 404 lo lleva al mismo destino — antes su botón iba a `/` fijo, y para
  // quien no tiene Inicio eso era volver al mismo 404.
  await page.goto('/ruta-que-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toBeVisible();
  // El 404 con sesión vive dentro del shell: un solo <main> (antes duplicaba el landmark).
  expect((await auditar(page)).violations).toEqual([]);
  await page.getByRole('link', { name: /^Ir a / }).click();
  await expect(page).toHaveURL(new RegExp(`${destino}$`));
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toHaveCount(0);
});

test('una sesión con rol = [] ve la pantalla terminal en / y NO termina en un redirect', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
  await loguearseSinPersonaE2E(page);
  const navegaciones: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navegaciones.push(new URL(frame.url()).pathname);
  });

  const respuesta = await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(respuesta?.status()).toBe(200);
  // Ningún redirect del servidor: la respuesta de `/` no viene de ninguna redirección.
  expect(respuesta?.request().redirectedFrom()).toBeNull();
  await expect(page.getByRole('heading', { name: 'Tu cuenta no tiene acceso al backoffice' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // Ninguna navegación a otra ruta, y ninguna nueva después de asentarse (un
  // bucle seguiría sumando). El router de Next registra un replaceState en el
  // mismo documento al hidratar — por eso no se exige exactamente una entrada.
  const cantidad = navegaciones.length;
  await page.waitForTimeout(1500);
  expect(navegaciones.length).toBe(cantidad);
  expect(new Set(navegaciones)).toEqual(new Set(['/']));

  // En el 404 tampoco hay un botón que la mande a ninguna parte.
  await page.goto('/ruta-que-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Ir a / })).toHaveCount(0);
  await expect(page.getByText('El backoffice es para quienes tienen un rol', { exact: false })).toBeVisible();
});

test('quien tiene Inicio (Admin) se queda en Inicio', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible();
});
