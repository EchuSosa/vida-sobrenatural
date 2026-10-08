import type { Page } from '@playwright/test';
import sharp from 'sharp';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { ANIO_FUTURO, crearEventoPorApi } from './helpers-011';

/**
 * spec 011, T032 y T039 — gestión de Eventos en el backoffice, con axe en
 * claro y oscuro (Principio VII): crear con inscripción, cupo y costo; el
 * formulario sin datos enfoca el resumen; el detalle muestra el QR con su
 * link y la descarga es un PNG; el flyer exige texto alternativo; renombrar
 * no cambia el link (FR-010 a FR-013); cancelar, reactivar, eliminar y
 * restaurar (FR-040 a FR-043); el Pastor ve sin acciones (FR-009).
 */

async function flyerValido(): Promise<Buffer> {
  return sharp({ create: { width: 1080, height: 1350, channels: 3, background: { r: 30, g: 60, b: 120 } } }).png().toBuffer();
}

async function completarFecha(page: Page, grupo: string, dia: string, mes: string, anio: string) {
  const fecha = page.getByRole('group', { name: grupo });
  await fecha.getByLabel('Día').fill(dia);
  await fecha.getByLabel('Mes').selectOption({ label: mes });
  await fecha.getByLabel('Año').fill(anio);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Eventos — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear un Evento con inscripción, cupo y costo; QR con link y descarga; flyer con texto alternativo; renombrar no cambia el link', async ({ page }) => {
      const nombre = `e2e-evento-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/eventos');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Eventos', level: 1 })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByRole('link', { name: 'Crear un Evento' }).first().click();
      await page.waitForURL('**/eventos/nuevo');

      // Sin datos: no guarda, el resumen toma el foco y dice qué completar (H-50).
      await page.getByRole('button', { name: 'Crear el Evento' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos' });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole('link', { name: 'Escribí el nombre del Evento.' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel('Nombre', { exact: true }).fill(nombre);
      await page.getByLabel('Sede').selectOption({ index: 1 });
      await completarFecha(page, 'Fecha de inicio', '14', 'Noviembre', ANIO_FUTURO);
      await page.getByLabel('Descripción').fill('Tres días en la sierra.');
      await page.getByLabel('La gente tiene que anotarse').check();
      await page.getByLabel(/^Cupo/).fill('2');
      await page.getByLabel('Cuando se llena, anotar en lista de espera').check();
      await page.getByLabel('Tiene costo').check();
      await page.getByLabel('Costo en pesos').fill('15000');
      await page.getByLabel('Instrucciones de pago').fill('Alias VIDA.SOBRENATURAL');
      await page.getByRole('button', { name: 'Crear el Evento' }).click();

      await page.waitForURL(/\/eventos\/[^/]+\?creado=1$/);
      const id = new URL(page.url()).pathname.split('/').pop()!;
      await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Evento creado' })).toBeVisible();

      // QR con su link al lado (D83) y descarga en PNG (FR-013).
      await expect(page.getByRole('img', { name: `Código QR que lleva a la página de ${nombre}` })).toBeVisible();
      const link = await page.getByLabel('Link del Evento').inputValue();
      expect(link).toMatch(new RegExp(`/eventos/${nombre}$`));
      const qr = await page.request.get(`/api/eventos/${id}/qr.png`);
      expect(qr.status()).toBe(200);
      expect(qr.headers()['content-type']).toBe('image/png');
      expect((await auditar(page)).violations).toEqual([]);

      // Flyer: sin texto alternativo no se sube (D83, FR-012).
      await page.getByLabel('Archivo del flyer').setInputFiles({ name: 'flyer.png', mimeType: 'image/png', buffer: await flyerValido() });
      await page.locator('#contenido').getByRole('button', { name: 'Subir flyer', exact: true }).click();
      await expect(page.getByText('Describí el flyer para quien no lo puede ver.')).toBeVisible();
      await page.getByLabel('Texto alternativo').fill(`${nombre}, 14 de noviembre`);
      await page.locator('#contenido').getByRole('button', { name: 'Subir flyer', exact: true }).click();
      await expect(page.getByText('Flyer guardado.')).toBeVisible();
      await expect(page.getByRole('img', { name: `${nombre}, 14 de noviembre` })).toBeVisible();

      // Renombrar no cambia el link (FR-011).
      await page.getByRole('button', { name: 'Editar' }).click();
      await page.getByLabel('Nombre', { exact: true }).fill(`${nombre} renombrado`);
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Cambios guardados.')).toBeVisible();
      await expect(page.getByRole('heading', { name: `${nombre} renombrado`, level: 1 })).toBeVisible();
      expect(await page.getByLabel('Link del Evento').inputValue()).toBe(link);
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('cancelar, reactivar, eliminar y restaurar desde la papelera', async ({ page }) => {
      const evento = await crearEventoPorApi({ nombre: `e2e-evento-ciclo-${colorScheme}-${Date.now()}` });
      await loguearseComoAdminE2E(page);
      await page.goto(`/eventos/${evento.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: evento.nombre, level: 1 })).toBeVisible();

      // Cancelar es reversible: confirmación neutra (D151) que nombra el Evento.
      await page.getByRole('button', { name: 'Cancelar el Evento' }).click();
      const dialogo = page.getByRole('alertdialog', { name: `¿Cancelar ${evento.nombre}?` });
      await expect(dialogo).toBeVisible();
      await expect(page.locator('[data-tono="neutro"]')).toHaveCount(1);
      expect((await auditar(page)).violations).toEqual([]);
      await dialogo.getByRole('button', { name: 'Sí, cancelar el Evento' }).click();
      await expect(page.getByText('Evento cancelado.')).toBeVisible();
      await expect(page.getByText('Este Evento está cancelado')).toBeVisible();

      await page.getByRole('button', { name: 'Reactivar' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, reactivar' }).click();
      await expect(page.getByText('Evento reactivado.')).toBeVisible();

      // Sin inscripciones se puede eliminar; queda en la papelera.
      await page.getByRole('button', { name: 'Eliminar' }).click();
      await page.getByRole('alertdialog', { name: `¿Eliminar ${evento.nombre}?` }).getByRole('button', { name: 'Sí, eliminar' }).click();
      await page.waitForURL('**/eventos');
      await expect(page.getByText('Evento eliminado. Está en la papelera.')).toBeVisible();

      await page.goto('/eventos/papelera');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Papelera de Eventos' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      const fila = page.getByRole('row').filter({ hasText: evento.nombre });
      await fila.getByRole('button', { name: 'Restaurar' }).click();
      await expect(page.getByText('Evento restaurado.')).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: evento.nombre })).toHaveCount(0);
    });
  });
}

test('el Pastor ve el listado y el detalle sin ninguna acción (FR-009)', async ({ page }) => {
  const evento = await crearEventoPorApi({ nombre: `e2e-evento-pastor-${Date.now()}` });
  await loguearseComoPastorE2E(page);
  await page.goto('/eventos');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Eventos', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear un Evento' })).toHaveCount(0);
  await page.goto(`/eventos/${evento.id}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: evento.nombre, level: 1 })).toBeVisible();
  await expect(page.getByRole('img', { name: `Código QR que lleva a la página de ${evento.nombre}` })).toBeVisible();
  for (const accion of ['Editar', 'Cancelar el Evento', 'Eliminar', 'Subir flyer']) {
    await expect(page.getByRole('button', { name: accion, exact: true })).toHaveCount(0);
  }
  await page.goto('/eventos/nuevo');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Crear el Evento' })).toHaveCount(0);
});
