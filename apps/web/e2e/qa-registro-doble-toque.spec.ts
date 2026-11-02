import { test, expect, loguearseComoTest } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * QA ronda 1, BUG-04: en celular "Atrás" del paso 2 aparece en el mismo lugar
 * donde estaba "Siguiente" del paso 1. Con un doble toque, la persona avanza y
 * vuelve sola, sin ningún aviso. Marcado `fail` hasta arreglar el producto.
 */
test.describe('registro en celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('un doble toque en "Siguiente" no devuelve al paso 1', async ({ page }) => {
    test.fail(true, 'BUG-04 de QA-REPORT.md: el segundo toque cae sobre "Atrás".');
    await loguearseComoTest(page, `e2e-qa-doble-toque-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill('Prueba');
    await page.getByLabel('Nombre').fill('Doble');
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), '1990-01-01');
    await page.getByRole('button', { name: 'Siguiente' }).dblclick();
    await expect(page.getByText(/Paso 2 de 4/i)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Paso 2 de 4/i)).toBeVisible();
  });
});
