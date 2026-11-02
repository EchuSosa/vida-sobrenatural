import { test, expect, loguearseComoTest } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * QA ronda 1, BUG-05: el registro acepta apellido y nombre hechos solo de
 * espacios, y también de 5000 caracteres, y los guarda. Con espacios muestra
 * "Escribí tu apellido." y aun así pasa al paso 2. Arreglado (D248): se recortan
 * los espacios y van de 1 a 100 caracteres (`nombreValido`, shared-types).
 */
for (const { caso, texto } of [
  { caso: 'solo con espacios', texto: '     ' },
  { caso: 'de 5000 caracteres', texto: 'A'.repeat(5000) },
]) {
  test(`no deja seguir con apellido y nombre ${caso}`, async ({ page }) => {
    await loguearseComoTest(page, `e2e-qa-nombre-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill(texto);
    await page.getByLabel('Nombre').fill(texto);
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), '1990-01-01');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText(/Paso 1 de 4/i)).toBeVisible();
  });
}
