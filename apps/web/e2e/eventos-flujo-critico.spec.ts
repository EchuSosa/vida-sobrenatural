import { test, expect, auditar, loguearseComoTest } from './helpers';
import { api, tokenDe } from './helpers-006';
import { crearEventoComoAdmin, crearPersonaActiva, EMAIL_ADMIN_E2E } from './helpers-011';

/**
 * spec 011, T082 (SC-006, SC-007) — el flujo crítico completo en celular: el
 * Admin crea un Evento con cupo 1, lista y costo → A se anota → B queda en la
 * lista → A cancela → B pasa a confirmada → B sube el comprobante → el Admin
 * lo verifica → B ve "Pago verificado". Axe en cada pantalla de la Persona.
 */
test('anotarse, lista de espera, cancelar, promoción, comprobante y verificación @celular', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const sufijo = Date.now();
  const evento = await crearEventoComoAdmin(baseURL!, {
    nombre: `e2e-flujo-${sufijo}`,
    requiereInscripcion: true,
    cupo: 1,
    permiteListaEspera: true,
    costo: '15000',
    instruccionesPago: 'Alias VIDA.SOBRENATURAL',
  });
  const a = `e2e-flujo-a-${sufijo}@example.com`;
  const b = `e2e-flujo-b-${sufijo}@example.com`;
  await crearPersonaActiva(baseURL!, a, 'Ana');
  await crearPersonaActiva(baseURL!, b, 'Bea');

  // A se anota: confirmada, con el pago pendiente.
  await loguearseComoTest(page, a);
  await page.goto(`/eventos/${evento.slug}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, anotarme' }).click();
  await expect(page.getByText('Estás anotada')).toBeVisible();
  await expect(page.getByText('Falta el pago')).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);

  // B queda en la lista.
  await loguearseComoTest(page, b);
  await page.goto(`/eventos/${evento.slug}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Anotarme en la lista de espera' }).click();
  await page.getByRole('button', { name: 'Sí, anotarme' }).click();
  await expect(page.getByText('Lugar 1 en la lista de espera')).toBeVisible();

  // A cancela desde Mis eventos.
  await loguearseComoTest(page, a);
  await page.goto('/mis-eventos');
  await page.waitForLoadState('networkidle');
  expect((await auditar(page)).violations).toEqual([]);
  await page.getByRole('article').filter({ hasText: evento.nombre }).getByRole('button', { name: 'Cancelar inscripción' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar inscripción' }).click();
  await expect(page.getByText('Cancelaste tu inscripción.').first()).toBeVisible();

  // B pasó a confirmada y sube el comprobante.
  await loguearseComoTest(page, b);
  await page.goto('/mis-eventos');
  await page.waitForLoadState('networkidle');
  const tarjeta = page.getByRole('article').filter({ hasText: evento.nombre });
  await expect(tarjeta.getByText('Estás anotada')).toBeVisible();
  await tarjeta.getByRole('button', { name: 'Subir el comprobante' }).click();
  const panel = page.getByRole('dialog', { name: 'Subir el comprobante de pago' });
  await panel.getByLabel('Comprobante').setInputFiles({ name: 'comprobante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  expect((await auditar(page)).violations).toEqual([]);
  await panel.getByRole('button', { name: 'Enviar comprobante' }).click();
  await expect(page.getByText('Recibimos tu comprobante. El equipo lo revisa y te avisamos.')).toBeVisible();
  await expect(tarjeta.getByText('Pago en revisión')).toBeVisible();

  // El Admin lo verifica (lo prueba en pantalla el e2e del backoffice).
  const admin = await tokenDe(baseURL!, EMAIL_ADMIN_E2E);
  const pagos = await api(admin, 'GET', `/pagos?eventoId=${evento.id}`);
  await api(admin, 'POST', `/pagos/${pagos.items[0].id}/verificar`);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('article').filter({ hasText: evento.nombre }).getByText('Pago verificado')).toBeVisible();
  expect((await auditar(page)).violations).toEqual([]);
});
