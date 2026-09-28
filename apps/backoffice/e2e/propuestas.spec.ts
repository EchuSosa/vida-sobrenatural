import { test, expect, auditar, loguearseComoDiscipuladorE2E } from './helpers';
import { crearPersona, crearPropuesta, estadoDeSolicitud, sinScrollHorizontal } from './discipulado-datos';

/**
 * specs/004, T037f (FR-037, FR-046, FR-047): el Discipulador responde sus
 * propuestas desde el teléfono. Corre en los dos proyectos (escritorio y
 * `celular`, por la etiqueta @celular), claro y oscuro con axe.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Propuestas del Discipulador @celular — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('ve la propuesta primero y sin teléfono; declina con motivo y la Solicitud vuelve a pendiente', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const personaId = await crearPersona(`e2e-b-prop-dec-${sufijo}@example.com`, {
        nombre: 'Rocío',
        apellido: `Declina ${sufijo}`,
        telefono: '+54 9 221 777 1234',
      });
      const { solicitudId } = await crearPropuesta(personaId);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto('/mis-discipulados');
      const tarjeta = page.getByRole('article', { name: new RegExp(`Rocío Declina ${sufijo}`) });
      await expect(tarjeta).toBeVisible();
      // Las propuestas van primero: su encabezado antecede al de los discipulados.
      const encabezados = await page.getByRole('heading', { level: 2 }).allTextContents();
      expect(encabezados.indexOf('Propuestas para vos')).toBeLessThan(encabezados.indexOf('Tus discipulados'));
      await expect(tarjeta).not.toContainText('777 1234');
      await expect(tarjeta.getByText('Coincide en horario y género')).toBeVisible();
      expect(await sinScrollHorizontal(page)).toBe(true);
      expect((await auditar(page)).violations).toEqual([]);

      await tarjeta.getByRole('button', { name: 'Declinar' }).click();
      const panel = page.getByRole('dialog', { name: /Declinar la propuesta de Rocío/ });
      await panel.getByLabel('Motivo (opcional)').fill('Ese horario ya lo tengo ocupado');
      expect((await auditar(page)).violations).toEqual([]);
      await panel.getByRole('button', { name: 'Sí, declinar' }).click();
      await expect(page.getByText('Declinaste la propuesta. El equipo ya lo sabe.')).toBeVisible();
      await expect(tarjeta).toHaveCount(0);
      expect(await estadoDeSolicitud(solicitudId)).toBe('pendiente');
    });

    test('acepta una propuesta y aparece en sus discipulados con el teléfono', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const personaId = await crearPersona(`e2e-b-prop-acep-${sufijo}@example.com`, {
        nombre: 'Martina',
        apellido: `Acepta ${sufijo}`,
        telefono: '+54 9 221 888 4321',
      });
      await crearPropuesta(personaId);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto('/mis-discipulados');
      const tarjeta = page.getByRole('article', { name: new RegExp(`Martina Acepta ${sufijo}`) });
      const aceptar = tarjeta.getByRole('button', { name: 'Aceptar a Martina' });
      // docs/15, Celular: la acción principal es un objetivo táctil de al menos 44 px.
      expect((await aceptar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await aceptar.click();
      await expect(page.getByRole('alertdialog', { name: /Aceptás acompañar a Martina/ })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Sí, acepto' }).click();
      await expect(page.getByText(/Aceptaste\. Ya podés ver los datos de contacto/)).toBeVisible();

      const discipulado = page.getByRole('article', { name: new RegExp(`Martina Acepta ${sufijo}`) });
      await expect(discipulado.getByRole('link', { name: /Llamar a Martina: \+54 9 221 888 4321/ })).toHaveAttribute('href', 'tel:+5492218884321');
      expect(await sinScrollHorizontal(page)).toBe(true);
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('sin agenda ve el aviso de FR-047 con el enlace a Mi disponibilidad', async ({ page }) => {
      await loguearseComoDiscipuladorE2E(page, 'sin-agenda');
      await page.goto('/mis-discipulados');
      await expect(page.getByRole('heading', { name: 'Todavía no cargaste tus horarios' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Cargar mis horarios' })).toHaveAttribute('href', '/mi-disponibilidad');
      await expect(page.getByText('Todavía no acompañás a nadie.', { exact: false })).toBeVisible();
      expect(await sinScrollHorizontal(page)).toBe(true);
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}
