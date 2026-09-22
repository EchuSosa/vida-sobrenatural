import { test, expect } from '@playwright/test';
import { auditar } from './helpers';

/**
 * Historia 1 (specs/003-contenido-institucional, H-31/H-32, D109) más D122
 * (H-77): Nosotros pasa de una sola página larga a una entrada corta más
 * una grilla de seis tarjetas — cuatro subpáginas nuevas (Quiénes somos,
 * Visión/misión/valores, Liderazgo, En qué creemos) y dos que ya existían
 * sin cambio de URL (Palabra Profética, Ediciones VS, con sus propios
 * specs). El scroll horizontal a 320/375px ya lo cubre
 * `axe-todas-las-rutas.spec.ts` (H-62) para toda ruta pública — no se
 * repite acá.
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('la entrada de Nosotros muestra "Somos Familia" y la grilla de seis tarjetas hacia sus subpáginas', async ({
      page,
    }) => {
      await page.goto('/nosotros');

      await expect(page.getByRole('heading', { name: 'Nosotros', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Somos Familia' })).toBeVisible();

      const nav = page.getByRole('navigation', { name: 'Principal' });

      const tarjetas: [string, RegExp][] = [
        ['Quiénes somos', /\/nosotros\/quienes-somos$/],
        ['Visión, misión y valores', /\/nosotros\/vision-mision-valores$/],
        ['Liderazgo', /\/nosotros\/liderazgo$/],
        ['En qué creemos', /\/nosotros\/en-que-creemos$/],
        ['Palabra Profética', /\/nosotros\/palabra-profetica$/],
        ['Ediciones VS', /\/nosotros\/ediciones-vs$/],
      ];

      for (const [nombre] of tarjetas) {
        // No agrega ítems al menú principal (D115) — la tarjeta es distinta
        // del enlace de navegación, aunque compartan texto.
        await expect(nav.getByRole('link', { name: nombre })).toHaveCount(0);
        await expect(page.getByRole('link', { name: nombre })).toBeVisible();
      }

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      for (const [nombre, urlEsperada] of tarjetas) {
        await page.getByRole('link', { name: nombre }).click();
        await expect(page).toHaveURL(urlEsperada);
        await page.goBack();
      }
    });

    test('Quiénes somos muestra identidad, historia y congregación local', async ({ page }) => {
      await page.goto('/nosotros/quienes-somos');

      await expect(page.getByRole('heading', { name: 'Quiénes somos', exact: true })).toBeVisible();
      await expect(page.getByText('Cristianos:', { exact: false })).toBeVisible();
      await expect(page.getByText('Evangélicos:', { exact: false })).toBeVisible();
      await expect(page.getByText('Bautistas:', { exact: false })).toBeVisible();
      await expect(page.getByText('31 de octubre de 2010', { exact: false })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Nuestro desarrollo en una congregación local' })).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });

    test('Visión, misión y valores muestra los cuatro valores, el sistema de trabajo y el llamado, sin duplicar Primeros pasos', async ({
      page,
    }) => {
      await page.goto('/nosotros/vision-mision-valores');

      await expect(page.getByRole('heading', { name: 'Visión', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Misión', exact: true })).toBeVisible();

      for (const valor of ['Calidad', 'Unidad', 'Generosidad', 'Fe']) {
        await expect(page.getByText(valor, { exact: true })).toBeVisible();
      }

      await expect(page.getByRole('heading', { name: 'Bienvenida → Discipulado → Red' })).toBeVisible();
      const enlacePrimerosPasos = page.getByRole('link', { name: /Ver cómo sigue el proceso en Primeros pasos/i });
      await expect(enlacePrimerosPasos).toBeVisible();

      await expect(page.getByText('Isaías 61:1-4', { exact: false })).toBeVisible();
      await expect(page.getByText('Lucas 4:16-21', { exact: false })).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });

    test('Liderazgo muestra las tres parejas pastorales', async ({ page }) => {
      await page.goto('/nosotros/liderazgo');

      await expect(page.getByRole('heading', { name: 'Liderazgo', exact: true })).toBeVisible();
      await expect(page.getByText('Natalia Spetale y Juan Pablo Sosa')).toBeVisible();
      await expect(page.getByText('Lorena Scerra y Ezequiel Rossini')).toBeVisible();
      await expect(page.getByText('Patricia Ryan y Ezequiel Parravicini')).toBeVisible();

      // H-82: el placeholder de foto está por su role="img" y nombre
      // accesible — el texto "Foto pendiente" ya no se muestra a quien
      // visita la web.
      await expect(page.getByRole('img', { name: /Foto pendiente/ })).toHaveCount(3);
      await expect(page.getByText('Foto pendiente', { exact: false })).toHaveCount(0);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });

    test('En qué creemos sigue marcada como contenido pendiente, no inventado', async ({ page }) => {
      await page.goto('/nosotros/en-que-creemos');

      await expect(page.getByRole('heading', { name: 'En qué creemos', exact: true })).toBeVisible();
      await expect(page.getByText(/todavía no publicamos nuestra declaración de fe/i)).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });
  });
}
