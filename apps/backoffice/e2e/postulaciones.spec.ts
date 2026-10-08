import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { EMAILS_009, MINISTERIOS_009, aprobarComoAdmin, estadoDe, ministerioPorNombre, postularComo, prepararSinPostulacion } from './helpers-009';

/**
 * spec 009, T058 (US2; FR-015 a FR-019, FR-023, FR-041; SC-002, SC-006): el
 * Admin resuelve Postulaciones desde la bandeja — aprobar, aprobar un cambio
 * de Ministerio con la advertencia antes de confirmar, y rechazar con motivo
 * interno —, con axe en claro y oscuro. La Persona se postula por API (su
 * pantalla la cubre `apps/web/e2e/ministerios-postulacion.spec.ts`) y su
 * estado se verifica por `GET /ministerios/me`.
 */

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('aprobar desde la bandeja: Pendientes del Inicio la cuenta, la bandeja filtra por tipo, el detalle muestra lo que pidió y la Persona pasa a servir', async ({ page }, testInfo) => {
      await prepararSinPostulacion(EMAILS_009.postulante);
      const bienvenida = await ministerioPorNombre(MINISTERIOS_009.bienvenida);
      const seguridad = bienvenida.celulas.find((c) => c.nombre === 'Seguridad')!.id;
      const id = await postularComo(EMAILS_009.postulante, bienvenida.id, seguridad, 'Me gusta recibir a la gente');

      await loguearseComoAdminE2E(page);
      const inicio = Date.now();
      await page.goto('/');
      const pendientes = page.getByRole('region', { name: 'Pendientes' });
      await expect(pendientes).toContainText(/postulaci(ón|ones) a Ministerio pendientes?/);
      await page.waitForLoadState('networkidle');
      await pendientes.getByRole('link', { name: /postulaci(ón|ones) a Ministerio/ }).click();
      await expect(page).toHaveURL(/tipo=postulacion/);
      await sinViolaciones(page);

      await page.goto(`/solicitudes/postulacion/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Postulación de Postulante E2E Ministerio a ${MINISTERIOS_009.bienvenida}`);
      await expect(page.getByText('Área: Seguridad')).toBeVisible();
      await expect(page.getByText('Me gusta recibir a la gente')).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Sí, aprobar' }).click();
      await expect(page.getByText('Aprobada', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
      testInfo.annotations.push({ type: 'SC-002', description: `resuelta en ${Math.round((Date.now() - inicio) / 1000)} s` });

      expect(await estadoDe(EMAILS_009.postulante)).toMatchObject({ estado: 'miembro', membresia: { ministerio: { nombre: MINISTERIOS_009.bienvenida } } });
    });

    test('cambio de Ministerio: la advertencia se ve antes de actuar y el diálogo pide confirmar el cambio (FR-017, SC-002)', async ({ page }) => {
      await prepararSinPostulacion(EMAILS_009.cambio);
      const bienvenida = await ministerioPorNombre(MINISTERIOS_009.bienvenida);
      const mesa = await ministerioPorNombre(MINISTERIOS_009.mesa);
      await aprobarComoAdmin(await postularComo(EMAILS_009.cambio, bienvenida.id));
      const id = await postularComo(EMAILS_009.cambio, mesa.id);

      await loguearseComoAdminE2E(page);
      await page.goto(`/solicitudes/postulacion/${id}`);
      await expect(page.getByRole('note').filter({ hasText: `Ya pertenece a ${MINISTERIOS_009.bienvenida}` })).toBeVisible();
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
      await expect(page.getByRole('alertdialog')).toContainText(`Esta persona ya pertenece al Ministerio ${MINISTERIOS_009.bienvenida}. ¿Confirmás el cambio?`);
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Sí, confirmar el cambio' }).click();
      await expect(page.getByText('Aprobada', { exact: true })).toBeVisible();
      expect(await estadoDe(EMAILS_009.cambio)).toMatchObject({ estado: 'miembro', membresia: { ministerio: { nombre: MINISTERIOS_009.mesa } } });
    });

    test('rechazar con motivo: queda en el backoffice, la Persona ve que no avanzó sin el motivo; el Pastor ve sin acciones (FR-014, FR-019, FR-023)', async ({ page }) => {
      await prepararSinPostulacion(EMAILS_009.postulante);
      const mesa = await ministerioPorNombre(MINISTERIOS_009.mesa);
      const id = await postularComo(EMAILS_009.postulante, mesa.id);

      await loguearseComoPastorE2E(page);
      await page.goto(`/solicitudes/postulacion/${id}`);
      await expect(page.getByText('Ves esta postulación en modo lectura.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
      await sinViolaciones(page);

      await page.context().clearCookies(); // otra sesión: la del Pastor no se pisa sola
      await loguearseComoAdminE2E(page);
      await page.goto(`/solicitudes/postulacion/${id}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByLabel('Motivo (opcional, solo lo ve el equipo)').fill('Hoy el equipo está completo');
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Sí, rechazar' }).click();
      await expect(page.getByText('Rechazada', { exact: true })).toBeVisible();
      await expect(page.getByText('Motivo del rechazo (interno, la Persona no lo ve): Hoy el equipo está completo')).toBeVisible();

      const estado = await estadoDe(EMAILS_009.postulante);
      expect(estado).toMatchObject({ estado: 'puede_postularse', ultimo: { tipo: 'rechazada' } });
      expect(JSON.stringify(estado)).not.toContain('completo');
    });
  });
}
