import type { Page } from '@playwright/test';
import { abrirEtapa, test, expect, auditar, esperarTema, sinScrollHorizontal } from './helpers';
import { EMAILS_009, MINISTERIOS_009, entrarConTema, prepararSinPostulacion } from './helpers-009';

/**
 * spec 009, T037 + T057 (US1, US3, US7; FR-001, FR-006 a FR-011, FR-013,
 * FR-034; SC-001, SC-005, SC-006): postularse a un Ministerio desde Mi
 * camino en celular (`@celular`) y escritorio, con axe en claro y oscuro en
 * cada pantalla; y la página pública. Las Personas y los Ministerios
 * `e2e-…` los siembra `sembrar-e2e/009-ministerios.ts`.
 *
 * Lo que NO cubre: los `error.tsx` (la llamada la hace el Server Component
 * desde el servidor de Next, que Playwright no intercepta — igual que Mi
 * camino de la 006); queda para la revisión manual.
 */

function cardMinisterio(page: Page) {
  return page.getByRole('region', { name: 'Ministerio', exact: true });
}

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle');
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('apta: elige un Ministerio, se postula con Célula (largo con resumen y foco, un solo envío), la card dice en revisión y retira @celular', async ({ page, baseURL }, testInfo) => {
      const email = testInfo.project.name === 'celular' ? EMAILS_009.aptaCelular : EMAILS_009.apta;
      await prepararSinPostulacion(baseURL!, email);
      await entrarConTema(page, baseURL!, email, tema);
      const inicio = Date.now();

      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await cardMinisterio(page).getByRole('link', { name: 'Elegí un Ministerio' }).click();
      await expect(page).toHaveURL(/\/mi-camino\/ministerios$/);
      await expect(page.getByRole('heading', { name: 'Para empezar a servir ya' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Requieren formación previa' })).toBeVisible();
      await expect(page.getByRole('main')).not.toContainText(MINISTERIOS_009.pausado);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      // docs/22: el que requiere formación lo avisa antes de postularse.
      await page.getByRole('link', { name: new RegExp(MINISTERIOS_009.adoracion) }).click();
      await expect(page.getByText('Este ministerio requiere capacitación o audición: el equipo te va a contactar.')).toBeVisible();
      await page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Ministerios' }).click();

      await page.getByRole('link', { name: new RegExp(MINISTERIOS_009.bienvenida) }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(MINISTERIOS_009.bienvenida);
      await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Mi camino');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);

      // H-50: más de 500 caracteres → error debajo del campo y resumen con foco.
      await page.getByLabel('Seguridad').check();
      await page.getByLabel('¿Por qué te gustaría servir acá? (opcional)').fill('a'.repeat(501));
      await page.getByRole('button', { name: 'Postularme' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
      await expect(page.locator('#campo-motivacion-error')).toContainText('500');
      await sinViolaciones(page, tema);

      // H-57: el botón mide 44 px (D150) y un doble toque crea UNA postulación.
      const boton = page.getByRole('button', { name: 'Postularme' });
      expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.getByLabel('¿Por qué te gustaría servir acá? (opcional)').fill('Me gusta recibir a la gente');
      await boton.dblclick();
      await expect(page).toHaveURL(/\/mi-camino(#etapa-ministerio)?$/);
      await expect(page.getByText('Recibimos tu postulación. Te avisamos cuando el equipo la revise.')).toBeVisible();
      await expect(cardMinisterio(page)).toContainText('Tu postulación está en revisión');
      await expect(cardMinisterio(page)).toContainText(`${MINISTERIOS_009.bienvenida} (Seguridad)`);
      // Ajustes 2 (PR #18, P5): el encabezado de la card también lo dice (texto + ícono, D81), no "La podés empezar".
      await expect(cardMinisterio(page).getByText('En revisión', { exact: true })).toBeVisible();
      await expect(cardMinisterio(page).getByText('La podés empezar', { exact: true })).toHaveCount(0);
      testInfo.annotations.push({ type: 'SC-001', description: `postulación completa en ${Math.round((Date.now() - inicio) / 1000)} s` });
      await sinViolaciones(page, tema);

      // Retirar: confirmación neutra (D151); la card vuelve a "Elegí un Ministerio" sin recargar.
      await cardMinisterio(page).getByRole('button', { name: 'Retirar postulación' }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Sí, retirarla' }).click();
      await expect(cardMinisterio(page).getByRole('link', { name: 'Elegí un Ministerio' })).toBeVisible();
      await expect(cardMinisterio(page)).toContainText('Retiraste tu postulación');
      await expect(cardMinisterio(page).getByText('En revisión', { exact: true })).toHaveCount(0);
    });

    test('no apta: la card explica qué falta y la lista se ve sin formulario @celular', async ({ page, baseURL }) => {
      await entrarConTema(page, baseURL!, EMAILS_009.noApta, tema);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(cardMinisterio(page)).toContainText('Primero, Vida de Servicio');
      await abrirEtapa(page, 'Ministerio'); // propuesta A: bloqueada, arranca plegada
      await cardMinisterio(page).getByRole('link', { name: 'Conocé los Ministerios' }).click();
      await expect(page.getByText('Para postularte, primero terminá Vida de Servicio')).toBeVisible();
      await page.getByRole('link', { name: new RegExp(MINISTERIOS_009.bienvenida) }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(MINISTERIOS_009.bienvenida);
      await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
      await expect(page.getByText('Para postularte, primero terminá Vida de Servicio')).toBeVisible();
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 360);
    });

    test('miembro: la card dice dónde sirve y el detalle de su Ministerio no ofrece el formulario', async ({ page, baseURL }) => {
      await entrarConTema(page, baseURL!, EMAILS_009.miembro, tema);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(cardMinisterio(page)).toContainText(`Estás sirviendo en ${MINISTERIOS_009.bienvenida}`);
      await expect(cardMinisterio(page)).toContainText('En el área Seguridad.');
      await sinViolaciones(page, tema);
      await abrirEtapa(page, 'Ministerio'); // propuesta A: hecha, arranca plegada
      await cardMinisterio(page).getByRole('link', { name: 'Quiero cambiar de Ministerio' }).click();
      await page.getByRole('link', { name: new RegExp(MINISTERIOS_009.bienvenida) }).click();
      await expect(page.getByText('Ya estás sirviendo en este Ministerio')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
    });

    test('pública: muestra los activos con su línea, no el pausado ni las áreas; sin scroll a 320 px @celular', async ({ page }) => {
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await page.goto('/ministerios');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: MINISTERIOS_009.bienvenida })).toBeVisible();
      await expect(page.getByText('Recibimos y acompañamos a cada persona que llega.').first()).toBeVisible();
      await expect(page.getByRole('main')).not.toContainText(MINISTERIOS_009.pausado);
      await expect(page.getByRole('main')).not.toContainText('Seguridad'); // docs/22: sin áreas en la pública
      await expect(page.getByRole('link', { name: 'Ver Primeros pasos' })).toBeVisible();
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 320);
    });
  });
}
