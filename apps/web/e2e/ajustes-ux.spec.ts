import { test, expect } from './helpers';
import { objetivosDe44, tamanoDeLetra, contenido } from './helpers-ajustes-ux';

/**
 * ajustes-ux — los hallazgos de la revisión de UX de `apps/web` del
 * 2026-09-30 (specs/revision-manual/2026-09-30-ux-web.md) y D150/D151. Cada
 * test cita su hallazgo (#N). Los de celular llevan `@celular`.
 */

test.describe('Inicio público', () => {
  test('sin la tarjeta estática "Eventos" (la reemplaza Próximos eventos, FR-001 de la 011) y con descripciones en 16 px (#7, #8) @celular', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Próximos eventos de Vida Sobrenatural/ })).toHaveCount(0);
    const descripcion = page.getByText('Quiénes somos, en qué creemos y nuestro liderazgo.');
    await expect(descripcion).toBeVisible();
    expect(await tamanoDeLetra(descripcion)).toBeGreaterThanOrEqual(16);
    await objetivosDe44(contenido(page).getByRole('list').first());
  });
});
