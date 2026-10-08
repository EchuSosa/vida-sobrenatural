import { test, expect, apiComo, auditar, crearGrupo, crearPersona, EMAIL_DISCIPULADOR_1, fijarMaximoPorGrupo, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { mensajesPara } from '../../../scripts/e2e-mailpit';

/**
 * spec 012, T046 — mandar un aviso manual desde el backoffice, con axe en
 * claro y oscuro: conteo en vivo, advertencia de importante, errores por
 * campo con resumen y foco, confirmación neutra, "Enviando…" sin doble envío,
 * la fila en la tabla, el detalle, el mail en Mailpit y el aviso en la app de
 * la persona; la Pastora solo lee (FR-026–FR-034; US4-1 a US4-7; SC-004, SC-008).
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('el Admin manda un aviso importante a un grupo de punta a punta', async ({ page }) => {
      test.setTimeout(120_000);
      const sufijo = `${colorScheme}-${Date.now()}`;
      await fijarMaximoPorGrupo(EMAIL_DISCIPULADOR_1, 5);
      const personas = await Promise.all(
        ['Ana', 'Beto', 'Carla'].map((n, i) => crearPersona(`e2e-notif-${i}-${sufijo}@example.com`, { nombre: n, apellido: `Notif${sufijo}` })),
      );
      const { grupoId } = await crearGrupo(personas);
      const titulo = `e2e-aviso ${sufijo}`;
      const inicio = Date.now();

      await loguearseComoAdminE2E(page);
      await page.goto('/notificaciones');
      await page.waitForLoadState('networkidle');
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByRole('button', { name: 'Enviar un aviso' }).first().click();
      // Sin filtrar por nombre: el título del diálogo cambia en el paso de confirmar.
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toHaveAccessibleName('Enviar un aviso');
      await expect(dialogo).toHaveAttribute('data-tono', 'neutro');

      // US4-3: vacío → errores por campo y resumen con el foco.
      await dialogo.getByRole('button', { name: 'Revisar y mandar' }).click();
      const resumen = dialogo.getByText('Revisá estos campos:');
      await expect(resumen).toBeVisible();
      await expect(dialogo.locator('#campo-titulo-error')).toHaveText('Escribí un título.');
      await expect(dialogo.locator('#campo-mensaje-error')).toHaveText('Escribí el mensaje.');
      await expect(page.locator(':focus')).toContainText('Revisá estos campos:');

      await dialogo.getByLabel('Título').fill(titulo);
      await dialogo.getByLabel('Mensaje').fill('El encuentro de esta semana pasa al jueves.\n\nTraigan la Biblia.');
      await dialogo.getByRole('radio', { name: 'A un grupo' }).check();
      await dialogo.getByLabel('Grupo', { exact: true }).selectOption(grupoId);
      // US4-1: el conteo en vivo.
      await expect(dialogo.getByText('Le va a llegar a 3 personas')).toBeVisible();
      // US4-2: importante → advertencia y cuántos por mail.
      await dialogo.getByLabel('Importante — también se manda por mail').check();
      await expect(dialogo.getByText('si todo es importante, nada lo es', { exact: false })).toBeVisible();
      await expect(dialogo.getByText('3 lo reciben también por mail')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await dialogo.getByRole('button', { name: 'Revisar y mandar' }).click();
      await expect(dialogo.getByRole('heading', { name: '¿Mandar este aviso a 3 personas?' })).toBeVisible();
      await expect(dialogo.getByText('3 lo reciben también por mail.', { exact: false })).toBeVisible();

      // H-57: doble clic no manda dos.
      await dialogo.getByRole('button', { name: 'Mandar aviso' }).dblclick();
      await expect(page.getByText('Listo, mandamos el aviso.')).toBeVisible();
      await expect(page.getByRole('row').nth(1)).toContainText(titulo);
      const lista = await apiComo<{ items: { id: string; titulo: string }[] }>('e2e-admin@example.com', 'GET', '/notificaciones');
      expect(lista.items.filter((n) => n.titulo === titulo)).toHaveLength(1);
      const id = lista.items.find((n) => n.titulo === titulo)!.id;

      // US4-6: el detalle.
      await page.getByRole('link', { name: titulo }).click();
      await expect(page).toHaveURL(new RegExp(`/notificaciones/${id}$`));
      await expect(page.getByText('0 de 3 lo leyeron')).toBeVisible();
      await expect(page.getByText('Traigan la Biblia.')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      // El mail llegó (Mailpit) y el aviso está en la app de la persona; todo en menos de un minuto (SC-004).
      // (También le llegó el mail de su propuesta aceptada al armar el grupo: se busca este por el asunto.)
      await expect.poll(async () => (await mensajesPara(personas[0].email)).map((m) => m.Subject), { timeout: 30_000 }).toContain(titulo);
      const avisos = await apiComo<{ items: { titulo: string | null }[] }>(personas[0].email, 'GET', '/avisos');
      expect(avisos.items.map((a) => a.titulo)).toContain(titulo);
      expect(Date.now() - inicio).toBeLessThan(60_000 + 30_000); // + el armado del escenario por la API
    });
  });
}

test('la Pastora ve los avisos y no puede mandar (US4-7, FR-032)', async ({ page }) => {
  await loguearseComoPastorE2E(page);
  await page.goto('/notificaciones');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar un aviso' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mails que no salieron' })).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);
});
