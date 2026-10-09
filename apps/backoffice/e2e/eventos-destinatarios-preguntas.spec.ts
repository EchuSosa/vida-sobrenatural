import type { Page } from '@playwright/test';
import { test, expect, auditar, crearPersona, loguearseComoAdminE2E } from './helpers';
import { ANIO_FUTURO, crearEventoPorApi } from './helpers-011';

/**
 * spec 011, ampliación 2026-10-09 (FR-060 a FR-063, D220) — destinatarios del
 * Evento desde el backoffice, con axe en claro y oscuro: el Admin elige
 * "Mujeres" desde 15 años (con el error por campo si la máxima es menor), el
 * detalle lo explica, y anotar a un varón pide confirmación y lo marca.
 */
async function completarFecha(page: Page, grupo: string, dia: string, mes: string, anio: string) {
  const fecha = page.getByRole('group', { name: grupo });
  await fecha.getByLabel('Día').fill(dia);
  await fecha.getByLabel('Mes').selectOption({ label: mes });
  await fecha.getByLabel('Año').fill(anio);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Destinatarios — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear un Evento para mujeres desde 15 años; edad máxima menor que la mínima se marca en el campo', async ({ page }) => {
      const nombre = `e2e-evento-dest-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/eventos/nuevo');
      await page.waitForLoadState('networkidle');

      await page.getByLabel('Nombre', { exact: true }).fill(nombre);
      await page.getByLabel('Sede').selectOption({ index: 1 });
      await completarFecha(page, 'Fecha de inicio', '14', 'Noviembre', ANIO_FUTURO);
      await page.getByLabel('Descripción').fill('Jornada de sanidad. Salida 8 hs, regreso 20 hs.');
      await page.getByLabel('Mujeres', { exact: true }).check();
      await page.getByLabel(/^Edad mínima/).fill('15');
      await page.getByLabel(/^Edad máxima/).fill('12');
      await page.getByLabel('La gente tiene que anotarse').check();
      await page.getByRole('button', { name: 'Crear el Evento' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos' });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole('link', { name: 'La edad máxima no puede ser menor que la mínima.' })).toBeVisible();
      await expect(page.getByLabel(/^Edad máxima/)).toHaveAttribute('aria-invalid', 'true');
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel(/^Edad máxima/).fill('');
      await page.getByRole('button', { name: 'Crear el Evento' }).click();
      await page.waitForURL(/\/eventos\/[^/]+\?creado=1$/);
      await expect(page.getByText('Este evento es para mujeres desde 15 años.')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('anotar a un varón a un Evento para mujeres pide confirmación y lo marca', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const evento = await crearEventoPorApi({ nombre: `e2e-evento-dest-anotar-${sufijo}`, destinatariosGenero: 'mujeres', edadMinima: 15 });
      await crearPersona(`e2e-dest-varon-${sufijo}@example.com`, { nombre: 'Tomás', apellido: `Dest${sufijo}`, genero: 'masculino' });

      await loguearseComoAdminE2E(page);
      await page.goto(`/eventos/${evento.id}`);
      await page.waitForLoadState('networkidle');
      const seccion = page.locator('#inscriptos');
      await seccion.getByRole('button', { name: 'Anotar a una Persona' }).click();
      const panel = page.getByRole('dialog');
      await panel.getByLabel('Buscar por nombre').fill(`Dest${sufijo}`);
      await panel.getByRole('button', { name: new RegExp(`Tomás Dest${sufijo}`) }).click();
      await panel.getByRole('button', { name: 'Anotar', exact: true }).click();

      const aviso = panel.getByTestId('anotar-no-corresponde');
      await expect(aviso).toContainText(`Tomás Dest${sufijo} no está entre los destinatarios`);
      await expect(aviso).toContainText('Este evento es para mujeres desde 15 años.');
      expect((await auditar(page)).violations).toEqual([]);
      await panel.getByRole('button', { name: 'Sí, anotarla igual' }).click();
      await expect(page.getByText(`Tomás Dest${sufijo} quedó anotada`, { exact: false })).toBeVisible();
      await seccion.getByRole('link', { name: /Confirmadas/ }).click();
      await expect(seccion.getByRole('row').filter({ hasText: 'Tomás' }).getByText('Anotada aunque no está entre los destinatarios')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}
