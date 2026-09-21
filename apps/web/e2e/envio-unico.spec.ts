import { test, expect } from '@playwright/test';
import { registrarPersonaDeTest } from './helpers';

/**
 * H-57 (revisión manual, D118 la reveló en Sedes — varios toasts abiertos
 * a la vez probaban que el guard faltaba): tres clics seguidos en un
 * "Guardar" tienen que disparar UNA sola petición, no una por clic. El
 * guard real vive en `useEnvio` (packages/ui) — un ref, no `useState`,
 * porque React todavía no re-renderiza (el botón no se ve bloqueado
 * todavía) en el instante entre el primer clic y el segundo si llegan muy
 * seguidos. Por eso el test dispara los tres clics sincrónicamente en la
 * página (`el.click()` tres veces seguidas), sin pasar por el actionability
 * checking de Playwright entre uno y otro — así se prueba la carrera real,
 * no una que Playwright ya serializó por su cuenta.
 */
test('tres clics seguidos en Guardar cambios de Perfil disparan una sola petición', async ({ page }) => {
  const email = `e2e-envio-unico-${Date.now()}@example.com`;
  await registrarPersonaDeTest(page, email);
  await page.goto('/perfil');
  await page.waitForLoadState('networkidle');

  let peticiones = 0;
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().endsWith('/personas/me')) {
      peticiones++;
    }
  });

  const boton = page.getByRole('button', { name: 'Guardar cambios' });
  await boton.evaluate((el: HTMLElement) => {
    el.click();
    el.click();
    el.click();
  });

  await expect(page.getByText('Guardamos tus cambios.')).toBeVisible();
  expect(peticiones).toBe(1);
});
