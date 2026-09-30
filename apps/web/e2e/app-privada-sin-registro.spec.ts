import { test, expect, loguearseComoTest } from './helpers';

/**
 * FR-030 de la 001 (H-R1, revisión manual de la 004): quien entró con Google y
 * no completó el registro tiene sesión pero no Persona. Antes el layout de la
 * app privada solo miraba la sesión y le mostraba Inicio, Mi camino, Eventos,
 * Avisos y Perfil; ahora cada una lo lleva a completar el registro.
 */
for (const ruta of ['/inicio', '/mi-camino', '/mis-eventos', '/avisos', '/perfil']) {
  test(`con sesión y sin registro, ${ruta} lleva a /registro`, async ({ page }) => {
    await loguearseComoTest(page, `e2e-sin-registro-${Date.now()}@example.com`);
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText('Paso 1 de 4')).toBeVisible();
  });
}
