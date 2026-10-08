import { test, expect, auditar } from './helpers';

/**
 * H-116 (revisión manual): antes de esto, ocho `page.tsx` (catalogos,
 * eventos, grupos, personas, solicitudes, notificaciones,
 * mi-disponibilidad, mis-grupos — más mis-discipulados, sin chequeo
 * tampoco aunque no estaba en la lista del hallazgo) no chequeaban sesión
 * en absoluto, y otras nueve la chequeaban a mano, cada una con su propia
 * copia. Sin un solo test que entrara sin sesión, nada lo hubiera
 * agarrado — lo encontró Echu a mano, en incógnito. Este archivo es esa
 * red: recorre rutas de las dos categorías (antes protegidas y antes sin
 * chequeo) y confirma que el layout las protege a todas por igual, sin
 * sesión.
 */

// spec 006: /mi-disponibilidad salió del backoffice (D142; ahora redirige a la web app).
const RUTAS_SIN_CHEQUEO_PROPIO_ANTES = ['/catalogos', '/personas', '/solicitudes'];
const RUTAS_CON_CHEQUEO_PROPIO_ANTES = ['/libros', '/sedes', '/pendientes-tutor'];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    for (const ruta of [...RUTAS_SIN_CHEQUEO_PROPIO_ANTES, ...RUTAS_CON_CHEQUEO_PROPIO_ANTES]) {
      test(`${ruta} sin sesión muestra la pantalla de ingreso, no su contenido`, async ({ page }) => {
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Backoffice — Vida Sobrenatural' })).toBeVisible();
        await expect(page.getByText('Necesitás iniciar sesión para continuar.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible();

        // Ninguna pantalla real de la ruta se asoma — ni el <h1> propio
        // (algunas antes lo repetían, ej. "Sedes", "Libros") ni el
        // sidebar (BackofficeShell no se monta sin sesión).
        await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);

        const resultados = await auditar(page);
        expect(resultados.violations).toEqual([]);
      });
    }
  });
}

test('ingresar desde /libros sin sesión vuelve a /libros, no a la raíz (H-116)', async ({ page }) => {
  await page.goto('/libros');
  await page.waitForLoadState('networkidle');

  // No se completa el login real (necesitaría credenciales de Google) —
  // lo que importa acá es que el botón le pide a NextAuth volver a /libros,
  // no que el flujo de Google termine. Antes, signIn('google') no llevaba
  // callbackUrl y el destino quedaba en la raíz sin importar de dónde se
  // hubiera entrado.
  const pedidoDeIngreso = page.waitForRequest((req) => req.url().includes('/api/auth/signin/google'));
  await page.getByRole('button', { name: 'Entrar con Google' }).click();
  const request = await pedidoDeIngreso;
  expect(request.postData()).toContain('callbackUrl=%2Flibros');
});
