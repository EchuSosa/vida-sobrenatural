import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, sinScrollHorizontal } from './helpers';
import { EMAILS_014, GRUPOS_014, entrarConTema, prepararSinGrupo } from './helpers-014';

/**
 * spec 014 — el flujo ⭐ de Grupos de Extensión en la web app, en celular
 * (`@celular`) y escritorio, con axe en claro y oscuro en cada pantalla:
 * la persona busca por dirección y ve solo los grupos de su género y edad por
 * cercanía (sin dirección exacta), pide sumarse, la líder lo ve en "Mi grupo"
 * con "Escribir por WhatsApp" y acepta, y la persona ve su grupo con la
 * dirección y "Cómo llegar". Corre con el geocodificador falso (D223), que
 * ubica "7 nro 1200" en el centro.
 */

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle');
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

function cardGrupo(page: Page) {
  return page.getByRole('region', { name: 'Mi grupo de extensión' });
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('⭐ busca por dirección, ve los suyos por cercanía, pide sumarse, la líder acepta y ve su grupo con "Cómo llegar" @celular', async ({ page, baseURL }, testInfo) => {
      const email = testInfo.project.name === 'celular' ? EMAILS_014.buscadoraCelular : EMAILS_014.buscadora;
      await prepararSinGrupo(baseURL!, email);
      await entrarConTema(page, baseURL!, email, tema);

      // La card de Mi camino, aparte de las etapas.
      await page.goto('/mi-camino');
      await expect(cardGrupo(page)).toContainText('Todavía no tenés grupo');
      await sinViolaciones(page, tema);
      await cardGrupo(page).getByRole('link', { name: 'Encontrá tu grupo' }).click();
      await expect(page).toHaveURL(/\/mi-camino\/grupo-extension$/);

      // H-50: sin dirección → error debajo del campo, resumen con foco.
      await page.getByRole('button', { name: 'Buscar grupos' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá esto para buscar:' })).toBeFocused();
      await expect(page.locator('#direccion-error')).toContainText('Escribí tu dirección');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      await page.getByLabel('Tu dirección').fill('7 nro 1200');
      const buscar = page.getByRole('button', { name: 'Buscar grupos' });
      expect((await buscar.boundingBox())!.height).toBeGreaterThanOrEqual(44); // D150
      await buscar.click();
      const resultados = page.getByRole('region', { name: 'Grupos para vos' });
      await expect(resultados).toBeVisible();
      const nombres = await resultados.getByRole('heading', { level: 3 }).allTextContents();
      const deE2e = nombres.filter((n) => n.startsWith('e2e-'));
      // Solo los de mujeres de su edad, el más cercano primero; el de varones no.
      expect(deE2e.slice(0, 1)).toEqual([GRUPOS_014.cerca]);
      expect(deE2e).toContain(GRUPOS_014.lejos);
      expect(deE2e).not.toContain(GRUPOS_014.varones);
      expect(deE2e.indexOf(GRUPOS_014.cerca)).toBeLessThan(deE2e.indexOf(GRUPOS_014.lejos));
      // D224: zona y distancia, nunca la dirección exacta.
      const tarjeta = resultados.getByRole('article', { name: GRUPOS_014.cerca });
      await expect(tarjeta).toContainText('Zona: Centro');
      await expect(tarjeta).toContainText(/A \d+,\d km/);
      await expect(resultados).not.toContainText('820');
      // El completo aparece "Completo", sin botón.
      const completo = resultados.getByRole('article', { name: GRUPOS_014.completo });
      await expect(completo).toContainText('Completo');
      await expect(completo.getByRole('button')).toHaveCount(0);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      // Pide sumarse (confirmación neutra) y queda esperando.
      await tarjeta.getByRole('button', { name: `Quiero sumarme a ${GRUPOS_014.cerca}` }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quiero sumarme' }).click();
      await expect(page.getByText(`Pediste sumarte a ${GRUPOS_014.cerca}`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retirar el pedido' })).toBeVisible();
      await sinViolaciones(page, tema);

      // La líder lo ve en "Mi grupo", con WhatsApp, y acepta.
      await page.context().clearCookies();
      await entrarConTema(page, baseURL!, EMAILS_014.lider, tema);
      await page.goto('/mi-grupo-extension');
      const seccion = page.getByRole('region', { name: GRUPOS_014.cerca });
      const nombre = testInfo.project.name === 'celular' ? 'Celia E2E Gex' : 'Bea E2E Gex';
      const pedido = seccion.getByRole('listitem').filter({ hasText: nombre }).filter({ hasText: 'Pidió sumarse' });
      await expect(pedido).toContainText('30 años');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);
      await expect(pedido.getByRole('link', { name: /Escribir por WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/549\d{10}\?text=/);
      await pedido.getByRole('button', { name: `Aceptar a ${nombre}` }).click();
      await expect(page.getByText(/ya forma parte del grupo y le avisamos/)).toBeVisible();

      // La persona ve su grupo con la dirección exacta y "Cómo llegar".
      await page.context().clearCookies();
      await entrarConTema(page, baseURL!, email, tema);
      await page.goto('/mi-camino');
      await expect(cardGrupo(page)).toContainText(`Formás parte de ${GRUPOS_014.cerca}`);
      await cardGrupo(page).getByRole('link', { name: 'Ver mi grupo y cómo llegar' }).click();
      await expect(page.getByText('64 nro 820 e/ 11 y 12')).toBeVisible();
      await expect(page.getByRole('link', { name: `Cómo llegar a ${GRUPOS_014.cerca} (abre el mapa)` })).toHaveAttribute('href', /google\.com\/maps\/search\/\?api=1&query=64/);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      await prepararSinGrupo(baseURL!, email);
    });
  });
}
