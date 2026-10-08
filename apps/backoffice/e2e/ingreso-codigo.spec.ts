import { type Page } from '@playwright/test';
import { test, expect, auditar } from './helpers';
import { leerCodigoDeMailpit, mensajesPara, usarOrigenPropio } from '../../../scripts/e2e-mailpit';

/**
 * spec 007 (T038; quickstart.md, escenarios 10 y 11): el equipo sin Google
 * entra al backoffice con un código. Los dos pasos (email y código) viven en
 * la pantalla sin sesión, en cualquier ruta, y después se vuelve a esa ruta.
 * `axe` en claro y oscuro sobre la pantalla sin sesión.
 */
const resumen = (page: Page) => page.getByRole('alert').filter({ hasText: 'Revisá esto para seguir' });
/** El formulario de código (en los e2e, la misma pantalla muestra también el login de prueba, con su propio "Entrar"). */
const ingreso = (page: Page) => page.getByRole('region', { name: /Entrar con tu email|Revisá tu mail/ });

async function entrarConCodigo(page: Page, email: string) {
  await usarOrigenPropio(page);
  const antes = (await mensajesPara(email)).length;
  await page.getByLabel('Tu email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  await expect(page.getByRole('heading', { name: 'Revisá tu mail' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Revisá tu mail' })).toBeFocused();
  const codigo = await leerCodigoDeMailpit(email, antes + 1);
  await page.getByLabel('Código', { exact: true }).fill(codigo);
  await ingreso(page).getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('el Admin entra con código y vuelve a la ruta en la que estaba (escenario 10)', async ({ page }) => {
  await page.goto('/sedes');
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();
  await entrarConCodigo(page, 'e2e-admin@example.com');
  await expect(page).toHaveURL(/\/sedes$/);
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Backoffice — Vida Sobrenatural');
  const sesion = (await (await page.request.get('/api/auth/session')).json()) as { user: { rol: string[] } };
  expect(sesion.user.rol).toContain('admin');
});

test('un email sin rol recibe el mismo mail y, con el código, ve "no tenés acceso" (escenario 11)', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
  const email = `e2e-codigo-sin-rol-${Date.now()}@example.com`;
  await page.goto('/');
  await entrarConCodigo(page, email);
  await expect(page.getByRole('heading', { name: 'Tu cuenta no tiene acceso al backoffice' })).toBeVisible();
});

test('código equivocado: error en el campo y en el resumen, sin salir de la pantalla', async ({ page }) => {
  const email = `e2e-codigo-bo-equivocado-${Date.now()}@example.com`;
  await usarOrigenPropio(page);
  await page.goto('/libros');
  await page.getByLabel('Tu email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  const codigo = await leerCodigoDeMailpit(email);
  await page.getByLabel('Código', { exact: true }).fill(codigo === '000000' ? '111111' : '000000');
  await ingreso(page).getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(resumen(page)).toContainText('Ese código no coincide');
  await expect(page.getByLabel('Código', { exact: true })).toHaveAttribute('aria-invalid', 'true');

  await page.getByRole('button', { name: 'Usar otro email' }).click();
  await expect(page.getByLabel('Tu email', { exact: true })).toHaveValue(email);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('la pantalla sin sesión, en sus dos pasos y con errores, sin violaciones de axe', async ({ page }) => {
      await usarOrigenPropio(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByRole('button', { name: 'Enviarme el código' }).click();
      await expect(resumen(page)).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel('Tu email', { exact: true }).fill(`e2e-codigo-bo-axe-${colorScheme}-${Date.now()}@example.com`);
      await page.getByRole('button', { name: 'Enviarme el código' }).click();
      await expect(page.getByRole('heading', { name: 'Revisá tu mail' })).toBeVisible({ timeout: 20_000 });
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel('Código', { exact: true }).fill('12');
      await ingreso(page).getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(resumen(page)).toContainText('Escribí los 6 números');
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}
