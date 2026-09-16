import { test, expect } from '@playwright/test';

/**
 * Único flujo E2E exigido por la Constitución (Principio VI): el registro
 * completo de Bienvenida (Historia 2). Usa el proveedor `test-login`
 * (habilitado solo con ALLOW_TEST_LOGIN=true) para autenticar sin depender de
 * un login real de Google — ver apps/web/src/auth.ts.
 */

async function loguearseComoTest(page: import('@playwright/test').Page, email: string) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();

  await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken },
  });
}

test('un Visitante mayor de edad se registra vía SSO y queda como Miembro registrado', async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  await loguearseComoTest(page, email);

  await page.goto('/registro');
  await expect(page.getByRole('heading', { name: 'Completá tus datos' })).toBeVisible();

  await page.getByLabel('Apellido').fill('García');
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Género').selectOption('femenino');
  await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
  await page.getByLabel('Teléfono').fill('+5492211234567');
  await page.getByLabel('Dirección').fill('Calle 1 y 50');
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByLabel('Estado civil').selectOption('soltero_a');
  await page.getByLabel('Profesión').fill('Diseñadora');
  await page.getByLabel('Tiempo congregándote').selectOption('menos_6_meses');
  await page.getByRole('checkbox').check();

  await page.getByRole('button', { name: 'Registrarme' }).click();

  // Éxito (Historia 2, FR-005 a FR-009) — sin mención a Vida Nueva/Vida de
  // Servicio/Ministerio en esta pantalla (FR-012).
  await expect(page).toHaveURL(/\/registro\/listo/);
  await expect(page.getByRole('heading', { name: '¡Listo, ya sos parte!' })).toBeVisible();
  for (const fase of ['Vida Nueva', 'Vida de Servicio', 'Ministerio']) {
    await expect(page.getByText(fase)).toHaveCount(0);
  }

  // Volver a "loguearse" con el mismo email ya no debería pedir el formulario
  // de nuevo (Acceptance Scenario 3 de Historia 2).
  await loguearseComoTest(page, email);
  await page.goto('/registro');
  await expect(page).toHaveURL(/\/bienvenida/);
});
