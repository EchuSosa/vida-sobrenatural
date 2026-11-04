import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema } from './helpers';
import { crearPersonaActiva } from './helpers-011';
import { entrarConTema } from './helpers-009';
import { CONSOLA_500, apiCaida, contarPedidos, tresClics } from '../../../scripts/e2e-casos-infelices';

/**
 * spec 018, US1 (D261–D264): la persona se da de baja desde su Perfil. Cada test usa una Persona
 * nueva (la baja no se deshace). Casos infelices: palabra equivocada (error en el campo), API caída
 * (no se borró nada) y tres toques (una sola baja).
 */
async function nuevaPersona(page: Page, baseURL: string, sufijo: string, tema: 'claro' | 'oscuro' = 'claro') {
  const email = `e2e-baja-${sufijo}-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL, email, 'Baja');
  await entrarConTema(page, baseURL, email, tema);
  await page.goto('/perfil');
  await page.getByRole('link', { name: 'Darme de baja de la app' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Darme de baja de la app' })).toBeVisible();
  return email;
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('⭐ se da de baja: primero la palabra equivocada, después BAJA, y termina fuera de la sesión @celular', async ({ page, baseURL }) => {
      await nuevaPersona(page, baseURL!, tema, tema);
      await expect(page.getByText('No se puede deshacer.')).toBeVisible();
      await esperarTema(page, tema);
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel('Para confirmar, escribí BAJA').fill('baj');
      await page.getByRole('button', { name: 'Darme de baja' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' });
      await expect(resumen).toBeFocused();
      await expect(page.locator('#campo-confirmacion-error')).toHaveText('Escribí BAJA para confirmar.');
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByLabel('Para confirmar, escribí BAJA').fill('baja');
      await page.getByRole('button', { name: 'Darme de baja' }).click();
      await expect(page).toHaveURL(/\/baja-lista$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Listo, te diste de baja' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      // Sin sesión: Perfil la manda a entrar.
      await page.goto('/perfil');
      await expect(page).not.toHaveURL(/\/perfil$/);
    });
  });
}

test('si la API falla, lo dice, no se borró nada y sigue en la pantalla', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await nuevaPersona(page, baseURL!, 'caida');
  const caida = await apiCaida(page, 'POST', /\/personas\/me\/baja$/);
  await page.getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
  await page.getByRole('button', { name: 'Darme de baja' }).click();
  // BUG-16 (QA ronda 2): antes esperaba el texto genérico de error interno, que no dice si se
  // borró algo. Spec 018, US1 escenario 4: tiene que decir que no se borró nada.
  await expect(page.getByRole('alert').filter({ hasText: 'No pudimos darte de baja y no se borró nada.' })).toBeVisible();
  expect(caida.intentos).toBe(1);
  await expect(page).toHaveURL(/\/perfil\/baja$/);
  await page.unrouteAll();
  await page.goto('/perfil');
  await expect(page.getByRole('link', { name: 'Darme de baja de la app' })).toBeVisible();
});

test('tres toques en "Darme de baja" mandan un solo pedido', async ({ page, baseURL }) => {
  await nuevaPersona(page, baseURL!, 'toques');
  const pedidos = contarPedidos(page, 'POST', /\/personas\/me\/baja$/);
  await page.getByLabel('Para confirmar, escribí BAJA').fill('BAJA');
  await tresClics(page.getByRole('button', { name: 'Darme de baja' }));
  await expect(page).toHaveURL(/\/baja-lista$/);
  expect(pedidos.n).toBe(1);
});
