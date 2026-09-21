import { test, expect } from '@playwright/test';
import { loguearseComoAdminE2E, crearMenorPendienteTutor, crearPersonaActiva, crearAxeBuilder } from './helpers';

/**
 * H-29 (revisión manual ronda 2) / H-34 (ronda 3 — la red de regresión que
 * faltaba): activar un menor pendiente_tutor, con y sin tutor vinculado por
 * búsqueda. Corre en modo claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('activar un menor vinculando a un tutor ya registrado, encontrado por búsqueda', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      const emailTutor = `e2e-tutor-${sufijo}@example.com`;
      const apellidoTutor = `Tutor${sufijo}`;

      await crearMenorPendienteTutor(emailMenor);
      await crearPersonaActiva(emailTutor, apellidoTutor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await expect(fila).toBeVisible();
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveCSS('opacity', '1');

      const resultados = await crearAxeBuilder(page).disableRules(['region']).analyze();
      expect(resultados.violations).toEqual([]);

      await panel.getByLabel('Buscar tutor ya registrado (opcional)').fill(apellidoTutor);
      const resultado = panel.getByRole('button', { name: new RegExp(apellidoTutor) });
      await expect(resultado).toBeVisible();
      await resultado.click();

      await expect(panel.getByText('Quitar')).toBeVisible();
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      await expect(page.getByText('E2E Menor')).toHaveCount(0);
    });

    test('activar un menor con los datos del tutor a mano', async ({ page }) => {
      const sufijo = `${colorScheme}-texto-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      await crearMenorPendienteTutor(emailMenor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      await panel.getByLabel('Nombre del tutor').fill('Tutor de Prueba');
      await panel.getByLabel('Teléfono del tutor').fill('+54 9 221 900-0009');
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      await expect(page.getByText('E2E Menor')).toHaveCount(0);
    });
  });
}
