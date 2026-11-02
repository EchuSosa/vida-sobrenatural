import { test, expect, registrarPersonaDeTest } from './helpers';

/**
 * QA ronda 1, BUG-03 (caso GEX-11 del manual): la API responde
 * DIRECCION_NO_UBICADA por campo, pero el buscador busca el texto en
 * `errors.campos` y el mensaje vive en `errors`: la persona ve "No pudimos
 * completar el pedido" en vez de cómo corregir la dirección. Marcado `fail`
 * hasta arreglar el producto.
 */
test('una dirección que no existe explica cómo escribirla @celular', async ({ page, permitirErrorDeConsola }) => {
  test.fail(true, 'BUG-03 de QA-REPORT.md: DIRECCION_NO_UBICADA cae en el mensaje genérico.');
  permitirErrorDeConsola(/status of 400/);
  await registrarPersonaDeTest(page, `e2e-qa-gex-dir-${Date.now()}@example.com`);
  await page.goto('/mi-camino/grupo-extension');
  await page.getByLabel('Tu dirección').fill('calle que no existe 99999');
  await page.getByRole('button', { name: 'Buscar grupos' }).click();
  await expect(page.getByText(/No encontramos esa dirección/).first()).toBeVisible();
});
