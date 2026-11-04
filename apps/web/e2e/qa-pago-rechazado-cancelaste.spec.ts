import { test, expect, loguearseComoTest } from './helpers';
import { api, tokenDe } from './helpers-006';
import { EMAIL_ADMIN_E2E, crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';

/**
 * QA ronda 2, BUG-15: cuando el equipo rechaza un pago, la inscripción se cancela y la página del
 * Evento le dice a la persona "Cancelaste tu inscripción", como si lo hubiera hecho ella, sin el
 * motivo. El motivo solo aparece en "Mis eventos".
 */
test('con el pago rechazado, la página del Evento no dice "Cancelaste" y muestra el motivo', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const sufijo = Date.now();
  const evento = await crearEventoComoAdmin(baseURL!, { nombre: `e2e-qa-pago-${sufijo}`, requiereInscripcion: true, cupo: 5, costo: '1000', instruccionesPago: 'Alias VIDA.SOBRENATURAL' });
  const email = `e2e-qa-pago-${sufijo}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Pía');

  await loguearseComoTest(page, email);
  await page.goto(`/eventos/${evento.slug}`);
  await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, anotarme' }).click();
  await expect(page.getByText('Falta el pago')).toBeVisible();
  await page.goto('/mis-eventos');
  const tarjeta = page.getByRole('article').filter({ hasText: evento.nombre });
  await tarjeta.getByRole('button', { name: 'Subir el comprobante' }).click();
  const panel = page.getByRole('dialog', { name: 'Subir el comprobante de pago' });
  await panel.getByLabel('Comprobante').setInputFiles({ name: 'comprobante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await panel.getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(page.getByText('Recibimos tu comprobante. El equipo lo revisa y te avisamos.')).toBeVisible();

  const admin = await tokenDe(baseURL!, EMAIL_ADMIN_E2E);
  const pagos = await api(admin, 'GET', `/pagos?eventoId=${evento.id}`);
  await api(admin, 'POST', `/pagos/${pagos.items[0].id}/rechazar`, { motivo: 'No se ve el monto' });

  await page.goto(`/eventos/${evento.slug}`);
  await expect(page.getByText('No se ve el monto')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Cancelaste tu inscripción')).toHaveCount(0);
});
