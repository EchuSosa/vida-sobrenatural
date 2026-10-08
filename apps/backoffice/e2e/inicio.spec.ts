import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E, sinScrollHorizontal } from './helpers';

/**
 * spec 013, T043 (Historia 3): el Inicio del backoffice hecho de bloques
 * independientes (D209). Los bloques piden sus datos desde el navegador, así
 * que los casos límite se arman interceptando la API con `page.route`: base
 * sin Personas activas (H3.4), dos tipos con abiertas (H3.5) y una consulta
 * que falla (H3.6).
 */
const METRICAS_VACIAS = {
  personasActivas: 0,
  porTiempoCongregacion: ['este_anio', 'de_1_a_2_anios', 'de_3_a_5_anios', 'mas_de_5_anios'].map((valor) => ({ valor, cantidad: 0 })),
  porSede: [{ sedeId: 's1', nombre: 'La Plata', activa: true, cantidad: 0 }],
};

async function responder(page: Page, sufijo: string, cuerpo: unknown, status = 200) {
  await page.route(new RegExp(`${sufijo.replace(/[?]/g, '\\?')}(\\?|$)`), (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo), headers: { 'Access-Control-Allow-Origin': '*' } }),
  );
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('H3.2: las métricas con los cuatro rangos, cantidad y porcentaje en texto', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/');
      const metricas = page.getByRole('region', { name: 'Cómo está la iglesia' });
      await expect(metricas.getByText('Personas activas')).toBeVisible();
      const rangos = metricas.getByRole('table', { name: /Desde cuándo vienen/ });
      for (const rango of ['Empezaron este año', 'Hace 1 o 2 años', 'Hace 3 a 5 años', 'Hace más de 5 años']) {
        await expect(rangos.getByRole('row', { name: new RegExp(rango) })).toContainText(/\d+ · \d+ %/);
      }
      await expect(metricas).toContainText('Contado desde el año en que cada Persona empezó a venir.');
      await expect(metricas.getByRole('table', { name: /Por Sede/ })).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('H3.4 y H3.5: sin Personas activas, el vacío sin "NaN"; las abiertas por tipo enlazan a la bandeja filtrada', async ({ page }) => {
      await responder(page, '/inicio/metricas', METRICAS_VACIAS);
      await responder(page, '/solicitudes/conteo-abiertas', { discipulado: 5, bautismo: 2 });
      await loguearseComoAdminE2E(page);
      await page.goto('/');

      const metricas = page.getByRole('region', { name: 'Cómo está la iglesia' });
      await expect(metricas).toContainText('Todavía no hay Personas activas para contar.');
      await expect(metricas).not.toContainText('NaN');

      const pendientes = page.getByRole('region', { name: 'Esperan una respuesta' });
      await expect(pendientes.getByRole('link', { name: '5 de Vida Nueva' })).toHaveAttribute('href', '/solicitudes?tipo=discipulado');
      await expect(pendientes.getByRole('link', { name: '2 de Bautismo' })).toHaveAttribute('href', '/solicitudes?tipo=bautismo');
      await page.waitForLoadState('networkidle');
      expect((await auditar(page)).violations).toEqual([]);
    });

    test('H3.5: con todo en 0, el bloque lo dice', async ({ page }) => {
      await responder(page, '/solicitudes/conteo-abiertas', { discipulado: 0 });
      await responder(page, '/personas/pendientes-tutor', { items: [], total: 0 });
      await loguearseComoAdminE2E(page);
      await page.goto('/');
      await expect(page.getByRole('region', { name: 'Esperan una respuesta' })).toContainText('No hay nada esperando una respuesta.');
    });

    test('H3.6: si las métricas fallan, ese bloque muestra el error con "Reintentar" y los demás se ven', async ({ page, permitirErrorDeConsola }) => {
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 500/);
      // Falla hasta que se aprieta Reintentar; después, la API de verdad.
      let fallar = true;
      await page.route(/\/inicio\/metricas(\?|$)/, (route) =>
        fallar ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'ERROR_INTERNO' }) }) : route.continue(),
      );
      await loguearseComoAdminE2E(page);
      await page.goto('/');

      const metricas = page.getByRole('region', { name: 'Cómo está la iglesia' });
      await expect(metricas.getByRole('alert')).toContainText('No pudimos cargar las métricas.');
      await expect(page.getByRole('region', { name: 'Esperan una respuesta' }).getByRole('alert')).toHaveCount(0);

      // Reintentar vuelve a pedir: con la API sana, aparecen las métricas.
      fallar = false;
      await metricas.getByRole('button', { name: 'Reintentar' }).click();
      await expect(metricas.getByText('Personas activas')).toBeVisible();
    });
  });
}

test('el Pastor ve el Inicio igual, sin acciones', async ({ page }) => {
  await loguearseComoPastorE2E(page);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Cómo está la iglesia' }).getByText('Personas activas')).toBeVisible();
  for (const bloque of ['Cómo está la iglesia', 'Esperan una respuesta']) {
    await expect(page.getByRole('region', { name: bloque }).getByRole('button')).toHaveCount(0);
  }
  await expect(page.getByRole('region', { name: 'Pendientes' })).toHaveCount(0);
});

test('@celular a 360 px sin scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loguearseComoAdminE2E(page);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Cómo está la iglesia' }).getByText('Personas activas')).toBeVisible();
  expect(await sinScrollHorizontal(page)).toBe(true);
});
