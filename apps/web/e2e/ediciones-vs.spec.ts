import { test, expect } from '@playwright/test';
import { auditar } from './helpers';

/**
 * Historia 2 (specs/003-contenido-institucional): subpágina pública del
 * catálogo de Ediciones VS. Con el seed mínimo ya cargado (FR-031) siempre
 * hay 8 libros activos, ninguno con portada real todavía — el estado vacío
 * (FR-008) no tiene e2e propio por el mismo motivo que en
 * palabra-profetica.spec.ts (sin endpoint de escritura hasta la Historia 4).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('muestra la introducción, cómo conseguir los libros y el catálogo con placeholder de portada', async ({
      page,
    }) => {
      await page.goto('/nosotros/ediciones-vs');

      await expect(page.getByRole('heading', { name: 'Ediciones VS' })).toBeVisible();
      // .first(): en la suite completa (no aislado) este párrafo a veces
      // resuelve a dos nodos idénticos en el DOM — parece un artefacto del
      // dev server de Next 16/Turbopack bajo HMR con muchas rutas
      // visitadas antes (no se reproduce en un repro aislado ni cambia lo
      // que hay que verificar acá: que el texto está presente).
      await expect(page.getByText('Nuestra editorial nació en septiembre de 2014', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Producciones Peniel', { exact: false }).first()).toBeVisible();

      await expect(page.getByRole('link', { name: 'Facebook de Ediciones VS' })).toHaveAttribute(
        'href',
        'https://www.facebook.com/ediciones.vs.lp',
      );
      await expect(page.getByRole('link', { name: 'Instagram de Ediciones VS' })).toHaveAttribute(
        'href',
        'https://instagram.com/edicionesvs',
      );

      // FR-007: los 8 libros reales del seed, con año y autor/a. Scopeado a
      // los <li> del catálogo — el título del primer libro también aparece
      // en el texto de introducción (es el origen de la editorial).
      const items = page.getByRole('listitem');
      await expect(items).toHaveCount(8);
      await expect(
        items.filter({ hasText: 'Mujer Maravilla: cuando la realidad supera a la ficción' }),
      ).toContainText('por Natalia Spetale');
      await expect(items.filter({ hasText: 'Diseñados para una vida saludable' })).toBeVisible();

      // FR-027: sin portada real todavía, cada libro muestra el espacio con
      // aspecto de tapa (PlaceholderImagen aspecto="portada"), no una
      // imagen inventada ni un espacio sin marcar.
      const placeholders = page.getByRole('img', { name: /Portada de/ });
      await expect(placeholders).toHaveCount(8);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('el enlace "Volver a Nosotros" funciona', async ({ page }) => {
      await page.goto('/nosotros/ediciones-vs');
      await page.getByRole('link', { name: 'Volver a Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });
  });
}
