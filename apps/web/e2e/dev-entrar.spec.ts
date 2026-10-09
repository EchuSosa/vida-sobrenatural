import { test, expect, auditar } from './helpers';

/**
 * H-R13 (revisión manual de la 004): `/dev/entrar` entra con el login de
 * prueba sin pegar código en la consola. En e2e `ALLOW_TEST_LOGIN=true`; sin
 * eso (o en producción) la página es un 404 — lo decide `testLoginHabilitado()`,
 * el mismo gate del proveedor `test-login`.
 */
test('entra con un email escrito y cae en /registro (sin registro todavía)', async ({ page }) => {
  await page.goto('/dev/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar para probar' })).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);
  await page.getByLabel('Email').fill(`e2e-dev-entrar-${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
});

test('los botones rápidos entran con las personas de demo del manual', async ({ page }) => {
  await page.goto('/dev/entrar');
  // Sin el seed demo (la base de e2e no lo tiene) la persona no existe: arranca su registro.
  await page.getByRole('button', { name: 'demo-nueva@example.com' }).click();
  await expect(page).toHaveURL(/\/registro$/);
  const sesion = await (await page.request.get('/api/auth/session')).json();
  expect(sesion.user.email).toBe('demo-nueva@example.com');
});
