import { test, expect, loguearseComoTest } from './helpers';
import { EMAILS_017 } from './helpers-017';

/**
 * QA ronda 2, BUG-10: el mensaje de WhatsApp que arman "Mi ministerio" y "Mi grupo de extensión"
 * dice "soy {yo}" con el nombre de la sesión, no el de la Persona. Con el ingreso por código (el de
 * producción) la sesión no tiene nombre y el mensaje sale "Hola Sofía, soy , del grupo…". En los e2e
 * el test-login pone "Visitante de Test", así que el mensaje tampoco dice el nombre de la líder.
 */
test('el WhatsApp que arma la líder dice su nombre', async ({ page }) => {
  await loguearseComoTest(page, EMAILS_017.lider);
  await page.goto('/mi-ministerio');
  const enlace = page.getByRole('link', { name: /^Escribir por WhatsApp/ }).first();
  await expect(enlace).toBeVisible();
  const texto = decodeURIComponent(new URL((await enlace.getAttribute('href'))!).searchParams.get('text') ?? '');
  // La líder sembrada (sembrar-e2e 016) se llama Lidia.
  expect(texto).toContain('soy Lidia');
});
