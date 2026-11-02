import type { Page } from '@playwright/test';
import type { PerfilPersona } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, auditar, crearPersona, idDePersona, loguearseComoAdminE2E, loguearseComoPastorE2E, sinScrollHorizontal, EMAIL_ADMIN, EMAIL_DISCIPULADOR_1 } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * spec 013, T083 (Historia 7): "Editar datos" desde el perfil, con el
 * formulario del alta de la 006. H7.1 (datos actuales, mismos mensajes por
 * campo), H7.2 (D133 explicado), H7.3 (email de otra Persona), H7.4 (toast y
 * perfil actualizado), H7.5 (el Pastor sin el botón ni la pantalla); axe en
 * claro y oscuro, `@celular`. Personas con email `e2e-…` (las borra limpiar-e2e).
 */

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page, permitirErrorDeConsola }) => {
      // Los rechazos que el test provoca a propósito (409 por email repetido o D133).
      permitirErrorDeConsola(/the server responded with a status of (400|409)/);
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('H7.1 y H7.4: abre con los datos actuales, errores por campo como el alta, guarda y vuelve al perfil con toast @celular', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const email = `e2e-editar-${sufijo}@example.com`;
      const persona = await crearPersona(email, { nombre: 'Rosa', apellido: `Editar ${sufijo}`, telefono: '+54 9 221 555 0101' });
      await loguearseComoAdminE2E(page);

      await page.goto(`/personas/${persona.id}`);
      await page.getByRole('link', { name: 'Editar datos' }).click();
      await expect(page).toHaveURL(new RegExp(`/personas/${persona.id}/editar$`));
      await expect(page.getByRole('heading', { level: 1, name: `Editar los datos de Rosa Editar ${sufijo}` })).toBeVisible();
      // Los datos actuales, en los mismos campos del alta.
      await expect(page.getByLabel('Apellido')).toHaveValue(`Editar ${sufijo}`);
      await expect(page.getByLabel('Teléfono')).toHaveValue('92215550101');
      await expect(page.getByLabel('Email (opcional)')).toHaveValue(email);
      expect(await sinScrollHorizontal(page)).toBe(true);
      await sinViolaciones(page);

      // Mismo mensaje y resumen que el alta (H-50).
      await page.getByLabel('Dirección').fill('');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá esto antes de guardar:' });
      await expect(resumen).toBeFocused();
      await expect(page.locator('#campo-direccion-error')).toHaveText('Escribí la dirección.');
      await sinViolaciones(page);

      await page.getByLabel('Dirección').fill('Calle 50 número 742');
      await page.getByLabel('Teléfono').fill('2215550202');
      // Doble toque: un solo guardado (H-57).
      await page.getByRole('button', { name: 'Guardar cambios' }).dblclick();
      await expect(page.getByText('Guardamos los cambios')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/personas/${persona.id}$`));
      await expect(page.getByText('Calle 50 número 742')).toBeVisible();
      await expect(page.getByRole('link', { name: '+54 2215550202' })).toBeVisible();
      await sinViolaciones(page);
    });

    test('H7.2 y H7.3: una fecha que vuelve menor a un Discipulador se explica; el email de otra Persona, en su campo', async ({ page }) => {
      const discipuladorId = await idDePersona(EMAIL_DISCIPULADOR_1);
      await loguearseComoAdminE2E(page);
      await page.goto(`/personas/${discipuladorId}/editar`);
      await page.waitForLoadState('networkidle');

      const anio = new Date().getUTCFullYear();
      await completarFecha(campo(page, 'Fecha de nacimiento'), `${anio - 15}-06-01`);
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.locator('#campo-fechaNacimiento-error')).toContainText('Primero quitale el rol desde su perfil');
      await sinViolaciones(page);
      const sinCambiar = await apiComo<PerfilPersona>(EMAIL_ADMIN, 'GET', `/personas/${discipuladorId}/perfil`);
      expect(sinCambiar.fechaNacimiento.slice(0, 4)).not.toBe(String(anio - 15));

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.getByLabel('Email (opcional)').fill(EMAIL_ADMIN);
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.locator('#campo-email-error')).toHaveText('Ese email ya lo usa otra Persona. Revisá si está bien escrito o dejalo vacío.');
      await sinViolaciones(page);
    });

    test('H7.5: el Pastor ve el perfil sin "Editar datos" y no llega al formulario', async ({ page }) => {
      const discipuladorId = await idDePersona(EMAIL_DISCIPULADOR_1);
      await loguearseComoPastorE2E(page);
      await page.goto(`/personas/${discipuladorId}`);
      await expect(page.getByRole('heading', { name: 'Datos' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Editar datos' })).toHaveCount(0);
      await page.goto(`/personas/${discipuladorId}/editar`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
    });
  });
}
