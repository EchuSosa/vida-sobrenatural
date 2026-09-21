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

      // FR-007: están los 8 libros reales del catálogo del seed mínimo, cada
      // uno por su título exacto (apps/api/prisma/seed.ts). "Al menos 8" no
      // alcanza: pasa igual si falta uno real y sobran dos de seed-demo
      // (D120, FR-032) — acá se afirma cada título puntual, que convive con
      // los libros hostiles del demo y sigue detectando si uno real
      // desaparece. `exact: true` porque el título del catálogo se renderiza
      // en un <p> propio (apps/web/src/app/(publica)/nosotros/ediciones-vs/page.tsx)
      // y uno de los libros hostiles de seed-demo comparte el prefijo
      // "Antídotos contra la religión" con el real — exact evita que un
      // match parcial confunda a los dos.
      const items = page.getByRole('listitem');
      const cantidad = await items.count();
      const TITULOS_REALES = [
        'Mujer Maravilla: cuando la realidad supera a la ficción',
        'El sonido en la iglesia',
        'Una vida en su presencia',
        'El deseo de ser tres',
        'Antídotos contra la religión',
        'Discipulado Generacional',
        'Hijos de la Promesa: identidad y propósito de los hijos de Dios',
        'Diseñados para una vida saludable',
      ];
      for (const titulo of TITULOS_REALES) {
        await expect(page.getByText(titulo, { exact: true })).toBeVisible();
      }
      await expect(
        items.filter({ hasText: 'Mujer Maravilla: cuando la realidad supera a la ficción' }),
      ).toContainText('por Natalia Spetale');

      // FR-027: sin portada real todavía, cada libro muestra el espacio con
      // aspecto de tapa (PlaceholderImagen aspecto="portada"), no una
      // imagen inventada ni un espacio sin marcar — uno por cada libro
      // listado (mismo motivo que arriba: no se asume la cantidad exacta).
      const placeholders = page.getByRole('img', { name: /Portada de/ });
      await expect(placeholders).toHaveCount(cantidad);

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
