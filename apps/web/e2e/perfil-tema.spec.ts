import { test, expect } from '@playwright/test';

/**
 * Historia 5 (specs/002-base-transversal): elegir un tema en Perfil persiste
 * entre recargas y entre sesiones (FR-027, FR-028).
 */

async function loguearseComoTest(page: import('@playwright/test').Page, email: string) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken },
  });
}

async function registrarPersonaDeTest(page: import('@playwright/test').Page, email: string) {
  // Formulario por pasos (specs/001-fase-bienvenida, Phase 8, D94) — ver
  // apps/web/e2e/registro-bienvenida.spec.ts para el detalle paso a paso.
  await loguearseComoTest(page, email);
  await page.goto('/registro');

  await page.getByLabel('Apellido').fill('García');
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Género').selectOption('femenino');
  await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Código de país').selectOption('+54');
  await page.getByLabel('Número de teléfono').fill('92211234567');
  await page.getByLabel('Dirección').fill('Calle 1 y 50');
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Estado civil').selectOption('soltero_a');
  await page.getByLabel('Profesión').selectOption('otro');
  await page.getByLabel('¿Cuál?').fill('Apicultora');
  await page.getByLabel('Tiempo congregándote').selectOption('menos_6_meses');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page).toHaveURL(/\/registro\/listo/);
}

test('elegir Oscuro en Perfil persiste tras recargar y volver a loguearse', async ({ page }) => {
  const email = `e2e-tema-${Date.now()}@example.com`;
  await registrarPersonaDeTest(page, email);

  // El token de la sesión con la que se registró todavía no tiene personaId
  // (research.md 001, Decisión 6: solo se resuelve contra apps/api en el
  // login inicial) — se re-loguea para tener un token con personaId real,
  // igual que hace registro-bienvenida.spec.ts tras completar el registro.
  await loguearseComoTest(page, email);

  await page.goto('/perfil');
  // Espera a que hidrate antes de clickear — sin esto, el click a veces
  // llega antes de que React adjunte el handler (flake, no un bug real).
  await page.waitForLoadState('networkidle');
  const guardado = page.waitForResponse(
    (res) => res.url().includes('/personas/me/preferencias') && res.status() === 200,
  );
  await page.getByRole('button', { name: 'Oscuro' }).click();
  // Espera a que el PATCH persista de verdad antes de re-loguearse más abajo
  // — sin esto, el re-login puede correr contra un valor todavía no guardado.
  await guardado;

  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Persiste también al re-loguearse (no solo en localStorage del mismo tab).
  await loguearseComoTest(page, email);
  await page.goto('/perfil');
  await expect(page.locator('html')).toHaveClass(/dark/);
});
