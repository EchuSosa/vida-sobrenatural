import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, registrarPersonaDeTest, sinScrollHorizontal, usarTemaOscuro } from './helpers';
import { aprobarPorApi, cargarMaterialPorApi, crearEdicionPorApi, registrarVidaNuevaHecha, EMAIL_LIDER_1 } from './helpers-008';

/**
 * spec 008, T047 — flujo crítico (Principios VI y VII; Historia 5; SC-003,
 * SC-007): la Persona pide, el Admin aprueba (por API), el Líder carga el
 * material de una semana ya alcanzada con un PDF (por API), y la Persona abre
 * la semana liberada y el PDF. La semana futura no se abre. `axe` en claro y
 * oscuro.
 */

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  // Después de navegar del lado del cliente, Next escribe el <title> un instante más tarde (metadatos en streaming).
  await expect(page).toHaveTitle(/.+/);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
    // Registra Personas por el flujo real y arma la edición por la API: más que el promedio.
    test.slow();

    test('pedir → aprobar → material → abrir la semana y el PDF @celular', async ({ page, baseURL }) => {
      const sufijo = `${tema}-${Date.now()}`;
      const edicion = `e2e-flujo-${sufijo}`;
      // Empezó hace 7 días: la semana 1 ya se ve si tiene material; la 2 es hoy; la 3, en 7 días.
      const grupoId = await crearEdicionPorApi(baseURL!, { nombre: edicion, semanas: 3, inicio: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) });
      const email = `e2e-vs-flujo-${sufijo}@example.com`;
      await registrarPersonaDeTest(page, email);
      const personaId = await registrarVidaNuevaHecha(baseURL!, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);

      await page.goto('/mi-camino');
      const card = page.getByRole('region', { name: 'Vida de Servicio', exact: true });
      await card.getByRole('button', { name: 'Quiero anotarme' }).click();
      await page.getByRole('alertdialog').getByRole('radio', { name: new RegExp(edicion) }).check();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Enviar mi pedido' }).click();
      await expect(card).toContainText('Recibimos tu pedido');

      await aprobarPorApi(baseURL!, personaId, grupoId);
      await cargarMaterialPorApi(baseURL!, EMAIL_LIDER_1, grupoId, 1, { titulo: 'El llamado a servir', texto: 'Leé el capítulo 1: https://example.com/capitulo-1', pdf: 'guia-semana-1.pdf' });
      await cargarMaterialPorApi(baseURL!, EMAIL_LIDER_1, grupoId, 3, { titulo: 'Todavía no' });

      await page.goto('/mi-camino');
      await expect(card).toContainText('Estás haciendo Vida de Servicio');
      await card.getByRole('link', { name: 'Ver el material y mi asistencia' }).click();
      await expect(page).toHaveURL(/\/mi-camino\/vida-de-servicio$/);
      const semanas = page.getByRole('region', { name: 'Semanas' });
      await expect(semanas.getByRole('listitem')).toHaveCount(3);
      await expect(semanas.getByRole('listitem').nth(2)).toContainText('Próximamente');
      await expect(semanas.getByRole('listitem').nth(2).getByRole('link')).toHaveCount(0);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page);

      await semanas.getByRole('link', { name: 'Abrir la semana 1' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('El llamado a servir');
      await expect(page.getByRole('link', { name: 'https://example.com/capitulo-1' })).toBeVisible();
      const pdf = page.getByRole('link', { name: /Abrir guia-semana-1\.pdf/ });
      await expect(pdf).toBeVisible();
      await sinViolaciones(page, tema);

      const respuesta = await page.request.get((await pdf.getAttribute('href'))!);
      expect(respuesta.status()).toBe(200);
      expect(respuesta.headers()['content-type']).toBe('application/pdf');
      expect(respuesta.headers()['cache-control']).toContain('no-store');

      // La semana 3 (futura) no se abre aunque tenga material: la pantalla lo explica.
      await page.goto('/mi-camino/vida-de-servicio/semanas/3');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este material no está disponible');
    });
  });
}
