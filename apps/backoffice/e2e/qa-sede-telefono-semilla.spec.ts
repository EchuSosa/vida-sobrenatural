import { test, expect, loguearseComoAdminE2E } from './helpers';

/**
 * QA ronda 2, BUG-12: `db:seed` crea La Plata con el teléfono de contacto "+54 9 221 000-0000", que
 * la propia API rechaza (CONTACTOTELEFONO_INVALIDO). El Admin que solo quiere cargar el WhatsApp de
 * Secretaría (CAT-01) no puede guardar: el error cae en un campo que no tocó. Los e2e de Sedes no lo
 * ven porque crean sus propias Sedes.
 */
test.fail('en la Sede La Plata del seed se puede cargar el WhatsApp sin tocar nada más', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/sedes');
  await page.getByRole('button', { name: 'Acciones para La Plata' }).click();
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click();
  await expect(page.getByRole('heading', { name: 'La Plata' })).toBeVisible();

  const whatsapp = page.getByLabel('WhatsApp de Secretaría (opcional)');
  await whatsapp.fill('221 555 0101');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible({ timeout: 5000 });

  // Si se pudo guardar, deja la Sede como estaba.
  await whatsapp.fill('');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.').first()).toBeVisible();
});
