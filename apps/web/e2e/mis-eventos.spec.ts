import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { anotarPorApi, crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';
import { usarTema } from './helpers-006';

/**
 * spec 011, T059 y T065 — Mis eventos en celular, con axe en claro y oscuro:
 * los estados con su texto; cancelar la confirmada hace pasar a la primera de
 * la lista; el estado vacío; subir el comprobante (con error por campo en un
 * archivo no permitido y completando solo con teclado) y ver "Pago en
 * revisión" (FR-018, FR-022 a FR-024, FR-030, FR-031).
 */
const marca = `e2e-mis-${Date.now()}`;
const PDF = Buffer.from('%PDF-1.4\n%%EOF');

test('estado vacío con "Ver eventos" @celular', async ({ page, baseURL }) => {
  const email = `e2e-mis-vacio-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Vacia');
  await loguearseComoTest(page, email);
  await page.goto('/mis-eventos');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Todavía no te anotaste a ningún evento.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver eventos' })).toHaveAttribute('href', '/eventos');
});

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test('cancelar la confirmada hace pasar a la primera de la lista @celular', async ({ page, baseURL }) => {
      const evento = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-${tema}-cancelar`, requiereInscripcion: true, cupo: 1, permiteListaEspera: true });
      const yo = `e2e-mis-${tema}-yo-${Date.now()}@example.com`;
      const otra = `e2e-mis-${tema}-otra-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, yo, 'Yo');
      await crearPersonaActiva(baseURL!, otra, 'Otra');
      await anotarPorApi(baseURL!, yo, evento.id);
      await anotarPorApi(baseURL!, otra, evento.id);

      await loguearseComoTest(page, otra);
      await usarTema(page, otra, tema);
      await page.goto('/mis-eventos');
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      await expect(page.getByRole('article').filter({ hasText: evento.nombre }).getByText('Lugar 1 en la lista de espera')).toBeVisible();

      await loguearseComoTest(page, yo);
      await usarTema(page, yo, tema);
      await page.goto('/mis-eventos');
      await page.waitForLoadState('networkidle');
      const tarjeta = page.getByRole('article').filter({ hasText: evento.nombre });
      await expect(tarjeta.getByText('Estás anotada')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
      await tarjeta.getByRole('button', { name: 'Cancelar inscripción' }).click();
      const dialogo = page.getByRole('alertdialog', { name: `¿Cancelar tu inscripción a ${evento.nombre}?` });
      await expect(dialogo).toBeVisible();
      await expect(page.locator('[data-tono="neutro"]')).toHaveCount(1);
      await dialogo.getByRole('button', { name: 'Sí, cancelar inscripción' }).click();
      await expect(page.getByText('Cancelaste tu inscripción.').first()).toBeVisible();

      await loguearseComoTest(page, otra);
      await page.goto('/mis-eventos');
      await page.waitForLoadState('networkidle');
      const suya = page.getByRole('article').filter({ hasText: evento.nombre });
      await expect(suya.getByText('Estás anotada')).toBeVisible();
      await expect(suya.getByText('¡Se liberó un lugar y pasaste de la lista de espera!')).toBeVisible();
    });

    test('subir el comprobante solo con teclado y ver "Pago en revisión" @celular', async ({ page, baseURL }) => {
      const evento = await crearEventoComoAdmin(baseURL!, {
        nombre: `${marca}-${tema}-pago`,
        requiereInscripcion: true,
        costo: '15000',
        instruccionesPago: 'Alias VIDA.SOBRENATURAL',
      });
      const email = `e2e-mis-${tema}-pago-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, email, 'Paga');
      const insc = await anotarPorApi(baseURL!, email, evento.id);
      await loguearseComoTest(page, email);
      await usarTema(page, email, tema);
      await page.goto(`/mis-eventos?pagar=${insc.id}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);

      const panel = page.getByRole('dialog', { name: 'Subir el comprobante de pago' });
      await expect(panel).toBeVisible();
      await expect(panel.getByText('Alias VIDA.SOBRENATURAL')).toBeVisible();
      await expect(panel.getByLabel('Monto que pagaste (en pesos)')).toHaveValue('15000');
      expect((await auditar(page)).violations).toEqual([]);

      // Un archivo no permitido: el error queda en el campo.
      await panel.getByLabel('Comprobante').setInputFiles({ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
      await panel.getByRole('button', { name: 'Enviar comprobante' }).click();
      await expect(panel.getByText('El comprobante tiene que ser JPG, PNG, WebP o PDF: elegí otro archivo.').first()).toBeVisible();

      // Solo con teclado: el archivo se elige con el input (enfocable), y se envía con Enter.
      await panel.getByLabel('Comprobante').setInputFiles({ name: 'comprobante.pdf', mimeType: 'application/pdf', buffer: PDF });
      await panel.getByLabel('Efectivo').focus();
      await page.keyboard.press('Space');
      await expect(panel.getByLabel('Efectivo')).toBeChecked();
      await panel.getByLabel('Monto que pagaste (en pesos)').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByText('Recibimos tu comprobante. El equipo lo revisa y te avisamos.')).toBeVisible();
      await expect(page.getByRole('article').filter({ hasText: evento.nombre }).getByText('Pago en revisión')).toBeVisible();
    });
  });
}
