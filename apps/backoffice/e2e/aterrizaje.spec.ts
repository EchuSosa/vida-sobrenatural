import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoOtroRolE2E, loguearseSinPersonaE2E } from './helpers';

/**
 * H-134 (specs/005, T068): `/` resuelve DESTINO, no permiso. Quien tiene
 * Inicio se queda en Inicio; quien no tiene ninguna pantalla ve una pantalla
 * terminal — sin redirect, porque redirigir ahí sería un bucle infinito. El
 * 404 usa el mismo resolutor. spec 006 (D142): el Discipulador y el Líder de
 * curso ya no tienen pantallas acá; su terminal es "Lo tuyo está en la app".
 */

test('un Discipulador que entra a / ve "Lo tuyo está en la app", sin redirect ni 404 (spec 006, D142)', async ({ page, permitirErrorDeConsola }) => {
  // El propio test visita una ruta inexistente: Chromium loguea el 404 del documento.
  permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
  await loguearseComoOtroRolE2E(page); // e2e-otro-rol: ['discipulador'], sin ningún ítem del backoffice
  const respuesta = await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(respuesta?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Lo tuyo está en la app', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', /\/mis-discipulados$/);
  expect((await auditar(page)).violations).toEqual([]);

  // Y el 404 lo lleva a la app, no a un 404 de nuevo (H-134).
  await page.goto('/ruta-que-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);
  await expect(page.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', /\/mis-discipulados$/);
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
