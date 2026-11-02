import { test, expect, loguearseComoTest } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * QA ronda 1, BUG-04: en celular "Atrás" del paso 2 aparece en el mismo lugar
 * donde estaba "Siguiente" del paso 1. Con un doble toque, la persona avanza y
 * vuelve sola, sin ningún aviso. Arreglado (D249): en celular "Atrás" va
 * arriba, y después de cambiar de paso los botones quedan sin efecto un momento.
 */
test.describe('registro en celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('un doble toque en "Siguiente" no devuelve al paso 1', async ({ page }) => {
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

  test('un doble toque en "Siguiente" del paso 2 no saltea el paso 3; "Atrás" queda arriba (D249)', async ({ page }) => {
    await loguearseComoTest(page, `e2e-qa-doble-toque-2-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill('Prueba');
    await page.getByLabel('Nombre').fill('Doble');
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), '1990-01-01');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByText(/Paso 2 de 4/i)).toBeVisible();
    const titulo = await page.getByRole('heading', { level: 2 }).boundingBox();
    const atras = await page.getByRole('button', { name: 'Atrás' }).boundingBox();
    expect(atras!.y + atras!.height).toBeLessThanOrEqual(titulo!.y);

    await page.getByLabel('Número de teléfono').fill('92211234567');
    await page.getByLabel('Dirección').fill('Calle 1 y 50');
    await page.getByLabel('Sede').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Siguiente' }).dblclick();
    await expect(page.getByText(/Paso 3 de 4/i)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Paso 3 de 4/i)).toBeVisible();
    // Ningún campo del paso 3 quedó marcado: el segundo toque no intentó avanzar.
    await expect(page.getByRole('alert').filter({ hasText: 'Revisá estos campos' })).toHaveCount(0);
  });
});
