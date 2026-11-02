import { test, expect, loguearseComoTest } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * QA ronda 1, BUG-01: el registro acepta cualquier fecha de nacimiento con 4
 * números en el año. Con un año mal tipeado, una persona adulta queda como
 * menor y no puede entrar ("Todavía no podés ingresar"). Marcado `fail` hasta
 * arreglar el producto: cuando pase, Playwright avisa y se saca la marca.
 */
for (const { caso, fecha } of [
  { caso: 'futura', fecha: '2096-03-10' },
  { caso: 'de hace más de 200 años', fecha: '1800-01-01' },
]) {
  test(`no deja seguir con una fecha de nacimiento ${caso}`, async ({ page }) => {
    test.fail(true, 'BUG-01 de QA-REPORT.md: el registro no valida el rango de la fecha de nacimiento.');
    await loguearseComoTest(page, `e2e-qa-fecha-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill('Prueba');
    await page.getByLabel('Nombre').fill('Fecha');
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), fecha);
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisá estos campos' })).toBeVisible();
    await expect(page.getByText(/Paso 1 de 4/i)).toBeVisible();
  });
}
