import { test, expect, auditar } from './helpers';

/**
 * H-R13 (revisión manual de la 004): login de prueba con pantalla. Sin sesión,
 * el backoffice muestra su pantalla de ingreso en cualquier URL, con el
 * formulario de prueba debajo del botón de Google (solo con
 * `testLoginHabilitado()`); con sesión, `/dev/entrar` sirve para cambiar de
 * persona.
 */
test('sin sesión, /dev/entrar ofrece el login de prueba y entra como la persona del email', async ({ page }) => {
  await page.goto('/dev/entrar');
  await expect(page.getByRole('button', { name: 'Ingresar con Google' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrar para probar' })).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);
  await page.getByLabel('Email').fill('e2e-admin@example.com');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  const sesion = await (await page.request.get('/api/auth/session')).json();
  expect(sesion.user.email).toBe('e2e-admin@example.com');
});

test('con sesión, /dev/entrar cambia de persona', async ({ page, permitirErrorDeConsola }) => {
  // spec 006: la Discipuladora aterriza en la pantalla terminal, que pinta enseguida; si el
  // `getSession` de SessionProvider queda en vuelo cuando el login de prueba hace
  // `window.location.assign('/')`, next-auth loguea un ClientFetchError (solo en /dev/entrar,
  // que no existe en producción). Antes lo tapaba la redirección a /mis-discipulados.
  permitirErrorDeConsola(/ClientFetchError: Failed to fetch/);
  await page.goto('/dev/entrar');
  await page.getByLabel('Email').fill('e2e-admin@example.com');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();

  await page.goto('/dev/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar para probar' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
  await page.getByLabel('Email').fill('e2e-discipulador@example.com');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  // spec 006 (D142): lo del Discipulador está en la web app.
  await expect(page.getByRole('heading', { name: 'Lo tuyo está en la app', level: 1 })).toBeVisible();
  // La pantalla terminal pinta antes de que la sesión del cliente termine de cargar: que no se corte.
  await page.waitForLoadState('networkidle');
  const sesion = await (await page.request.get('/api/auth/session')).json();
  expect(sesion.user.email).toBe('e2e-discipulador@example.com');
  // El login de prueba refresca la ruta después de entrar; que termine antes de cerrar la página.
  await page.waitForLoadState('networkidle');
});
