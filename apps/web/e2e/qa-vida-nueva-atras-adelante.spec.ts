import { test, expect, registrarPersonaDeTest } from './helpers';
import { campo, elegirHora } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * QA ronda 1, BUG-07: después de pedir Vida Nueva, atrás y adelante en el
 * navegador muestran otra vez el formulario vacío, como si no hubiera pedido.
 * Arreglado: cada cambio de la tarjeta hace `router.refresh()`.
 */
test('atrás y adelante después de pedir no vuelven a mostrar el formulario @celular', async ({ page }) => {
  await registrarPersonaDeTest(page, `e2e-qa-vn-atras-${Date.now()}@example.com`);
  await page.goto('/mi-camino');
  await page.goto('/mi-camino/vida-nueva');
  // El día se elige explícitamente: el editor no trae ninguno por defecto (D247, BUG-02).
  await page.getByLabel('Día', { exact: true }).selectOption({ label: 'Martes' });
  await elegirHora(campo(page, 'Desde'), '10:00');
  await elegirHora(campo(page, 'Hasta'), '12:00');
  await page.getByRole('button', { name: 'Quiero empezar Vida Nueva' }).click();
  await expect(page.getByText('Estamos buscando a tu Discipulador')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/mi-camino$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/mi-camino\/vida-nueva$/);
  await expect(page.getByText('Estamos buscando a tu Discipulador')).toBeVisible();
});
