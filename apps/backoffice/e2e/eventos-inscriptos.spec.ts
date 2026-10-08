import { test, expect, auditar, crearPersona, loguearseComoAdminE2E } from './helpers';
import { anotarEnNombre, crearEventoPorApi, subirComprobantePorApi } from './helpers-011';

/**
 * spec 011, T070, T077 y el resto de T039 — inscriptos y pagos desde el
 * backoffice, con axe en claro y oscuro: aprobar en lote con resumen,
 * rechazar y ver la promoción, anotar a una Persona con su nombre visible,
 * dar de baja; verificar y rechazar un pago desde la bandeja (se libera el
 * lugar), registrar un pago en efectivo; "Eliminar" deshabilitado con
 * inscripciones (FR-025 a FR-027, FR-032 a FR-036, FR-042).
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('aprobar en lote, rechazar con promoción, anotar a una Persona y dar de baja', async ({ page }) => {
      // Arma su escenario por la API (varias Personas e inscripciones): más que los 30 s por defecto en CI.
      test.setTimeout(120_000);
      const sufijo = `${colorScheme}-${Date.now()}`;
      const evento = await crearEventoPorApi({ nombre: `e2e-evento-insc-${sufijo}`, cupo: 2, permiteListaEspera: true, requiereAprobacion: true });
      const personas = await Promise.all(
        ['Ana', 'Beto', 'Carla'].map((n, i) => crearPersona(`e2e-insc-${i}-${sufijo}@example.com`, { nombre: n, apellido: `Insc${sufijo}` })),
      );
      for (const p of personas) await anotarEnNombre(evento.id, p.id);

      await loguearseComoAdminE2E(page);
      await page.goto(`/eventos/${evento.id}`);
      await page.waitForLoadState('networkidle');
      const seccion = page.locator('#inscriptos');
      await expect(seccion.getByRole('link', { name: /Por aprobar \(2\)/ })).toHaveAttribute('aria-current', 'page');
      // "Eliminar" deshabilitado y explicado: tiene inscripciones (FR-042).
      await expect(page.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
      await expect(page.getByText('No se puede eliminar porque ya tiene inscripciones', { exact: false })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      // Rechazar a Ana: se libera el lugar y Carla pasa de la lista a "por aprobar".
      await seccion.getByRole('row').filter({ hasText: 'Ana' }).getByRole('button', { name: 'Rechazar' }).click();
      const dialogo = page.getByRole('alertdialog', { name: /¿Rechazar la inscripción de Ana/ });
      await dialogo.getByLabel('Motivo (opcional)').fill('Es solo para jóvenes');
      await dialogo.getByRole('button', { name: 'Sí, rechazar' }).click();
      await expect(page.getByText('Inscripción rechazada.')).toBeVisible();
      await expect(seccion.getByRole('row').filter({ hasText: 'Carla' })).toBeVisible();
      await expect(seccion.getByRole('row').filter({ hasText: 'Carla' }).getByText('Subió desde la lista de espera')).toBeVisible();

      // Aprobar en lote a Beto y Carla.
      await seccion.getByRole('button', { name: 'Elegir todas' }).click();
      await seccion.getByRole('button', { name: 'Aprobar seleccionadas (2)' }).click();
      await expect(page.getByText('Se aprobaron 2.')).toBeVisible();

      // Dar de baja a Beto (neutro) desde Confirmadas.
      await seccion.getByRole('link', { name: /Confirmadas/ }).click();
      await page.waitForLoadState('networkidle');
      await seccion.getByRole('row').filter({ hasText: 'Beto' }).getByRole('button', { name: 'Dar de baja' }).click();
      await expect(page.locator('[data-tono="neutro"]')).toHaveCount(1);
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, dar de baja' }).click();
      await expect(page.getByText('Inscripción dada de baja.')).toBeVisible();

      // Anotar a una Persona sin acceso: su nombre a la vista durante toda la acción.
      await crearPersona(`e2e-insc-nueva-${sufijo}@example.com`, { nombre: 'Dora', apellido: `Insc${sufijo}` });
      await seccion.getByRole('button', { name: 'Anotar a una Persona' }).click();
      const panel = page.getByRole('dialog');
      await panel.getByLabel('Buscar por nombre').fill(`Insc${sufijo}`);
      await panel.getByRole('button', { name: new RegExp(`Dora Insc${sufijo}`) }).click();
      await expect(panel.getByText(`Estás anotando a Dora Insc${sufijo}`).first()).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await panel.getByRole('button', { name: 'Anotar', exact: true }).click();
      await expect(page.getByText(`Dora Insc${sufijo} quedó anotada`, { exact: false })).toBeVisible();
    });

    test('verificar y rechazar pagos desde la bandeja; registrar un pago en efectivo', async ({ page }) => {
      // Arma su escenario por la API (varias Personas e inscripciones): más que los 30 s por defecto en CI.
      test.setTimeout(120_000);
      const sufijo = `${colorScheme}-${Date.now()}`;
      const evento = await crearEventoPorApi({ nombre: `e2e-evento-pago-${sufijo}`, cupo: 2, permiteListaEspera: true, costo: '15000', instruccionesPago: 'Alias VS' });
      const [ana, beto, carla] = await Promise.all(
        ['Ana', 'Beto', 'Carla'].map((n, i) => crearPersona(`e2e-pago-${i}-${sufijo}@example.com`, { nombre: n, apellido: `Pago${sufijo}` })),
      );
      const insAna = await anotarEnNombre(evento.id, ana.id);
      const insBeto = await anotarEnNombre(evento.id, beto.id);
      await anotarEnNombre(evento.id, carla.id);
      const pagoAna = await subirComprobantePorApi(ana.email, insAna.id);
      const pagoBeto = await subirComprobantePorApi(beto.email, insBeto.id);

      await loguearseComoAdminE2E(page);
      await page.goto('/solicitudes?tipo=pago');
      await page.waitForLoadState('networkidle');
      await page.goto(`/solicitudes/pago/${pagoAna.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: `Pago de Ana Pago${sufijo}` })).toBeVisible();
      await expect(page.locator('object[type="application/pdf"]')).toBeVisible();
      const comprobante = await page.request.get(`/api/comprobantes/${pagoAna.id}`);
      expect(comprobante.headers()['content-type']).toContain('application/pdf');
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Verificar pago' }).click();
      await expect(page.getByText('Pago verificado.')).toBeVisible();

      await page.goto(`/solicitudes/pago/${pagoBeto.id}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Rechazar pago' }).click();
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByRole('button', { name: 'Sí, rechazar el pago' }).click();
      await expect(dialogo.getByText('Escribí el motivo para que la Persona sepa qué corregir.')).toBeVisible();
      await dialogo.getByLabel('Motivo', { exact: true }).fill('No se ve el monto');
      await dialogo.getByRole('button', { name: 'Sí, rechazar el pago' }).click();
      await expect(page.getByText('Pago rechazado. Se liberó el lugar.')).toBeVisible();

      // Carla pasó de la lista a confirmada; Beto quedó cancelada.
      await page.goto(`/eventos/${evento.id}?estado=confirmada`);
      await page.waitForLoadState('networkidle');
      const seccion = page.locator('#inscriptos');
      await expect(seccion.getByRole('row').filter({ hasText: 'Carla' })).toBeVisible();
      await expect(seccion.getByRole('row').filter({ hasText: 'Beto' })).toHaveCount(0);

      // Registrar un pago en efectivo en nombre de Carla.
      await seccion.getByRole('row').filter({ hasText: 'Carla' }).getByRole('button', { name: 'Registrar pago' }).click();
      const panel = page.getByRole('dialog');
      await expect(panel.getByRole('heading', { name: `Registrar un pago de Carla Pago${sufijo}` })).toBeVisible();
      await panel.getByRole('button', { name: 'Registrar pago' }).click();
      await expect(page.getByText('Pago registrado.')).toBeVisible();
      await expect(seccion.getByRole('row').filter({ hasText: 'Carla' }).getByText('Pago verificado')).toBeVisible();
    });
  });
}
