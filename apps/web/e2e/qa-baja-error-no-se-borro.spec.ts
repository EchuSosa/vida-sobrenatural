import { test, expect, loguearseComoTest } from './helpers';
import { crearPersonaActiva } from './helpers-011';
import { CONSOLA_500, apiCaida } from '../../../scripts/e2e-casos-infelices';

/**
 * QA ronda 2, BUG-16: spec 018, US1 escenario 4 — si la API falla al darse de baja, el aviso tiene
 * que decir que no se borró nada. El texto existe ("No pudimos darte de baja y no se borró nada…"),
 * pero nunca se ve: el código de error interno tiene traducción propia y gana siempre. Para una
 * acción que no se deshace, la persona se queda sin saber si perdió sus datos.
 */
test.fail('con la API caída, la baja dice que no se borró nada', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const email = `e2e-qa-baja-error-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Baja');
  await loguearseComoTest(page, email);
  await page.goto('/perfil/baja');
  await apiCaida(page, 'POST', /\/personas\/me\/baja$/);
  await page.getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
  await page.getByRole('button', { name: 'Darme de baja' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'no se borró nada' })).toBeVisible({ timeout: 5000 });
});
