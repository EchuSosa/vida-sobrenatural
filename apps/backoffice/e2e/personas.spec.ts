import { test, expect, loguearseComoAdminE2E, loguearseComoPastorE2E, crearPersonaActiva, auditar } from './helpers';

/**
 * specs/005-roles-permisos-acceso, Historia 2 (T028/T029): ascender a una
 * Persona es un flujo crítico — el modal de roles abierto (y con un
 * rechazo a la vista) corre axe en modo claro y oscuro. El listado solo, sin
 * modal, ya lo audita axe-todas-las-rutas.spec.ts.
 *
 * El tema se fuerza por localStorage igual que el smoke de rutas: el default
 * de la app es claro (D106), no el del sistema, así que `colorScheme` solo no
 * alcanzaría para ver el modo oscuro.
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test('el Admin otorga y quita un rol de cargo, y un rechazo se lee con su mensaje propio', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // El 409 del rechazo de Discipulador es el caso que se prueba acá, no una falla.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 409/);
      const sufijo = `${tema}-${Date.now()}`;
      const apellido = `Roles${sufijo}`;
      await crearPersonaActiva(`e2e-roles-${sufijo}@example.com`, apellido);

      await loguearseComoAdminE2E(page);
      await page.goto(`/personas?q=${apellido}`);
      await page.waitForLoadState('networkidle');

      await page.getByRole('main').getByRole('button', { name: `Cambiar roles de E2E ${apellido}` }).click();
      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      expect((await auditar(page, ['region'])).violations).toEqual([]);

      await panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' }).click();
      await expect(panel.getByRole('button', { name: 'Quitar el rol de Líder de curso' })).toBeVisible();
      await expect(panel.getByText('Tiene este rol')).toHaveCount(1);

      // FR-009/H-127: quitar Discipulador se rechaza siempre por ahora — el
      // mensaje tiene que ser el propio, no un error genérico.
      await panel.getByRole('button', { name: 'Otorgar el rol de Discipulador/a' }).click();
      await panel.getByRole('button', { name: 'Quitar el rol de Discipulador/a' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar el rol' }).click();
      await expect(panel.getByRole('alert')).toContainText('Todavía no se puede quitar el rol de Discipulador');
      expect((await auditar(page, ['region'])).violations).toEqual([]);

      await panel.getByRole('button', { name: 'Quitar el rol de Líder de curso' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar el rol' }).click();
      await expect(panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' })).toBeVisible();

      await panel.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await expect(page.getByRole('main').getByRole('cell', { name: 'Discipulador/a' })).toBeVisible();
    });
  });
}

test('un Pastor ve el listado pero no la acción de cambiar roles (personas.gestionar_roles es solo Admin)', async ({ page }) => {
  await loguearseComoPastorE2E(page);
  await page.goto('/personas');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Personas' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Cambiar roles/ })).toHaveCount(0);
});
