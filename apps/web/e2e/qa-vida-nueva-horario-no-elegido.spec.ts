import { test, expect, registrarPersonaDeTest } from './helpers';

/**
 * QA ronda 1, BUG-02 (caso VN-10 del manual): el editor de franjas arranca con
 * Martes 19:00 a 21:00 ya elegido. Si la persona toca "Quiero empezar Vida
 * Nueva" sin elegir nada, el pedido sale con un horario que nunca eligió, y
 * el mensaje que pide elegir uno no aparece. Marcado `fail` hasta arreglar el
 * producto.
 */
test('sin elegir un horario no se envía el pedido de Vida Nueva @celular', async ({ page }) => {
  test.fail(true, 'BUG-02 de QA-REPORT.md: el pedido sale con el horario que el editor trae por defecto.');
  await registrarPersonaDeTest(page, `e2e-qa-vn-horario-${Date.now()}@example.com`);
  await page.goto('/mi-camino/vida-nueva');
  await page.getByRole('button', { name: 'Quiero empezar Vida Nueva' }).click();
  await expect(page.getByText(/Elegí un día y un horario/).first()).toBeVisible();
  await expect(page.getByText('Estamos buscando a tu Discipulador')).toHaveCount(0);
});
