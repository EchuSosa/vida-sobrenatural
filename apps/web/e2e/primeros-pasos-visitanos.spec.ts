import { test, expect, auditar } from './helpers';

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

      // H-46 (D115): cuatro ítems fijos — Ministerios ya no es uno de ellos
      // (pasó adentro de Primeros pasos, como última etapa del proceso).
      const nav = page.getByRole('navigation', { name: 'Principal' });
      for (const label of ['Nosotros', 'Primeros pasos', 'Eventos', 'Visitanos']) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
      await expect(nav.getByRole('link', { name: 'Ministerios' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Dar' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible();

      let resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Primeros pasos' }).click();
      await expect(page).toHaveURL(/\/primeros-pasos/);
      await expect(
        page.getByRole('heading', { name: 'Bienvenido/a a Vida Sobrenatural' }),
      ).toBeVisible();

      resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await nav.getByRole('link', { name: 'Visitanos' }).click();
      await expect(page).toHaveURL(/\/visitanos/);
      await expect(page.getByRole('heading', { name: 'Visitanos' })).toBeVisible();

      resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('las URLs viejas /bienvenida y /sede ya no existen (sin redirección)', async ({ page, permitirErrorDeConsola }) => {
      // H-100: el 404 es lo que este test busca a propósito — Chromium lo
      // loguea solo como error de consola, sin que sea un defecto nuestro.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
      const respuestaBienvenida = await page.goto('/bienvenida');
      expect(respuestaBienvenida?.status()).toBe(404);

      const respuestaSede = await page.goto('/sede');
      expect(respuestaSede?.status()).toBe(404);
    });

    test('las secciones sin funcionalidad muestran un estado vacío, no un error', async ({
      page,
    }) => {
      // spec 011: `/eventos` ya es la cartelera de Eventos: con Eventos de otros specs no está vacía.
      for (const ruta of ['/ministerios']) {
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

      // H-55 (D81/WCAG 1.4.1): los cuatro pasos se ven iguales — antes el 4
      // era un <Link> distinguido solo por color. Los cuatro son <strong>.
      const lista = page.locator('ol');
      await expect(lista.locator('strong')).toHaveCount(4);
      await expect(lista.locator('strong').nth(3)).toHaveText('4. Ministerio');

      // H-46 (D115): Ministerios ya no está en el menú, pero sigue siendo la
      // última etapa del proceso acá, con su URL propia. H-55: el enlace
      // real va aparte, debajo de la lista, no en el paso 4.
      await expect(page.getByRole('link', { name: '4. Ministerio' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Conocé los ministerios' }).click();
      await expect(page).toHaveURL(/\/ministerios/);
      await expect(page.getByRole('heading', { name: 'Ministerios' })).toBeVisible();

      // H-81: la miga de pan muestra siempre "Primeros pasos › Ministerios",
      // sin depender de cómo se haya llegado (D115).
      const miga = page.getByRole('navigation', { name: 'Ruta' });
      await expect(miga.getByRole('link', { name: 'Primeros pasos' })).toBeVisible();
      await expect(miga.getByText('Ministerios')).toBeVisible();

      await page.goBack();

      let resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // D122/H-77: Nosotros pasa a una entrada corta más una grilla de
      // tarjetas — la cobertura detallada de cada subpágina (Liderazgo, En
      // qué creemos) vive en nosotros.spec.ts; acá solo se confirma que la
      // entrada sigue con el copy real y que sus dos pendientes reales
      // (D98: "En qué creemos" y las fotos del equipo) siguen marcados como
      // tales, no inventados, en sus subpáginas propias.
      await page.goto('/nosotros');
      await expect(page.getByRole('heading', { name: 'Somos Familia' })).toBeVisible();

      await page.getByRole('link', { name: 'Liderazgo' }).click();
      await expect(page).toHaveURL(/\/nosotros\/liderazgo$/);
      await expect(page.getByText('Natalia Spetale y Juan Pablo Sosa')).toBeVisible();
      // H-82: el texto "Foto pendiente" ya no se muestra — se verifica que
      // el hueco sigue presente por su role="img" y su nombre accesible,
      // no por texto visible.
      await expect(page.getByRole('img', { name: /Foto pendiente/ }).first()).toBeVisible();
      await expect(page.getByText('Foto pendiente', { exact: false })).toHaveCount(0);
      await page.goBack();

      await page.getByRole('link', { name: 'En qué creemos' }).click();
      await expect(page).toHaveURL(/\/nosotros\/en-que-creemos$/);
      await expect(page.getByText(/todavía no publicamos nuestra declaración de fe/i)).toBeVisible();

      resultados = await auditar(page);
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
      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await page.getByRole('button', { name: 'Copiar Alias' }).click();
      await expect(page.getByText('Alias copiado')).toBeVisible();
      const copiado = await page.evaluate(() => navigator.clipboard.readText());
      expect(copiado).toBe('IglesiaVS');
    });

    // H-21 (revisión manual, actualización 2026-09-20): el contraste del
    // Toaster (sonner) resultó ser un falso positivo — axe auditaba con el
    // toast todavía en `opacity: 0` (mitad de la animación de entrada), no
    // con los tokens --normal-text/--normal-bg ya aplicados (H-76: `auditar`
    // espera esa transición para todos los usos, no solo acá). Este test
    // deja una regresión propia para el contraste del toast en particular.
    test('el toast (sonner) cumple contraste con el aviso visible', async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/dar');
      await page.getByRole('button', { name: 'Copiar Alias' }).click();

      const toast = page.locator('[data-sonner-toast]').first();
      await expect(toast).toBeVisible();

      const resultados = await auditar(page);
      const violacionesContraste = resultados.violations.filter((v) => v.id === 'color-contrast');
      expect(violacionesContraste).toEqual([]);
    });
  });
}
