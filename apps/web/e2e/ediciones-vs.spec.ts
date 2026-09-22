import { test, expect, auditar } from './helpers';

/**
 * Historia 2 (specs/003-contenido-institucional): subpágina pública del
 * catálogo de Ediciones VS. Con el seed mínimo ya cargado (FR-031) siempre
 * hay 9 libros activos, cada uno con su foto provisoria (el seed las sube
 * por el camino real — apps/api/prisma/seed.ts) — el estado vacío (FR-008)
 * no tiene e2e propio por el mismo motivo que en palabra-profetica.spec.ts
 * (sin endpoint de escritura hasta la Historia 4).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('muestra la introducción, cómo conseguir los libros y el catálogo con sus portadas', async ({
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
        // H-83: unificado con el formato sin "www" del pie (footer-publico.tsx).
        'https://facebook.com/ediciones.vs.lp',
      );
      await expect(page.getByRole('link', { name: 'Instagram de Ediciones VS' })).toHaveAttribute(
        'href',
        'https://instagram.com/edicionesvs',
      );

      // FR-007: están los 9 libros reales del catálogo del seed mínimo, cada
      // uno por su título exacto (apps/api/prisma/seed.ts). "Al menos 9" no
      // alcanza: pasa igual si falta uno real y sobran dos de seed-demo
      // (D120, FR-032) — acá se afirma cada título puntual, que convive con
      // los libros hostiles del demo y sigue detectando si uno real
      // desaparece. `exact: true` porque el título del catálogo se renderiza
      // en un <p> propio (apps/web/src/app/(publica)/nosotros/ediciones-vs/page.tsx)
      // y uno de los libros hostiles de seed-demo comparte el prefijo
      // "Antídotos contra la religión" con el real — exact evita que un
      // match parcial confunda a los dos.
      // Acotado a la <ul> del catálogo (aria-label="Catálogo") — la miga de
      // pan (H-81/H-95) también es una lista (<ol>/<li>) y un
      // getByRole('listitem') sin acotar la contaría de más.
      const items = page.getByRole('list', { name: 'Catálogo' }).getByRole('listitem');
      const TITULOS_REALES = [
        'Mujer Maravilla: cuando la realidad supera a la ficción',
        'El sonido en la iglesia',
        'Una vida en su presencia',
        'El deseo de ser tres',
        'Antídotos contra la religión',
        'Discipulado Generacional',
        'Hijos de la Promesa: identidad y propósito de los hijos de Dios',
        'Diseñados para una vida saludable',
        'Vida nueva: una experiencia personal con Jesucristo',
      ];
      for (const titulo of TITULOS_REALES) {
        // .first(): mismo artefacto ya documentado arriba para el párrafo
        // de introducción — en la suite completa este <p> a veces resuelve
        // a dos nodos idénticos, sin que haya un Libro duplicado en la base
        // (verificado contra la API).
        await expect(page.getByText(titulo, { exact: true }).first()).toBeVisible();
      }
      await expect(
        items.filter({ hasText: 'Mujer Maravilla: cuando la realidad supera a la ficción' }),
      ).toContainText('por Natalia Spetale');

      // FR-027: los 9 reales ya tienen su foto provisoria (el seed las sube
      // por el camino real, H-94/D110 enmendada) — cada una con su propio
      // texto alternativo describiendo la FOTO (FR-025), no el patrón viejo
      // de PlaceholderImagen ("Portada de {título}"), que solo debería
      // verse en un libro sin portada (los hostiles de seed-demo, D120,
      // que este seed mínimo no carga). No se asume la cantidad total del
      // catálogo — solo que los 9 reales, puntualmente, tienen foto real.
      const fotosReales = page.getByRole('img', { name: /^Foto del libro/ });
      await expect(fotosReales).toHaveCount(TITULOS_REALES.length);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    // H-81/H-95: la miga de pan reemplaza "Volver a Nosotros".
    test('la miga de pan vuelve a Nosotros', async ({ page }) => {
      await page.goto('/nosotros/ediciones-vs');
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Nosotros' }).click();
      await expect(page).toHaveURL(/\/nosotros$/);
    });
  });
}
