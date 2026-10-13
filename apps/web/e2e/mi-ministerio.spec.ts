import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, sinScrollHorizontal } from './helpers';
import { entrarConTema } from './helpers-009';

/**
 * spec 016 (D244): "Mi ministerio" del líder, en celular (`@celular`) y
 * escritorio, con axe en claro y oscuro. Lidia y Lía lideran e2e-Bienvenida
 * (sembrar-e2e/016); el miembro de la 009 sirve en Seguridad. La API autoriza
 * contra la base: quien no lidera ve "no encontramos" (Principio V).
 */
const EMAILS = {
  lider: 'e2e-lider-ministerio@example.com',
  liderCelular: 'e2e-lider-ministerio-celular@example.com',
  noLider: 'e2e-ministerio-miembro@example.com',
} as const;

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle');
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('⭐ la líder ve a su equipo por área, con contacto, desde el selector de Mi camino @celular', async ({ page, baseURL }, testInfo) => {
      const email = testInfo.project.name === 'celular' ? EMAILS.liderCelular : EMAILS.lider;
      await entrarConTema(page, baseURL!, email, tema);

      await page.goto('/mi-camino');
      await page.getByRole('navigation', { name: 'Secciones de Mi camino' }).getByRole('link', { name: 'Mi ministerio' }).click();
      // Lidera uno solo: va derecho a su equipo.
      await expect(page).toHaveURL(/\/mi-ministerio\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { level: 1, name: 'e2e-Bienvenida' })).toBeVisible();
      await expect(page.getByText(/También lideran: /)).toBeVisible();

      const seguridad = page.getByRole('region', { name: /^Seguridad/ });
      await expect(seguridad).toContainText('Miembro');
      await expect(seguridad).toContainText(/Sirve desde el/);
      await expect(seguridad.getByRole('link', { name: /^Llamar a Miembro:/ })).toBeVisible();
      await expect(seguridad.getByRole('link', { name: 'Escribir por WhatsApp a Miembro', exact: true })).toHaveAttribute('href', /wa\.me/);
      await expect(page.getByRole('region', { name: /^Atención de la Casa/ })).toContainText('Nadie en esta área todavía.');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);
    });

    test('quien no lidera no ve la sección ni el detalle (404)', async ({ page, baseURL }) => {
      await entrarConTema(page, baseURL!, EMAILS.noLider, tema);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Mi ministerio' })).toHaveCount(0);
      // La URL de un Ministerio ajeno o inexistente: "no encontramos" (Principio V).
      await page.goto('/mi-ministerio/00000000-0000-0000-0000-000000000000');
      await expect(page.getByRole('heading', { level: 1, name: 'No encontramos ese ministerio' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.goto('/mi-ministerio');
      await expect(page.getByText('Todavía no liderás ningún ministerio.')).toBeVisible();
      await sinViolaciones(page, tema);
    });
  });
}
