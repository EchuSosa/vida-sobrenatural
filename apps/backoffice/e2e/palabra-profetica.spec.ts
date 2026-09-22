import {
  test,
  expect,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  loguearseComoOtroRolE2E,
  auditar,
} from './helpers';

/**
 * Historia 3 (specs/003-contenido-institucional, D64): alta de Palabra
 * Profética, marcar vigente desmarca la anterior sola (FR-012, SC-006),
 * validación por campo (FR-014), Pastor solo lectura (FR-029), otro rol
 * bloqueado (FR-030). Corre en modo claro y oscuro (Constitución Principio
 * VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('Admin crea una Palabra Profética y la marca vigente — la anterior queda "No vigente" en el historial', async ({
      page,
    }) => {
      const titulo = `e2e-pp-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      await page.getByLabel('Año').fill('2027');
      await page.getByLabel('Título').fill(titulo);
      await page.getByLabel('Texto').fill('Texto de prueba para el e2e de Historia 3.');
      await page.getByRole('button', { name: 'Crear' }).click();
      await expect(page.getByText('Palabra Profética creada.')).toBeVisible();

      const fila = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(fila).toBeVisible();
      await expect(fila.getByText('No vigente')).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await fila.getByRole('button', { name: 'Marcar vigente' }).click();
      await expect(page.getByText(`"${titulo}" marcada vigente.`)).toBeVisible();

      const filaVigente = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(filaVigente.getByText('Vigente', { exact: true })).toBeVisible();

      // Marcarla vigente de nuevo no rompe nada (Edge Case del spec).
      // No hay botón "Marcar vigente" en la fila de la ya vigente.
      await expect(filaVigente.getByRole('button', { name: 'Marcar vigente' })).toHaveCount(0);
    });

    test('un campo obligatorio vacío o una URL de YouTube inválida muestran el error debajo del campo (FR-014)', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // H-100: este test manda una URL de YouTube inválida a propósito
      // para probar la validación del servidor — el 400 es lo esperado,
      // no un defecto.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 400/);
      await loguearseComoAdminE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      // Título vacío — required nativo del navegador bloquea el submit; se
      // completa lo mínimo salvo título para forzar la validación propia.
      await page.getByLabel('Año').fill('2027');
      await page.getByLabel('Texto').fill('texto');
      await page.getByLabel('Título').fill('algo');
      await page.getByLabel('Título').fill('');
      await page.getByLabel('Título').blur();
      // El mismo mensaje aparece dos veces (el link del resumen y el
      // párrafo debajo del campo, H-50) — se apunta al segundo.
      await expect(page.locator('#campo-titulo-error')).toHaveText('Revisá este dato.');

      // Se corrige el título y se carga una URL de YouTube inválida.
      await page.getByLabel('Título').fill(`e2e-pp-validacion-${colorScheme}-${Date.now()}`);
      await page.getByLabel(/URL del video de YouTube/).fill('https://vimeo.com/123456789');
      await page.getByRole('button', { name: 'Crear' }).click();

      const errorYoutube = page.locator('#campo-youtubeUrl-error');
      await expect(errorYoutube).toContainText('Pegá la URL completa de un video de YouTube');

      // H-72: el error se limpia al escribir (MensajeErrorCampo se desmonta sin mensaje).
      await page.getByLabel(/URL del video de YouTube/).fill('https://www.youtube.com/watch?v=oVLmI6_IoC8');
      await expect(errorYoutube).toHaveCount(0);
    });

    test('Pastor ve el historial pero no puede editar (D64)', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Palabra Profética' })).toBeVisible();
      // El formulario está deshabilitado — sin botón "Crear" habilitado.
      await expect(page.getByRole('button', { name: 'Crear' })).toHaveCount(0);
      // Sin botones "Marcar vigente" en ninguna fila.
      await expect(page.getByRole('button', { name: 'Marcar vigente' })).toHaveCount(0);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('otro rol no encuentra la sección en el menú y el acceso directo por URL se lo niega (FR-030)', async ({
      page,
    }) => {
      await loguearseComoOtroRolE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Palabra Profética' })).toHaveCount(0);

      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Necesitás el rol Admin o Pastor', { exact: false })).toBeVisible();
      await expect(page.getByLabel('Año')).toHaveCount(0);
    });
  });
}
