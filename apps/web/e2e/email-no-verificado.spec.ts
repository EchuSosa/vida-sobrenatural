import { test, expect } from './helpers';

/**
 * Historia 2, Acceptance Scenario 7 (specs/001-fase-bienvenida, actualización
 * 2026-09-17, FR-017): una cuenta SSO cuyo proveedor no confirma el email
 * como verificado no debe poder vincularse ni iniciar un registro.
 */

test('un intento de login con email no verificado se rechaza y no deja sesión activa', async ({
  page,
}) => {
  const email = `e2e-no-verificado-${Date.now()}@example.com`;

  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  const respuestaLogin = await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken, emailVerified: 'false' },
  });
  expect(respuestaLogin.url()).toContain('/email-no-verificado');

  // Sin sesión válida: /registro debe seguir pidiendo autorizar con Google,
  // no dejar completar el formulario (FR-017 — nunca vincula ni crea Persona).
  await page.goto('/registro');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
});
