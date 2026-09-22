import { test, expect, loguearseComoTest, registrarPersonaDeTest } from './helpers';

/**
 * Historia 5 (specs/002-base-transversal): elegir un tema en Perfil persiste
 * entre recargas y entre sesiones (FR-027, FR-028).
 */

test('elegir Oscuro en Perfil persiste tras recargar y volver a loguearse', async ({ page }) => {
  const email = `e2e-tema-${Date.now()}@example.com`;
  await registrarPersonaDeTest(page, email);

  // Ya NO hace falta re-loguearse acá para tener personaId real: H-19
  // (actualización 2026-09-18) hace que registro/page.tsx llame a update()
  // de NextAuth apenas se completa el registro, así que la sesión de esta
  // misma pestaña ya queda al día sin un login nuevo.
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
