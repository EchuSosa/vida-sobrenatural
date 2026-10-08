import type { Page } from '@playwright/test';
import type { CaminoDeLaPersona } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, auditar, crearPersona, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';

/**
 * spec 006, T039/T039a (Historia 2, escenarios 2, 3 y 9; FR-012, FR-013;
 * SC-003): el Admin resuelve un "Ya lo hice" desde su detalle — confirmar y
 * no confirmar con motivo, en dos clics y con diálogos neutros — y la Persona
 * ve el resultado en `GET /camino/me`. El Pastor lo ve sin acciones. La
 * Persona declara por API (su pantalla la cubre `apps/web/e2e/mi-camino-etapas.spec.ts`).
 */

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function declarar(email: string, etapa: string, comentario?: string): Promise<string> {
  const { id } = await apiComo<{ id: string }>(email, 'POST', '/camino/me/declaraciones', { etapa, comentario });
  return id;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('confirmar: dos clics, diálogo neutro, y la Persona lo ve como "Registrado por la iglesia"; Pendientes del Inicio lo cuenta', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const persona = await crearPersona(`e2e-historial-${sufijo}@example.com`, { nombre: 'Rosa', apellido: `Historial${sufijo}` });
      const id = await declarar(persona.email, 'bautismo', 'Me bauticé en 2015 en otra iglesia');

      await loguearseComoAdminE2E(page);
      await page.goto('/');
      await expect(page.getByRole('region', { name: 'Pendientes' })).toContainText(/historial(es)? previos? por revisar/);
      // Que la sesión del cliente termine de cargar antes de navegar (si no, su fetch se corta y queda en consola).
      await page.waitForLoadState('networkidle');

      await page.goto(`/solicitudes/historial/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Rosa Historial${sufijo} contó que ya hizo Bautismo`);
      await expect(page.getByText('Me bauticé en 2015 en otra iglesia')).toBeVisible();
      await expect(page.getByText('No tiene pedidos, grupos ni registros de Bautismo en la app.')).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Sí, confirmar' }).click();
      await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);

      const camino = await apiComo<CaminoDeLaPersona>(persona.email, 'GET', '/camino/me');
      expect(camino.etapas.find((e) => e.etapa === 'bautismo')).toEqual({ etapa: 'bautismo', estado: 'completada', como: 'historial' });
    });

    test('no confirmar con motivo: la Persona ve el motivo y puede volver a contarlo', async ({ page }) => {
      const sufijo = `${colorScheme}nc${Date.now()}`;
      const persona = await crearPersona(`e2e-historial-${sufijo}@example.com`, { nombre: 'Beto', apellido: `Historial${sufijo}`, genero: 'masculino' });
      const id = await declarar(persona.email, 'vida_de_servicio');

      await loguearseComoAdminE2E(page);
      await page.goto(`/solicitudes/historial/${id}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'No confirmar' }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByLabel('Motivo (opcional)').fill('Traenos el certificado y lo vemos juntos');
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'No confirmar' }).click();
      await expect(page.getByText('No confirmada', { exact: true })).toBeVisible();
      await expect(page.getByText('Motivo que vio la persona: «Traenos el certificado y lo vemos juntos»')).toBeVisible();

      const camino = await apiComo<CaminoDeLaPersona>(persona.email, 'GET', '/camino/me');
      expect(camino.etapas.find((e) => e.etapa === 'vida_de_servicio')).toMatchObject({
        puedeDeclarar: true,
        declaracion: { estado: 'no_confirmada', motivo: 'Traenos el certificado y lo vemos juntos' },
      });
    });

    test('el Pastor ve el detalle sin "Confirmar" ni "No confirmar" (T039a)', async ({ page }) => {
      const sufijo = `${colorScheme}p${Date.now()}`;
      const persona = await crearPersona(`e2e-historial-${sufijo}@example.com`, { nombre: 'Ana', apellido: `Historial${sufijo}` });
      const id = await declarar(persona.email, 'ministerio');

      await loguearseComoPastorE2E(page);
      await page.goto(`/solicitudes/historial/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('contó que ya hizo Ministerio');
      await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'No confirmar' })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}
