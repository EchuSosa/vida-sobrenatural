import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, registrarPersonaDeTest, sinScrollHorizontal, usarTemaOscuro } from './helpers';
import { registrarMenorActivo } from './helpers-006';
import mensajes from '../src/messages/es.json';

/**
 * spec 006, T026 (Historia 1, escenarios 1–6; Historia 2, escenarios 1 y 4 del
 * lado de la Persona; SC-002, SC-008): Mi camino por etapas en celular
 * (`@celular`) y escritorio, con axe en claro y oscuro.
 *
 * Lo que NO cubre: el `error.tsx` con "Reintentar". La llamada a
 * `GET /camino/me` la hace el Server Component desde el servidor de Next, y
 * Playwright solo intercepta lo que pide el navegador; queda para la revisión
 * manual (T085), igual que el de Vida Nueva de la 004.
 */

const DESCRIPCIONES: Record<string, string> = {
  'Vida Nueva': mensajes.primerosPasos.paso2Descripcion,
  'Vida de Servicio': mensajes.primerosPasos.paso3Descripcion,
  Ministerio: mensajes.primerosPasos.paso4Descripcion,
};
const ORDEN = ['Vida Nueva', 'Vida de Servicio', 'Ministerio', 'Bautismo'];

function card(page: Page, nombre: string) {
  return page.getByRole('region', { name: nombre, exact: true });
}

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('cuatro cards en orden, con la explicación de Primeros pasos y su estado en palabras; Vida Nueva lleva a su pantalla @celular', async ({ page }) => {
      const email = `e2e-etapas-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');

      // Orden (FR-001): los títulos de las regiones de la página, de arriba a abajo.
      const titulos = await page.getByRole('main').getByRole('heading', { level: 2 }).allTextContents();
      // spec 014 (D224): "Mi grupo de extensión" va después de las cuatro etapas, aparte.
      expect(titulos).toEqual([...ORDEN, 'Mi grupo de extensión']);

      // Una sola fuente de texto con /primeros-pasos (FR-001).
      for (const [nombre, descripcion] of Object.entries(DESCRIPCIONES)) {
        await expect(card(page, nombre)).toContainText(descripcion);
      }

      // Vida Nueva: la puede empezar, con texto (no solo color) y el enlace a su pantalla.
      await expect(card(page, 'Vida Nueva')).toContainText('La podés empezar');
      await expect(card(page, 'Vida Nueva').getByRole('button', { name: 'Ya lo hice' })).toBeVisible();

      // Las etapas todavía no construidas: "Próximamente", sin ningún enlace adentro, y "Ya lo hice" como única acción.
      for (const nombre of ORDEN.slice(1)) {
        const region = card(page, nombre);
        const texto = await region.textContent();
        if (!texto?.includes('Próximamente')) continue; // la spec de esa etapa ya la habilitó
        await expect(region.getByRole('link')).toHaveCount(0);
        await expect(region.getByRole('button')).toHaveCount(1);
        await expect(region.getByRole('button', { name: 'Ya lo hice' })).toBeVisible();
      }

      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page);

      // Los botones de las cards miden al menos 44 px (D150).
      for (const boton of await page.getByRole('main').getByRole('button', { name: 'Ya lo hice' }).all()) {
        expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }

      await card(page, 'Vida Nueva').getByRole('link', { name: 'Quiero empezar Vida Nueva' }).click();
      await expect(page).toHaveURL(/\/mi-camino\/vida-nueva$/);
      await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Mi camino');
      // La pestaña Mi camino sigue marcada en la subruta (FR-023).
      await expect(page.getByRole('navigation', { name: mensajes.nav.principal }).getByRole('link', { name: 'Mi camino' })).toHaveAttribute('aria-current', 'page');
      await sinViolaciones(page, tema);
    });

    test('"Ya lo hice": diálogo neutro con comentario, la card pasa a "en revisión" sin recargar, y se puede retirar @celular', async ({ page }) => {
      const email = `e2e-etapas-declara-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');

      const bautismo = card(page, 'Bautismo');
      await bautismo.getByRole('button', { name: 'Ya lo hice' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('Bautismo: ¿ya lo hiciste?');
      // D151: reversible → tono neutro (el aspecto de cada tono lo pone ajustes-ux).
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await sinViolaciones(page, tema);

      // Comentario de más de 500: error debajo del campo y en el resumen, con foco (H-50).
      const comentario = dialogo.getByLabel('¿Querés contarnos dónde o cuándo? (opcional)');
      await comentario.fill('a'.repeat(501));
      await dialogo.getByRole('button', { name: 'Sí, avisar a la iglesia' }).click();
      await expect(dialogo.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
      await expect(dialogo.locator('#campo-comentario-error')).toHaveText('Escribí hasta 500 caracteres.');

      await comentario.fill('Me bauticé en 2015 en otra iglesia');
      await dialogo.getByRole('button', { name: 'Sí, avisar a la iglesia' }).click();
      await expect(bautismo).toContainText('Nos contaste que ya lo hiciste');
      await expect(bautismo.getByRole('button', { name: 'Ya lo hice' })).toHaveCount(0);
      await sinViolaciones(page, tema);

      // Retirar: confirmación neutra; la card vuelve a ofrecer "Ya lo hice".
      await bautismo.getByRole('button', { name: 'Retirar' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('¿Retirar lo que nos contaste de Bautismo?');
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Sí, retirar' }).click();
      await expect(bautismo.getByRole('button', { name: 'Ya lo hice' })).toBeVisible();
      await expect(bautismo).not.toContainText('Nos contaste que ya lo hiciste');
    });

    test('Vida Nueva declarada: ya no ofrece el pedido mientras la iglesia lo revisa', async ({ page }) => {
      const email = `e2e-etapas-vn-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');

      const vn = card(page, 'Vida Nueva');
      await vn.getByRole('button', { name: 'Ya lo hice' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, avisar a la iglesia' }).click();
      await expect(vn).toContainText('Nos contaste que ya lo hiciste');
      await expect(vn.getByRole('link', { name: 'Quiero empezar Vida Nueva' })).toHaveCount(0);
      await sinViolaciones(page, tema);
    });

    test('un menor de 12 ve el texto del tutor en Vida Nueva y ningún "Ya lo hice" @celular', async ({ page, baseURL }) => {
      const email = `e2e-etapas-menor-${tema}-${Date.now()}@example.com`;
      await registrarMenorActivo(page, baseURL!, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');

      await expect(card(page, 'Vida Nueva')).toContainText('Este pedido lo hace tu mamá, tu papá o tu tutor');
      await expect(card(page, 'Vida Nueva').getByRole('link')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Ya lo hice' })).toHaveCount(0);
      await sinViolaciones(page, tema);
    });
  });
}
