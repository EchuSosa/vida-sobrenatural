import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoDiscipuladorE2E } from './helpers';
import { crearEncuentro, crearGrupo, crearPersona, estadoDeGrupo, sinSesion } from './helpers';

/**
 * specs/004, T053 (FR-019 a FR-021, FR-030; Historia 3, escenario 11):
 * proponer la finalización, rechazarla con motivo, volver a proponer y
 * confirmar; y reasignar desde /grupos/[id] — propone, el anterior sigue
 * hasta que el nuevo acepta, el nuevo ve los Encuentros anteriores, y el
 * anterior ya no lo ve. Claro y oscuro con axe.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Finalización y reasignación — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('proponer → el Admin rechaza con motivo → el Discipulador lo ve → propone otra vez → el Admin confirma', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const persona = await crearPersona(`e2e-b-fin-${sufijo}@example.com`, { nombre: 'Paula', apellido: `Fin ${sufijo}` });
      const { grupoId } = await crearGrupo([persona]);

      await sinSesion(page);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await page.getByRole('button', { name: 'Pedir darlo por terminado' }).click();
      await page.getByRole('button', { name: 'Sí, pedirlo' }).click();
      await expect(page.getByText(/Pediste darlo por terminado el .*Falta que el Admin lo confirme/)).toBeVisible();

      await sinSesion(page);

      await loguearseComoAdminE2E(page);
      await page.goto('/grupos?pendiente=finalizacion');
      const fila = page.getByRole('row', { name: new RegExp(`Paula Fin ${sufijo}`) });
      await expect(fila).toContainText('Pidió terminarlo');
      await fila.getByRole('link', { name: /Ver el discipulado de/ }).click();
      await expect(page.getByText(/pidió darlo por terminado el/)).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Rechazar el pedido' }).click();
      const panel = page.getByRole('dialog', { name: 'Rechazar el pedido de terminar' });
      await panel.getByLabel('Motivo (opcional)').fill('Faltan los dos últimos capítulos');
      await panel.getByRole('button', { name: 'Sí, rechazar' }).click();
      await expect(page.getByText('Rechazaste el pedido. El Discipulador va a ver tu motivo.')).toBeVisible();

      await sinSesion(page);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await expect(page.locator('#contenido').getByText('Motivo: Faltan los dos últimos capítulos', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: 'Pedir darlo por terminado' }).click();
      await page.getByRole('button', { name: 'Sí, pedirlo' }).click();
      await expect(page.getByText(/Falta que el Admin lo confirme/)).toBeVisible();

      await sinSesion(page);

      await loguearseComoAdminE2E(page);
      await page.goto(`/grupos/${grupoId}`);
      await page.getByRole('button', { name: 'Confirmar que terminó' }).click();
      await expect(page.getByRole('alertdialog', { name: '¿Dar por terminado este discipulado?' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Sí, dar por terminado' }).click();
      await expect(page.getByText('El discipulado quedó terminado.')).toBeVisible();
      await expect(page.locator('#contenido').getByText('Terminado: completó')).toBeVisible();
      expect(await estadoDeGrupo(grupoId)).toEqual({ estado: 'finalizado', motivoCierre: 'completado' });
    });

    test('reasignar: el Admin propone al Discipulador 2; hasta que acepta, el 1 sigue; después ya no lo ve', async ({ page, browser, permitirErrorDeConsola }) => {
      permitirErrorDeConsola(/404/);
      const sufijo = `${colorScheme}-${Date.now()}`;
      // Masculino, para que el Discipulador 2 (masculino, martes) coincida en las dos reglas.
      const persona = await crearPersona(`e2e-b-reasig-${sufijo}@example.com`, { nombre: 'Julián', apellido: `Reasigna ${sufijo}`, genero: 'masculino' });
      const { grupoId } = await crearGrupo([persona]);
      // Un Encuentro del Discipulador 1, para ver que el 2 lo hereda (FR-030).
      const capitulosAnteriores = `Capítulos del anterior ${sufijo}`;
      await crearEncuentro(grupoId, { fecha: '2026-09-01', capitulos: capitulosAnteriores });

      await sinSesion(page);

      await loguearseComoAdminE2E(page);
      await page.goto(`/grupos/${grupoId}`);
      await page.getByRole('button', { name: 'Cambiar de Discipulador' }).click();
      const panel = page.getByRole('dialog', { name: 'Cambiar de Discipulador' });
      // El Discipulador 2 ("E2E Discipulador") coincide y va sugerido; la 1 (la vigente) no aparece.
      const candidato = panel.getByRole('listitem').filter({ hasText: /^E2E Discipulador\b/ });
      await expect(candidato).toContainText('Sugerido');
      await expect(panel.getByRole('listitem').filter({ hasText: 'E2E Discipuladora' })).toHaveCount(0);
      expect((await auditar(page)).violations).toEqual([]);
      await candidato.getByRole('button', { name: 'Elegir' }).click();
      await page.getByRole('button', { name: 'Sí, proponer' }).click();
      await expect(page.getByText(/Propuesta enviada a/)).toBeVisible();
      await expect(page.getByText(/Le propusiste este discipulado a .*Hasta que acepte/)).toBeVisible();

      // El 1 lo sigue viendo hasta que el 2 acepte.
      await sinSesion(page);
      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Julián Reasigna ${sufijo}`) })).toBeVisible();

      // El Discipulador 2 en un contexto propio: en la suite completa, cambiar
      // de Persona en la misma página llegó a mostrar la sesión anterior.
      const contexto2 = await browser.newContext({ colorScheme });
      const pagina2 = await contexto2.newPage();
      try {
        await loguearseComoDiscipuladorE2E(pagina2, 2);
        await pagina2.goto('/mis-discipulados');
        const propuesta = pagina2.locator('article[aria-labelledby^="propuesta-"]').filter({ hasText: `Julián Reasigna ${sufijo}` });
        await expect(propuesta).toContainText('Tomar el discipulado de');
        await propuesta.getByRole('button', { name: 'Aceptar a Julián' }).click();
        await pagina2.getByRole('button', { name: 'Sí, acepto' }).click();
        await expect(pagina2.getByText(/Aceptaste/)).toBeVisible();
        // El 2 ve los Encuentros que registró el 1.
        await pagina2.goto(`/mis-discipulados/${grupoId}`);
        // #contenido: la copia oculta del streaming queda afuera (2cc64e9).
        await expect(pagina2.locator('#contenido').getByText(capitulosAnteriores)).toBeVisible();
      } finally {
        await contexto2.close();
      }

      await sinSesion(page);

      await loguearseComoDiscipuladorE2E(page, 1);
      await page.goto(`/mis-discipulados/${grupoId}`);
      await expect(page.getByRole('heading', { name: 'No encontramos este discipulado' })).toBeVisible();
    });
  });
}
