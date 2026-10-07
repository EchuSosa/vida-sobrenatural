import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoDiscipuladorE2E, loguearseComoPastorE2E } from './helpers';
import { crearEncuentro, crearGrupo, crearPersona, sinScrollHorizontal, sinSesion } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * specs/004, T048 (FR-009, FR-011, FR-013a, FR-029, FR-041, D134): el
 * Discipulador registra y edita un Encuentro (también en celular); el Admin y
 * el Pastor ven el seguimiento en /grupos/[id] sin la nota; otro Discipulador
 * no encuentra un discipulado ajeno. Claro y oscuro con axe.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Encuentros — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('@celular @webkit el Discipulador registra un Encuentro con nota y lo edita', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const persona = await crearPersona(`e2e-b-enc-${sufijo}@example.com`, { nombre: 'Lucía', apellido: `Encuentro ${sufijo}` });
      const { grupoId } = await crearGrupo([persona]);

      await sinSesion(page);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Lucía Encuentro ${sufijo}`) })).toBeVisible();
      // #contenido: mientras la página llega por streaming, React deja una copia oculta fuera (2cc64e9).
      await expect(page.locator('#contenido').getByText('Todavía no registraste ningún encuentro.', { exact: false })).toBeVisible();
      expect(await sinScrollHorizontal(page)).toBe(true);
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByRole('button', { name: 'Registrar encuentro' }).click();
      const panel = page.getByRole('dialog', { name: 'Registrar encuentro' });
      // H-50: sin capítulos, el error va debajo del campo y en el resumen, con foco en el resumen.
      await panel.getByRole('button', { name: 'Guardar encuentro' }).click();
      const resumen = panel.getByRole('alert');
      await expect(resumen).toBeFocused();
      await expect(resumen).toContainText('Escribí qué capítulos vieron');
      await expect(panel.locator('#campo-capitulos-error')).toContainText('Escribí qué capítulos vieron');
      expect((await auditar(page)).violations).toEqual([]);

      await completarFecha(campo(panel, 'Fecha'), '2026-09-01');
      await panel.getByLabel('Capítulos').fill('1 y 2');
      await panel.getByLabel('Notas (opcional)').fill(`Nota privada ${sufijo}`);
      await panel.getByRole('checkbox', { name: 'Faltó Lucía' }).check();
      await panel.getByRole('button', { name: 'Guardar encuentro' }).click();
      await expect(page.getByText('Encuentro registrado.')).toBeVisible();

      const encuentro = page.getByRole('listitem').filter({ hasText: 'Capítulos: 1 y 2' });
      await expect(encuentro).toContainText(`Nota privada ${sufijo}`);
      await expect(encuentro).toContainText('Faltó: Lucía');

      await encuentro.getByRole('button', { name: /Editar el encuentro del/ }).click();
      const edicion = page.getByRole('dialog', { name: 'Editar el encuentro' });
      await expect(edicion.getByLabel('Capítulos')).toHaveValue('1 y 2');
      await edicion.getByLabel('Capítulos').fill('1 a 3');
      await edicion.getByRole('checkbox', { name: 'Faltó Lucía' }).uncheck();
      await edicion.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Cambios guardados.')).toBeVisible();
      const editado = page.getByRole('listitem').filter({ hasText: 'Capítulos: 1 a 3' });
      await expect(editado).toContainText('Vinieron todos');
      // El toast anterior queda apilado detrás del nuevo mientras se desvanece; en WebKit axe lo
      // medía a mitad de camino (3.7:1). Se audita cuando ya se fue.
      // Con el puntero encima (quedó donde estaba "Guardar cambios"), sonner pausa el tiempo del toast.
      await page.mouse.move(0, 0);
      await expect(page.getByText('Encuentro registrado.')).toHaveCount(0, { timeout: 10_000 });
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('el Admin ve fecha y capítulos sin la nota; el Pastor igual y sin botones', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const persona = await crearPersona(`e2e-b-enc-adm-${sufijo}@example.com`, { nombre: 'Tomás', apellido: `Admin ${sufijo}`, genero: 'masculino' });
      const { grupoId } = await crearGrupo([persona], 'e2e-discipulador-2@example.com');
      await crearEncuentro(grupoId, { fecha: '2026-09-02', capitulos: '4 y 5', notas: `Secreto ${sufijo}` }, 'e2e-discipulador-2@example.com');

      await sinSesion(page);

      await loguearseComoAdminE2E(page);
      await page.goto(`/grupos/${grupoId}`);
      await expect(page.locator('#contenido').getByText('Capítulos: 4 y 5')).toBeVisible();
      await expect(page.getByText(`Secreto ${sufijo}`)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cambiar de Discipulador' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await page.goto('/grupos');
      await expect(page.getByRole('row', { name: new RegExp(`Tomás Admin ${sufijo}`) })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await sinSesion(page);

      await loguearseComoPastorE2E(page);
      await page.goto(`/grupos/${grupoId}`);
      await expect(page.locator('#contenido').getByText('Capítulos: 4 y 5')).toBeVisible();
      await expect(page.getByText(`Secreto ${sufijo}`)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cambiar de Discipulador' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Qué falta decidir' })).toHaveCount(0);
    });

    test('@celular otro Discipulador recibe "no encontrado" en un discipulado ajeno', async ({ page, permitirErrorDeConsola }) => {
      permitirErrorDeConsola(/404/);
      const sufijo = `${colorScheme}-${Date.now()}`;
      const persona = await crearPersona(`e2e-b-enc-ajeno-${sufijo}@example.com`, { nombre: 'Ana', apellido: `Ajena ${sufijo}` });
      const { grupoId } = await crearGrupo([persona]);

      await sinSesion(page);

      await loguearseComoDiscipuladorE2E(page, 2);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await expect(page.getByRole('heading', { name: 'No encontramos este discipulado' })).toBeVisible();
      await expect(page.getByText(`Ajena ${sufijo}`)).toHaveCount(0);
    });
  });
}
