import { test, expect, auditar, loguearseComoAdminE2E } from './helpers';
import {
  crearGrupo,
  crearPersona,
  estadoDeGrupo,
  estadoDeInscripcion,
  estadoMiCamino,
  EMAIL_DISCIPULADOR_1,
  fijarMaximoPorGrupo,
  pedirVidaNuevaComo,
  sinSesion,
} from './helpers';
import { discipuladorEnLaWeb, enLaWeb } from './helpers-006';

/**
 * specs/004, T054d (FR-042) y T054g (FR-048): en un Grupo de dos, el
 * Discipulador pide la baja de una Persona con motivo; el Admin la ve en la
 * tarjeta de Pendientes del Inicio y en /grupos, y la confirma; el Grupo
 * sigue con la otra. Claro y oscuro con axe.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Baja de una Persona — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('@celular el Discipulador pide la baja; el Admin la ve en Pendientes y en /grupos, y la confirma', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      await fijarMaximoPorGrupo(EMAIL_DISCIPULADOR_1, 2);
      const sigue = await crearPersona(`e2e-b-baja-sigue-${sufijo}@example.com`, { nombre: 'Sofía', apellido: `Sigue ${sufijo}` });
      const seVa = await crearPersona(`e2e-b-baja-sale-${sufijo}@example.com`, { nombre: 'Valeria', apellido: `Sale ${sufijo}` });
      const { grupoId, inscripciones } = await crearGrupo([sigue, seVa]);

      await sinSesion(page);

      await discipuladorEnLaWeb(page, 1, colorScheme);
      await page.goto(enLaWeb(`/mis-discipulados/${grupoId}`));
      await expect(page.locator('#contenido').getByText('2 de 2 lugares en el Grupo')).toBeVisible();
      await page.getByRole('button', { name: 'Pedir la baja de Valeria' }).click();
      const panel = page.getByRole('dialog', { name: /Pedir la baja de Valeria/ });
      // Confirmación reforzada (T054e): el panel nombra a la Persona y dice qué pasa después.
      await expect(panel).toContainText('Sigue siendo parte de la iglesia');
      await panel.getByLabel('Motivo (opcional)').fill('Dejó de venir hace un mes');
      expect((await auditar(page)).violations).toEqual([]);
      await panel.getByRole('button', { name: 'Sí, pedir la baja' }).click();
      await expect(page.getByText(/Listo: el Admin ya tiene el pedido de baja de Valeria/)).toBeVisible();
      await expect(page.getByText(/Pediste su baja el .*Falta que el Admin la confirme/)).toBeVisible();

      await sinSesion(page);

      await loguearseComoAdminE2E(page);
      await page.goto('/');
      const pendientes = page.getByRole('region', { name: 'Pendientes' });
      const enlaceBajas = pendientes.getByRole('link', { name: /baja(s)? pedida(s)? para confirmar/ });
      await expect(enlaceBajas).toHaveAttribute('href', '/grupos?pendiente=baja');
      expect((await auditar(page)).violations).toEqual([]);
      await enlaceBajas.click();

      const fila = page.getByRole('row', { name: new RegExp(`Valeria Sale ${sufijo}`) });
      await expect(fila).toContainText('Baja pedida');
      await fila.getByRole('link', { name: /Ver el discipulado de/ }).click();
      await expect(page.getByText('Motivo: Dejó de venir hace un mes')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Confirmar la baja de Valeria' }).click();
      await expect(page.getByRole('alertdialog', { name: new RegExp(`¿Dar de baja a Valeria Sale ${sufijo}`) })).toBeVisible();
      await page.getByRole('button', { name: 'Sí, dar de baja' }).click();
      await expect(page.getByText('Valeria quedó dada de baja de este discipulado.')).toBeVisible();

      expect(await estadoDeInscripcion(grupoId, inscripciones[1])).toBe('abandono');
      expect(await estadoDeInscripcion(grupoId, inscripciones[0])).toBe('activa');
      expect(await estadoDeGrupo(grupoId)).toEqual({ estado: 'en_curso', motivoCierre: null });
      // FR-042: la Persona dada de baja ve la baja en Mi camino y puede volver a pedir.
      expect(await estadoMiCamino(seVa.email)).toMatchObject({ estado: 'baja' });
      expect(await pedirVidaNuevaComo(seVa.email)).toEqual(expect.any(String));
      expect(await estadoMiCamino(seVa.email)).toMatchObject({ estado: 'buscando' });
    });
  });
}
