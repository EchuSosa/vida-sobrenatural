import { test, expect } from '@playwright/test';
import { loguearseComoAdminE2E, crearMenorPendienteTutor, crearPersonaActiva, auditar } from './helpers';

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

      const resultados = await auditar(page, ['region']);
      expect(resultados.violations).toEqual([]);

      await panel.getByLabel('Buscar tutor ya registrado (opcional)').fill(apellidoTutor);
      const resultado = panel.getByRole('button', { name: new RegExp(apellidoTutor) });
      await expect(resultado).toBeVisible();
      await resultado.click();

      await expect(panel.getByText('Quitar')).toBeVisible();
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      // Escopado a <main> — no a `getByText('E2E Menor')` a secas: el toast
      // de éxito ("E2E Menor: caso activado.") repite el nombre y tarda unos
      // segundos en desaparecer (sonner), así que sin este scope el conteo
      // podía quedar en 1 aunque la fila ya se hubiera ido de la tabla.
      await expect(page.getByRole('main').getByText('E2E Menor')).toHaveCount(0);
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
      await panel.getByLabel('Nombre del tutor').fill('Tutor');
      await panel.getByLabel('Apellido del tutor').fill('de Prueba');
      await panel.getByLabel('Teléfono del tutor').fill('92219000009');
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      // Ver el comentario del primer test — escopado a <main> por el mismo motivo.
      await expect(page.getByRole('main').getByText('E2E Menor')).toHaveCount(0);
    });

    test('H-71: el teléfono del tutor usa el selector de código de país; H-72: su error se limpia al escribir y revalida al salir', async ({
      page,
    }) => {
      const sufijo = `${colorScheme}-h71-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      await crearMenorPendienteTutor(emailMenor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();

      // H-71: código de país propio (D90), como en registro/Perfil/Sede —
      // antes era un Input plano de texto libre.
      await expect(panel.getByLabel('Código de país')).toHaveValue('+54');

      const telefono = panel.getByLabel('Teléfono del tutor');
      const errorTelefono = panel.locator('#campo-tutorTelefono-error');

      // H-72: formato inválido + salir del campo, sin haber enviado.
      await telefono.fill('12');
      await telefono.blur();
      await expect(errorTelefono).toBeVisible();
      await expect(errorTelefono).toHaveText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.');

      // Escribir de nuevo lo limpia al toque, antes de volver a salir del campo.
      await telefono.fill('123');
      await expect(errorTelefono).toBeHidden();

      // Corregido y fuera del campo: se queda limpio.
      await telefono.fill('92219000009');
      await telefono.blur();
      await expect(errorTelefono).toBeHidden();

      await expect(panel).toBeVisible();

      // Nunca se envió — cierra el caso para no dejar un "E2E Menor" de más
      // en la lista (el resto de este archivo busca filas por ese nombre).
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await fila.getByRole('button', { name: 'Cerrar el caso' }).click();
      await page
        .getByRole('alertdialog', { name: /¿Cerrar el caso de/ })
        .getByRole('button', { name: 'Sí, cerrar el caso' })
        .click();
      await expect(page.getByText('Caso cerrado.')).toBeVisible();
    });
  });
}
