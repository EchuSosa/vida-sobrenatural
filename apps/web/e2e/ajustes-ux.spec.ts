import { test, expect, registrarPersonaDeTest } from './helpers';
import { objetivosDe44, tamanoDeLetra, contenido } from './helpers-ajustes-ux';

/**
 * ajustes-ux — los hallazgos de la revisión de UX de `apps/web` del
 * 2026-09-30 (specs/revision-manual/2026-09-30-ux-web.md) y D150/D151. Cada
 * test cita su hallazgo (#N). Los de celular llevan `@celular` y fijan el
 * ancho de un celular también en el proyecto de escritorio.
 */

const CELULAR = { width: 390, height: 844 };

test.describe('Inicio público', () => {
  test.use({ viewport: CELULAR });

  test('sin la tarjeta estática "Eventos" (la reemplaza Próximos eventos, FR-001 de la 011) y con descripciones en 16 px (#7, #8) @celular', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Próximos eventos de Vida Sobrenatural/ })).toHaveCount(0);
    const descripcion = page.getByText('Quiénes somos, en qué creemos y nuestro liderazgo.');
    await expect(descripcion).toBeVisible();
    expect(await tamanoDeLetra(descripcion)).toBeGreaterThanOrEqual(16);
    await objetivosDe44(contenido(page).getByRole('list').first());
  });
});

test.describe('Header, paneles y pie (transversal)', () => {
  test.use({ viewport: CELULAR });

  test('las acciones del header y el hamburguesa miden 44 px y van en 16 px (#1, D150) @celular', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header').first();
    await objetivosDe44(header);
    expect(await tamanoDeLetra(header.getByRole('link', { name: 'Ingresar' }))).toBeGreaterThanOrEqual(16);
  });

  test('el panel lateral: filas de 44 px o más, y Dar e Ingresar repetidos al final (#2, #4) @celular', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const panel = page.getByRole('navigation', { name: 'Principal (celular)' });
    await expect(panel).toBeVisible();
    await objetivosDe44(panel);
    await expect(panel.getByRole('link', { name: 'Dar' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Ingresar' })).toBeVisible();
    await panel.getByRole('link', { name: 'Dar' }).click();
    await expect(page).toHaveURL(/\/dar$/);
  });

  test('el pie: redes con su nombre visible y área de 44×44 (#3) @celular', async ({ page }) => {
    await page.goto('/');
    const pie = page.locator('footer');
    await expect(pie.getByRole('link', { name: 'Facebook' })).toHaveText('Facebook');
    await expect(pie.getByRole('link', { name: 'Instagram' })).toHaveText('Instagram');
    await objetivosDe44(pie);
  });
});

test.describe('Barra de la app', () => {
  test.use({ viewport: CELULAR });

  test('pestañas con etiquetas de 14 px y "Más" de 44 px con su panel de filas grandes (#5, #6, #2) @celular', async ({ page }) => {
    await registrarPersonaDeTest(page, `e2e-ux-barra-${Date.now()}@example.com`);
    await page.goto('/inicio');
    const barra = page.getByRole('navigation', { name: 'Principal' });
    expect(await tamanoDeLetra(barra.getByRole('link', { name: 'Mi camino' }).locator('span'))).toBeGreaterThanOrEqual(14);
    const mas = page.getByRole('button', { name: 'Más' });
    await objetivosDe44(page.locator('header').first());
    await mas.click();
    const panel = page.getByRole('navigation', { name: 'Secundario' });
    await expect(panel).toBeVisible();
    await objetivosDe44(panel);
  });
});
