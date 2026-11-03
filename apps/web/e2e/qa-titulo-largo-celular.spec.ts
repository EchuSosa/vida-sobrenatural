import type { Page } from '@playwright/test';
import { test, expect, cambiarDeSesion, registrarPersonaDeTest } from './helpers';
import { cargarMaterialPorApi, crearEdicionPorApi, inscribirPorApi, registrarVidaNuevaHecha, EMAIL_LIDER_1 } from './helpers-008';

/**
 * QA ronda 1, BUG-06: un título de semana sin espacios ensancha la página en
 * celular, y el encabezado fijo se estira con ella: el botón "Más" queda fuera
 * de la pantalla. Arreglado: los títulos y el texto de la semana usan
 * `overflow-wrap: anywhere`, y `main` tiene `min-w-0`. Se revisan las tres
 * pantallas que lo muestran: la lista, la semana de la persona y la del líder.
 */
async function excesoHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('Vida de Servicio en celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.slow();

  test('un título largo sin espacios no ensancha la página', async ({ page, baseURL }) => {
    const sufijo = Date.now();
    const grupoId = await crearEdicionPorApi(baseURL!, { nombre: `e2e-qa-titulo-${sufijo}`, semanas: 3, inicio: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) });
    const email = `e2e-qa-titulo-${sufijo}@example.com`;
    await registrarPersonaDeTest(page, email);
    const personaId = await registrarVidaNuevaHecha(baseURL!, email);
    await inscribirPorApi(baseURL!, personaId, grupoId);
    await cargarMaterialPorApi(baseURL!, EMAIL_LIDER_1, grupoId, 1, { titulo: 'T'.repeat(120), texto: 'Material de prueba' });

    await page.goto('/mi-camino/vida-de-servicio');
    await expect(page.getByRole('heading', { name: 'Semanas' })).toBeVisible();
    expect(await excesoHorizontal(page)).toBeLessThanOrEqual(0);

    await page.goto('/mi-camino/vida-de-servicio/semanas/1');
    await expect(page.getByRole('heading', { level: 1, name: 'T'.repeat(120) })).toBeVisible();
    expect(await excesoHorizontal(page)).toBeLessThanOrEqual(0);

    // Cambiar de persona: sin borrar la sesión de antes, /mis-grupos la llevaba a Mi camino.
    await cambiarDeSesion(page, EMAIL_LIDER_1);
    await page.goto(`/mis-grupos/${grupoId}/semanas/1`);
    // Con la edición en curso, el líder ve el título en el formulario para editarlo.
    await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue('T'.repeat(120));
    expect(await excesoHorizontal(page)).toBeLessThanOrEqual(0);
    // El botón "Más" del encabezado fijo sigue dentro de la pantalla.
    const mas = page.getByRole('button', { name: 'Más' });
    await expect(mas).toBeVisible();
    const caja = await mas.boundingBox();
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(390);
  });
});
