import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, sinScrollHorizontal } from './helpers';
import { MINISTERIOS_009 } from './helpers-009';
import { EDICION_015, EMAILS_015, entrarConTema, reiniciarEleccion } from './helpers-015';

/**
 * spec 015 (D239, D240) — el flujo ⭐ de la elección de ministerio en la web
 * app, en celular (`@celular`) y escritorio, con axe en claro y oscuro: la
 * persona ve "Ya podés elegir" en Mi camino, ve lo que ya sabemos, elige hasta
 * 2 ministerios (y Discipulados Vida Nueva aparte) con errores por campo, y
 * la líder de Vida de Servicio hace la charla con notas privadas y marca
 * "Charla hecha". La persona no ve las notas.
 */

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle');
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

const cardMinisterio = (page: Page) => page.getByRole('region', { name: 'Ministerio' });

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('⭐ elige hasta 2 ministerios y la líder hace la charla con notas privadas @celular', async ({ page, baseURL }, testInfo) => {
      const email = testInfo.project.name === 'celular' ? EMAILS_015.personaCelular : EMAILS_015.persona;
      const nombre = testInfo.project.name === 'celular' ? 'Ema' : 'Elena';
      await reiniciarEleccion(email);
      await entrarConTema(page, baseURL!, email, tema);

      await page.goto('/mi-camino');
      await expect(cardMinisterio(page)).toContainText('Ya podés elegir dónde querés servir');
      await sinViolaciones(page, tema);
      await cardMinisterio(page).getByRole('link', { name: 'Elegir mi ministerio' }).click();
      await expect(page).toHaveURL(/\/mi-camino\/ministerios\/elegir$/);

      // Lo que ya sabemos, sin preguntarlo.
      const conocido = page.getByRole('region', { name: 'Esto ya lo sabemos' });
      await expect(conocido).toContainText(`${nombre} E2E Elección`);
      await expect(conocido).toContainText('Celular:');

      // H-50: sin elegir nada → error con resumen y foco.
      await page.getByRole('button', { name: 'Enviar mi elección' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá esto para enviar:' })).toBeFocused();
      await expect(page.locator('#opciones-error')).toContainText('Elegí al menos un área');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      // Dos bloques (docs/22) y lo que va al mismo tiempo.
      await expect(page.getByRole('heading', { name: 'Para empezar a servir ya' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Requieren formación antes' })).toBeVisible();
      await page.getByRole('group', { name: MINISTERIOS_009.bienvenida }).getByLabel('Seguridad').check();
      await expect(page.getByText('Elegiste 1 de 2 ministerios.')).toBeVisible();
      await page.getByRole('group', { name: MINISTERIOS_009.adoracion }).getByLabel('Voces').check();
      await expect(page.getByText('Ya elegiste 2 ministerios.')).toBeVisible();
      await page.getByRole('group', { name: 'e2e-Enseñanza' }).getByLabel('Discipulados Vida Nueva').check();
      await expect(page.getByText('Ya elegiste 2 ministerios.')).toBeVisible();
      await page.getByLabel('¿Querés contarnos algo? (opcional)').fill('Me gusta recibir a la gente.');
      const enviar = page.getByRole('button', { name: 'Enviar mi elección' });
      expect((await enviar.boundingBox())!.height).toBeGreaterThanOrEqual(44); // D150
      await sinViolaciones(page, tema);
      await enviar.click();

      await expect(page).toHaveURL(/\/mi-camino$/);
      await expect(cardMinisterio(page)).toContainText('Elegiste:');
      await expect(cardMinisterio(page)).toContainText(`${MINISTERIOS_009.bienvenida} · Seguridad`);
      await expect(cardMinisterio(page)).toContainText('Discipulados Vida Nueva');
      await expect(cardMinisterio(page).getByRole('link', { name: 'Cambiar mi elección' })).toBeVisible();
      await sinViolaciones(page, tema);

      // La líder hace la charla.
      await page.context().clearCookies();
      await entrarConTema(page, baseURL!, EMAILS_015.lider, tema);
      await page.goto('/mis-grupos');
      await page.getByRole('link', { name: EDICION_015 }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(EDICION_015);
      await page.waitForLoadState('networkidle');
      await page.getByRole('link', { name: 'Elección de ministerio' }).click();
      await expect(page).toHaveURL(/\/elecciones$/);
      const fila = page.getByRole('link', { name: new RegExp(`${nombre} E2E Elección`) });
      await expect(fila).toContainText('Eligió: falta la charla');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);
      await page.waitForLoadState('networkidle');
      await fila.click();
      await expect(page).toHaveURL(/\/elecciones\/[^/]+$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Charla con ${nombre} E2E Elección`);
      await expect(page.getByText('Me gusta recibir a la gente.')).toBeVisible();
      await page.getByLabel('Notas de la charla', { exact: true }).fill('e2e-nota-privada: muy servicial');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);
      await page.getByRole('button', { name: 'Charla hecha' }).click();
      await expect(page.getByText('¡Listo! Le pasamos la elección al equipo.')).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(`${nombre} E2E Elección`) })).toContainText('Charla hecha');

      // La persona ve que ya lo charló, sin las notas.
      await page.context().clearCookies();
      await entrarConTema(page, baseURL!, email, tema);
      await page.goto('/mi-camino/ministerios/elegir');
      await expect(page.getByText('Ya lo charlaste con tu líder')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enviar mi elección' })).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('e2e-nota-privada');
      await sinViolaciones(page, tema);

      await reiniciarEleccion(email);
    });
  });
}
