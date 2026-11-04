import { test, expect, loguearseComoTest } from './helpers';
import { EDICION_015, EMAILS_015 } from './helpers-015';

/**
 * QA ronda 2, BUG-17: en la charla de la elección de ministerio, la líder ve los datos de la persona
 * escritos como si fueran suyos: "Todavía no tenés grupo de extensión" y, si eligió dos, "Ya elegiste
 * 2 ministerios". El bloque "Lo que ya sabemos" se reusa de la pantalla de la persona sin cambiar
 * la persona gramatical.
 */
test.fail('la ficha de la charla habla de la persona en tercera persona', async ({ page }) => {
  await loguearseComoTest(page, EMAILS_015.lider);
  await page.goto('/mis-grupos');
  await page.getByRole('link', { name: EDICION_015 }).click();
  await page.getByRole('link', { name: 'Elección de ministerio' }).click();
  await expect(page).toHaveURL(/\/elecciones$/);
  await page.getByRole('link', { name: /E2E Elección/ }).first().click();
  await expect(page).toHaveURL(/\/elecciones\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Charla con');
  const main = page.getByRole('main');
  await expect(main).not.toContainText(/Todavía no tenés grupo de extensión|Formás parte de/, { timeout: 3000 });
});
