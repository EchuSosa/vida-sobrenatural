import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, loguearseComoTest, registrarPersonaDeTest, sinScrollHorizontal, usarTemaOscuro } from './helpers';
import { api, sesionDe, usarTema } from './helpers-006';

/**
 * spec 006, T052 (Historia 3, escenarios 1, 2, 5 y 6; FR-021 a FR-024,
 * FR-027; SC-005): el Discipulador en la web app — el selector "Mi camino ·
 * Mis discipulados", la pestaña Mi camino marcada en las tres rutas, el aviso
 * de pendientes del Inicio, y sin el permiso de vuelta a Mi camino. En
 * `@celular`, con axe en los dos temas. El ciclo completo de la 004 (aceptar,
 * Encuentro, finalizar, agenda) lo recorren los e2e del backoffice que ahora
 * abren estas pantallas acá (`apps/backoffice/e2e/helpers-006.ts`).
 */

const DISCIPULADORA_2 = 'e2e-discipulador-2@example.com';

function barra(page: Page) {
  return page.getByRole('navigation', { name: 'Principal' });
}

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

/** Objetivos táctiles de al menos 44 px en el contenido (D150). */
async function objetivosDe44(page: Page) {
  const chicos = await page.locator('#contenido').evaluate((contenido) =>
    [...contenido.querySelectorAll<HTMLElement>('main button, main a[href], main select, main input:not([type="hidden"])')]
      .filter((el) => el.getClientRects().length > 0 && !el.closest('nav[aria-label="Ruta"]') && !el.closest('p'))
      .map((el) => ({ el: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"`, h: el.getBoundingClientRect().height }))
      .filter((r) => r.h < 44)
      .map((r) => `${r.el}: ${Math.round(r.h)}`),
  );
  expect(chicos).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('la Discipuladora: selector en las tres pantallas, la pestaña Mi camino marcada, sin scroll de costado y con objetivos de 44 px @celular', async ({ page }) => {
      await loguearseComoTest(page, DISCIPULADORA_2);
      await usarTema(page, DISCIPULADORA_2, tema);

      for (const [ruta, actual] of [
        ['/mi-camino', 'Mi camino'],
        ['/mis-discipulados', 'Mis discipulados'],
        ['/mi-disponibilidad', 'Mis discipulados'],
      ] as const) {
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        const selector = page.getByRole('navigation', { name: 'Secciones de Mi camino' });
        await expect(selector).toBeVisible();
        await expect(selector.getByRole('link', { name: actual })).toHaveAttribute('aria-current', 'page');
        await expect(barra(page).getByRole('link', { name: 'Mi camino' })).toHaveAttribute('aria-current', 'page');
        await sinViolaciones(page, tema);
        await sinScrollHorizontal(page);
        if (ruta !== '/mi-camino') await objetivosDe44(page);
      }

      // Desde el selector se va de verdad (enlaces reales).
      await page.goto('/mi-camino');
      await page.getByRole('navigation', { name: 'Secciones de Mi camino' }).getByRole('link', { name: 'Mis discipulados' }).click();
      await expect(page).toHaveURL(/\/mis-discipulados$/);
      await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Mi camino');
    });

    test('una Persona sin el rol no ve el selector, y /mis-discipulados y /mi-disponibilidad la llevan a Mi camino @celular', async ({ page }) => {
      const email = `e2e-sin-rol-disc-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('navigation', { name: 'Secciones de Mi camino' })).toHaveCount(0);

      for (const ruta of ['/mis-discipulados', '/mi-disponibilidad', '/mis-discipulados/cualquiera']) {
        await page.goto(ruta);
        await expect(page).toHaveURL(/\/mi-camino$/);
        await page.waitForLoadState('networkidle');
      }
      await sinViolaciones(page, tema);
    });
  });
}

test('el Inicio avisa cuántas cosas tiene para revisar la Discipuladora; sin el rol, no dice nada @celular', async ({ page, baseURL }) => {
  // Una Persona nueva pide Vida Nueva y el Admin se la propone a la Discipuladora 2: un pendiente.
  const email = `e2e-inicio-pend-${Date.now()}@example.com`;
  await registrarPersonaDeTest(page, email);
  const persona = await sesionDe(baseURL!, email);
  const { id: solicitudId } = await api(persona.apiToken, 'POST', '/discipulado/solicitudes/me', {
    franjas: [{ diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 }],
  });
  const admin = await sesionDe(baseURL!, 'e2e-admin@example.com');
  const disc2 = await sesionDe(baseURL!, DISCIPULADORA_2);
  await api(admin.apiToken, 'POST', `/discipulado/solicitudes/${solicitudId}/proponer`, { discipuladorId: disc2.personaId });

  try {
    await loguearseComoTest(page, DISCIPULADORA_2);
    await usarTema(page, DISCIPULADORA_2, 'claro');
    await page.goto('/inicio');
    await page.waitForLoadState('networkidle');
    const aviso = page.getByRole('link', { name: /Tenés \d+ (cosa|cosas) para revisar en tus discipulados/ });
    await expect(aviso).toBeVisible();
    await sinViolaciones(page, 'claro');
    await aviso.click();
    await expect(page).toHaveURL(/\/mis-discipulados$/);
    await expect(page.getByRole('heading', { name: 'Propuestas para vos' })).toBeVisible();
  } finally {
    // Que no quede apareciendo en los demás specs.
    await api(admin.apiToken, 'POST', `/discipulado/solicitudes/${solicitudId}/retirar-propuesta`).catch(() => undefined);
    await api(persona.apiToken, 'DELETE', '/discipulado/solicitudes/me').catch(() => undefined);
  }

  // Una Persona sin el rol: su nombre en el saludo (no el de Google) y ningún aviso.
  await loguearseComoTest(page, email);
  await page.goto('/inicio');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Ana');
  await expect(page.getByRole('link', { name: /para revisar en tus discipulados/ })).toHaveCount(0);
});
