import { test, expect } from '@playwright/test';
import { registrarPersonaDeTest, crearAxeBuilder } from './helpers';

/**
 * H-37/H-38 (revisión manual ronda 3, docs/14-navegacion.md secciones 1 y 2):
 * la app con sesión ofrece un camino de ida y vuelta a lo público (panel
 * "Más"), y el header público ofrece Perfil/tema/cerrar sesión con sesión
 * activa. Corre en modo claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test.describe('celular', () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test('el panel "Más" de la app lleva a una sección pública, que ofrece volver', async ({ page }) => {
        const email = `e2e-nav-mas-celular-${colorScheme}-${Date.now()}@example.com`;
        await registrarPersonaDeTest(page, email);

        await page.goto('/inicio');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Más' }).click();
        const panel = page.getByRole('dialog');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('opacity', '1');

        const resultadosPanel = await crearAxeBuilder(page).analyze();
        expect(resultadosPanel.violations).toEqual([]);

        await panel.getByRole('link', { name: 'Visitanos' }).click();
        await expect(page).toHaveURL(/\/visitanos/);

        // "Ir a la app" (H-19) es el camino de vuelta — sigue con sesión.
        await expect(page.getByRole('link', { name: 'Ir a la app' })).toBeVisible();
      });

      test('el panel hamburguesa público incluye Perfil, tema y cerrar sesión con sesión activa', async ({ page }) => {
        const email = `e2e-menu-usuario-celular-${colorScheme}-${Date.now()}@example.com`;
        await registrarPersonaDeTest(page, email);

        await page.goto('/nosotros');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Abrir menú' }).click();
        const panel = page.getByRole('dialog');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('opacity', '1');

        await expect(panel.getByRole('link', { name: 'Perfil' })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Claro' })).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

        const resultados = await crearAxeBuilder(page).analyze();
        expect(resultados.violations).toEqual([]);
      });
    });

    test.describe('escritorio', () => {
      test('el menú "Más" de la app agrupa las secciones públicas', async ({ page }) => {
        const email = `e2e-nav-mas-escritorio-${colorScheme}-${Date.now()}@example.com`;
        await registrarPersonaDeTest(page, email);

        await page.goto('/inicio');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Más' }).click();
        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();

        // "region" es una regla de best-practice de axe (no lleva tag wcag2*),
        // no un criterio de WCAG 2.2 AA: exige que TODO contenido visible esté
        // dentro de un landmark, pero eso es incompatible con el patrón ARIA
        // menu/menuitem (el menuitem exige un padre con role="menu"/"menubar"/
        // "group" — ninguno de esos es un landmark reconocido). Portalizado
        // fuera de cualquier landmark es el comportamiento esperado de un menú
        // flotante (Base UI, igual que shadcn/Radix).
        const resultadosMenu = await crearAxeBuilder(page).disableRules(['region']).analyze();
        expect(resultadosMenu.violations).toEqual([]);

        await menu.getByRole('menuitem', { name: 'Visitanos' }).click();
        await expect(page).toHaveURL(/\/visitanos/);
        await expect(page.getByRole('link', { name: 'Ir a la app' })).toBeVisible();
      });

      // H-58 (revisión manual): "Cerrar sesión" es una fila más DENTRO del
      // propio menú (antes vivía afuera, como botón suelto — contradecía
      // docs/14-navegacion.md sección 1). Mismo `MenuUsuario` compartido que
      // usa la barra de la app (H-47, test de abajo): el menú se cierra
      // ANTES de abrir el diálogo de confirmación (H-11, sin overlays
      // anidados de Base UI).
      test('el menú de usuario del header público ofrece Perfil, tema y cerrar sesión', async ({ page }) => {
        const email = `e2e-menu-usuario-escritorio-${colorScheme}-${Date.now()}@example.com`;
        await registrarPersonaDeTest(page, email);

        await page.goto('/nosotros');
        await page.waitForLoadState('networkidle');

        // El trigger muestra session.user.name — 'Visitante de Test' para el proveedor test-login.
        await page.getByRole('button', { name: 'Visitante de Test' }).click();

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Perfil' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Claro' })).toBeVisible();
        const itemCerrarSesion = menu.getByRole('menuitem', { name: 'Cerrar sesión' });
        await expect(itemCerrarSesion).toBeVisible();

        // "region" excluida — ver el comentario del test anterior.
        const resultados = await crearAxeBuilder(page).disableRules(['region']).analyze();
        expect(resultados.violations).toEqual([]);

        await itemCerrarSesion.click();
        await expect(menu).toBeHidden();
        const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
        await expect(dialogo).toBeVisible();
        await expect(dialogo).toHaveCSS('opacity', '1');
        await dialogo.getByRole('button', { name: 'Sí, cerrar sesión' }).click();
        await expect(page).toHaveURL('/');
        await expect(page.getByText('Cerraste sesión.')).toBeVisible();
      });

      // H-47 (revisión manual ronda 4): la barra de la app usa el mismo
      // `MenuUsuario` compartido — ver el test de arriba.
      test('en escritorio, el ítem Perfil de la barra de la app abre un menú con Perfil, colores de la app y cerrar sesión', async ({
        page,
      }) => {
        const email = `e2e-perfil-app-escritorio-${colorScheme}-${Date.now()}@example.com`;
        await registrarPersonaDeTest(page, email);

        await page.goto('/inicio');
        await page.waitForLoadState('networkidle');

        const barra = page.getByRole('navigation', { name: 'Principal' });
        await barra.getByRole('button', { name: 'Perfil' }).click();

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Perfil' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Claro' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Oscuro' })).toBeVisible();
        const itemCerrarSesion = menu.getByRole('menuitem', { name: 'Cerrar sesión' });
        await expect(itemCerrarSesion).toBeVisible();

        const resultadosMenu = await crearAxeBuilder(page).disableRules(['region']).analyze();
        expect(resultadosMenu.violations).toEqual([]);

        await itemCerrarSesion.click();
        // El menú se cierra ANTES de que aparezca el diálogo — si quedara
        // anidado, el diálogo nunca terminaría de abrirse (H-11).
        await expect(menu).toBeHidden();
        const dialogo = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
        await expect(dialogo).toBeVisible();
        await expect(dialogo).toHaveCSS('opacity', '1');

        const resultadosDialogo = await crearAxeBuilder(page).analyze();
        expect(resultadosDialogo.violations).toEqual([]);

        await dialogo.getByRole('button', { name: 'Sí, cerrar sesión' }).click();
        await expect(page).toHaveURL('/');
        await expect(page.getByText('Cerraste sesión.')).toBeVisible();
      });
    });
  });
}
