import { test, expect, registrarPersonaDeTest } from './helpers';
import { cargarMaterialPorApi, crearEdicionPorApi, inscribirPorApi, registrarVidaNuevaHecha, EMAIL_LIDER_1 } from './helpers-008';

/**
 * QA ronda 1, BUG-06: un título de semana sin espacios ensancha la página en
 * celular, y el encabezado fijo se estira con ella: el botón "Más" queda fuera
 * de la pantalla. Marcado `fail` hasta arreglar el producto.
 */
test.describe('Vida de Servicio en celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.slow();

  test('un título largo sin espacios no ensancha la página', async ({ page, baseURL }) => {
    test.fail(true, 'BUG-06 de QA-REPORT.md: el título largo no se corta dentro de la tarjeta.');
    const sufijo = Date.now();
    const grupoId = await crearEdicionPorApi(baseURL!, { nombre: `e2e-qa-titulo-${sufijo}`, semanas: 3, inicio: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) });
    const email = `e2e-qa-titulo-${sufijo}@example.com`;
    await registrarPersonaDeTest(page, email);
    const personaId = await registrarVidaNuevaHecha(baseURL!, email);
    await inscribirPorApi(baseURL!, personaId, grupoId);
    await cargarMaterialPorApi(baseURL!, EMAIL_LIDER_1, grupoId, 1, { titulo: 'T'.repeat(120), texto: 'Material de prueba' });

    await page.goto('/mi-camino/vida-de-servicio');
    await expect(page.getByRole('heading', { name: 'Semanas' })).toBeVisible();
    const exceso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(exceso).toBeLessThanOrEqual(0);
  });
});
