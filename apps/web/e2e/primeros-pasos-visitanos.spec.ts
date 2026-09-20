import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Historia 1 (specs/002-base-transversal): navegación pública, traslado de
 * contenido de Bienvenida/Sede a Primeros pasos/Visitanos, y estados vacíos.
 * Corre en modo claro y oscuro con @axe-core/playwright (Historia 2, FR-013).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('el menú público muestra las secciones y Primeros pasos/Visitanos tienen el contenido trasladado', async ({
      page,
    }) => {
      await page.goto('/');

      const nav = page.getByRole('navigation', { name: 'Principal' });
      for (const label of ['Nosotros', 'Primeros pasos', 'Ministerios', 'Eventos', 'Visitanos']) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
      await expect(page.getByRole('link', { name: 'Dar' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible();

      let resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Primeros pasos' }).click();
      await expect(page).toHaveURL(/\/primeros-pasos/);
      await expect(
        page.getByRole('heading', { name: 'Bienvenido/a a Vida Sobrenatural' }),
      ).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Visitanos' }).click();
      await expect(page).toHaveURL(/\/visitanos/);
      await expect(page.getByRole('heading', { name: 'Visitanos' })).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });

    test('las URLs viejas /bienvenida y /sede ya no existen (sin redirección)', async ({ page }) => {
      const respuestaBienvenida = await page.goto('/bienvenida');
      expect(respuestaBienvenida?.status()).toBe(404);

      const respuestaSede = await page.goto('/sede');
      expect(respuestaSede?.status()).toBe(404);
    });

    test('las secciones sin funcionalidad muestran un estado vacío, no un error', async ({
      page,
    }) => {
      for (const ruta of ['/ministerios', '/eventos']) {
        const respuesta = await page.goto(ruta);
        expect(respuesta?.status()).toBe(200);
        await expect(page.getByText(/todavía no/i)).toBeVisible();
      }
    });

    // H-02 (revisión manual, actualización 2026-09-18): copy real en
    // Primeros pasos y Nosotros, con los pendientes marcados como tales.
    test('Primeros pasos y Nosotros usan el copy real, con los pendientes marcados', async ({
      page,
    }) => {
      await page.goto('/primeros-pasos');
      await expect(page.getByText('Siempre que lo llamamos, Dios nos responde.', { exact: false })).toBeVisible();

      let resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.goto('/nosotros');
      await expect(page.getByRole('heading', { name: 'Somos Familia' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Liderazgo' })).toBeVisible();
      await expect(page.getByText('Natalia Spetale y Juan Pablo Sosa')).toBeVisible();
      // "En qué creemos" y las fotos son pendientes reales (D98) — no
      // inventados: tienen que verse marcados como tales, no vacíos ni con
      // texto de relleno.
      await expect(page.getByRole('heading', { name: 'En qué creemos' })).toBeVisible();
      await expect(page.getByText(/todavía no publicamos nuestra declaración de fe/i)).toBeVisible();
      await expect(page.getByText('Foto pendiente', { exact: false }).first()).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });

    // H-08 (revisión manual, actualización 2026-09-18): /dar con los datos
    // reales de Ofrendas, alias y CBU copiables con aviso de confirmación.
    test('Dar muestra los datos reales de Ofrendas y permite copiar el alias', async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/dar');
      await expect(
        page.getByText('Dar de lo que Dios nos dio nos hace profundamente felices.'),
      ).toBeVisible();
      await expect(page.getByText('IglesiaVS')).toBeVisible();
      await expect(page.getByText('0720099120000002972718')).toBeVisible();
      await expect(page.getByText('ISAIAS 61 ASOCIACIÓN CIVIL')).toBeVisible();

      // Auditar antes del toast — el contraste del propio Toaster (sonner)
      // es un hallazgo aparte (H-21 en la revisión manual), no de esta
      // página; auditarlo acá lo mezclaría con lo que sí es responsabilidad
      // de /dar.
      const resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByRole('button', { name: 'Copiar Alias' }).click();
      await expect(page.getByText('Alias copiado')).toBeVisible();
      const copiado = await page.evaluate(() => navigator.clipboard.readText());
      expect(copiado).toBe('IglesiaVS');
    });

    // H-21 (revisión manual, actualización 2026-09-20): el contraste del
    // Toaster (sonner) resultó ser un falso positivo — axe auditaba con el
    // toast todavía en `opacity: 0` (mitad de la animación de entrada), no
    // con los tokens --normal-text/--normal-bg ya aplicados. Este test
    // audita CON el toast visible y ya asentado (opacity: 1), para que una
    // regresión real de contraste sí se detecte, en vez de esconderla detrás
    // de la misma condición de carrera que generó el falso positivo.
    test('el toast (sonner) cumple contraste con el aviso visible', async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/dar');
      await page.getByRole('button', { name: 'Copiar Alias' }).click();

      const toast = page.locator('[data-sonner-toast]').first();
      await expect(toast).toBeVisible();
      await expect(toast).toHaveCSS('opacity', '1');

      const resultados = await new AxeBuilder({ page }).analyze();
      const violacionesContraste = resultados.violations.filter((v) => v.id === 'color-contrast');
      expect(violacionesContraste).toEqual([]);
    });
  });
}
