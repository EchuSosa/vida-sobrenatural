import { type Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, registrarPersonaDeTest, sinScrollHorizontal } from './helpers';

/**
 * spec 013, T066 (Historia 5: H5.1–H5.5; FR-045, FR-063): "Contanos qué te
 * parece" en la web, por la pantalla real. Cada test manda su propio origen
 * (`x-forwarded-for`, que el servidor de Next pasa como `X-Origen-Cliente`)
 * para que el límite de 5 por hora no cruce casos. axe en claro y oscuro.
 */

const resumen = (page: Page) => page.getByRole('alert').filter({ hasText: 'Revisá esto antes de enviar:' });

function origenUnico(): string {
  const n = Date.now() + Math.floor(Math.random() * 1e6);
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function escribir(page: Page, tipo: 'Un problema' | 'Una sugerencia', texto: string) {
  await page.getByRole('radio', { name: new RegExp(tipo) }).check();
  await page.getByLabel('Contanos', { exact: true }).fill(texto);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setExtraHTTPHeaders({ 'x-forwarded-for': origenUnico() });
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('H5.1: sin sesión, desde el pie de página: elige el tipo, escribe y ve qué pasa después @celular', async ({ page }) => {
      await page.goto('/visitanos');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Contanos qué te parece' }).click();
      await expect(page).toHaveURL(/\/contanos\?desde=%2Fvisitanos$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Contanos qué te parece' })).toBeVisible();
      await esperarTema(page, tema);
      await sinScrollHorizontal(page);
      await sinViolaciones(page);

      await escribir(page, 'Un problema', 'No encuentro el horario del culto del domingo.');
      await expect(page.getByText('46 de 2000 caracteres')).toBeVisible();
      // Doble toque: un solo envío (H-57).
      await page.getByRole('button', { name: 'Enviar' }).dblclick();
      const confirmacion = page.getByRole('status').filter({ hasText: '¡Gracias! Lo vamos a leer.' });
      await expect(confirmacion).toBeVisible();
      await expect(confirmacion).toContainText('Si es un problema, lo revisamos para arreglarlo.');
      await sinViolaciones(page);
      await page.getByRole('link', { name: 'Volver a donde estabas' }).click();
      await expect(page).toHaveURL(/\/visitanos$/);
    });

    test('H5.3 y H5.4: errores por campo con resumen y foco, sin borrar lo escrito; "Pueden contactarme" pide email o teléfono', async ({ page }) => {
      await page.goto('/contanos');
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(resumen(page)).toBeFocused();
      await expect(resumen(page).getByRole('link', { name: 'Elegí si es un problema o una sugerencia.' })).toBeVisible();
      await expect(page.locator('#campo-texto-error')).toHaveText('Escribí qué nos querés contar, en hasta 2000 caracteres.');
      await sinViolaciones(page);

      const largo = 'a'.repeat(2001);
      await escribir(page, 'Una sugerencia', largo);
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.locator('#campo-texto-error')).toBeVisible();
      await expect(page.getByLabel('Contanos', { exact: true })).toHaveValue(largo);

      await page.getByLabel('Contanos', { exact: true }).fill('Estaría bueno ver los eventos en un calendario.');
      await page.getByLabel('Pueden contactarme para preguntarme más').check();
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.locator('#campo-contacto-error')).toContainText('dejanos un email o un teléfono');
      await expect(resumen(page)).toBeFocused();
      await sinViolaciones(page);

      await page.getByLabel('Email (opcional)').fill('ana.contanos@example.com');
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByRole('status').filter({ hasText: '¡Gracias!' })).toContainText('te vamos a contactar');
    });

    test('H5.5: el sexto comentario seguido desde el mismo lugar se frena, con cuánto esperar', async ({ page }) => {
      await page.goto('/contanos');
      for (let i = 1; i <= 5; i++) {
        await escribir(page, 'Un problema', `Prueba de límite ${tema} ${i}`);
        await page.getByRole('button', { name: 'Enviar' }).click();
        await expect(page.getByRole('status').filter({ hasText: '¡Gracias!' })).toBeVisible();
        await page.getByRole('button', { name: 'Mandar otro comentario' }).click();
      }
      await escribir(page, 'Un problema', 'El sexto');
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Mandaste varios comentarios seguidos.' })).toContainText(/Probá de nuevo en \d+ minutos\./);
      await expect(page.getByLabel('Contanos', { exact: true })).toHaveValue('El sexto');
      await sinViolaciones(page);
    });

    test('H5.2: con sesión, desde Perfil, no pide datos de contacto y queda a su nombre', async ({ page }) => {
      const email = `e2e-contanos-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      await page.goto('/perfil');
      await page.getByRole('link', { name: 'Contanos qué te parece' }).click();
      await expect(page).toHaveURL(/\/contanos\?desde=%2Fperfil$/);

      await escribir(page, 'Una sugerencia', 'Me gustaría poder ver mi camino en el celular sin conexión.');
      await page.getByLabel('Pueden contactarme para preguntarme más').check();
      await expect(page.getByText('Si te contactamos, usamos el email y el teléfono de tu perfil.')).toBeVisible();
      await expect(page.getByLabel('Email (opcional)')).toHaveCount(0);
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByRole('status').filter({ hasText: '¡Gracias!' })).toContainText('te vamos a contactar');
    });
  });
}
