import { test, expect, loguearseComoAdminE2E, auditar } from './helpers';

/**
 * H-58 (revisión manual): el menú de usuario del backoffice era la única de
 * las tres implementaciones (apps/web header público, apps/web barra de la
 * app, backoffice) que todavía dejaba "Cerrar sesión" afuera del
 * desplegable, como botón suelto — contradecía docs/14-navegacion.md
 * sección 1. Ahora usa el mismo `MenuUsuario` compartido de packages/ui:
 * "Cerrar sesión" es una fila más del propio menú, que se cierra antes de
 * abrir el diálogo de confirmación (H-11, sin overlays anidados). Sin
 * ítem "Perfil" — el backoffice no tiene pantalla propia
 * (docs/14-navegacion.md sección 3).
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('el menú de usuario ofrece colores de la app y cerrar sesión, sin ítem Perfil', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Admin de Test' }).click();

      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Perfil' })).toHaveCount(0);
      await expect(menu.getByRole('menuitem', { name: 'Claro' })).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: 'Oscuro' })).toBeVisible();
      const itemCerrarSesion = menu.getByRole('menuitem', { name: 'Cerrar sesión' });
      await expect(itemCerrarSesion).toBeVisible();

      const resultadosMenu = await auditar(page, ['region']);
      expect(resultadosMenu.violations).toEqual([]);

      await itemCerrarSesion.click();
      await expect(menu).toBeHidden();
      const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
      await expect(dialogo).toBeVisible();

      const resultadosDialogo = await auditar(page);
      expect(resultadosDialogo.violations).toEqual([]);

      await dialogo.getByRole('button', { name: 'Sí, cerrar sesión' }).click();
      await expect(page).toHaveURL('/');
    });
  });
}
