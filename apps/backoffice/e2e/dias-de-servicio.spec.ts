import type { Page } from '@playwright/test';
import { fechasDeServicio, formatearDiaDeServicio, hoyEnArgentina, type DiasDeServicioDelMinisterio } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E, EMAIL_ADMIN } from './helpers';
import { MINISTERIOS_009, ministerioPorNombre } from './helpers-009';
import { CONSOLA_500, TEXTO_ERROR_INTERNO, apiCaida, contarPedidos, tresClics } from '../../../scripts/e2e-casos-infelices';

/**
 * spec 017, US1 (T009; D250, D251, D253): los días de servicio de un Ministerio y cuánta gente
 * hace falta por fecha, desde el detalle del Ministerio. Se trabaja sobre e2e-Bienvenida (dos
 * áreas, del 009) y e2e-Mesa de entrada (sin áreas); cada test arranca y termina con los dos sin
 * días cargados, sin fechas suspendidas y con cupo 1 (`dejarLimpio`, por la API).
 */
async function dejarLimpio(nombre: string) {
  const { id } = await ministerioPorNombre(nombre);
  const ruta = `/ministerios/${id}`;
  const vista = await apiComo<DiasDeServicioDelMinisterio>(EMAIL_ADMIN, 'GET', `${ruta}/dias-de-servicio`);
  for (const p of vista.proximas.filter((x) => x.estado === 'suspendida')) await apiComo(EMAIL_ADMIN, 'DELETE', `${ruta}/fechas/${p.dia}/suspension`);
  for (const r of vista.reglas) await apiComo(EMAIL_ADMIN, 'DELETE', `${ruta}/dias-de-servicio/${r.id}`);
  for (const c of vista.celulas) await apiComo(EMAIL_ADMIN, 'PATCH', `/celulas/${c.id}/cupo-turno`, { cupo: 1 });
  await apiComo(EMAIL_ADMIN, 'PATCH', `${ruta}/cupo-turno`, { cupo: 1 });
  return id;
}

async function irAlMinisterio(page: Page, nombre: string) {
  await page.goto('/ministerios');
  await page.getByRole('link', { name: nombre, exact: true }).click();
  return page.getByRole('region', { name: 'Días de servicio' });
}

async function sinViolaciones(page: Page) {
  expect((await auditar(page)).violations).toEqual([]);
}

const PRIMER_DOMINGO = () => formatearDiaDeServicio(fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina())[0], 'es');

test.afterEach(async () => {
  await dejarLimpio(MINISTERIOS_009.bienvenida);
  await dejarLimpio(MINISTERIOS_009.mesa);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await dejarLimpio(MINISTERIOS_009.bienvenida);
      await dejarLimpio(MINISTERIOS_009.mesa);
    });

    test('⭐ el Admin carga "todos los domingos", ve las próximas fechas, suspende una, fija el cupo y quita el día', async ({ page }) => {
      test.slow();
      await loguearseComoAdminE2E(page);
      const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);
      await expect(seccion.getByText('Todavía no tiene días de servicio')).toBeVisible();
      await expect(seccion.getByText('Cuando cargues un día de servicio, acá aparecen las próximas fechas.')).toBeVisible();
      await sinViolaciones(page);

      await seccion.getByLabel('Cada cuánto').selectOption('semanal');
      await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'domingo' });
      await seccion.getByRole('button', { name: 'Agregar día' }).click();
      await expect(page.getByText('Listo: se agregó «Todos los domingos».')).toBeVisible();
      await expect(seccion.getByText('Todos los domingos', { exact: true })).toBeVisible();

      // Las próximas fechas, con su estado en texto (D81), no solo en color.
      const primera = seccion.getByRole('listitem').filter({ hasText: PRIMER_DOMINGO() });
      await expect(primera).toContainText('En armado');
      await expect(primera).toContainText('Sin turnos asignados');
      await sinViolaciones(page);

      // "Este día no hay": con confirmación, y se puede volver atrás.
      await primera.getByRole('button', { name: `Este día no hay: ${PRIMER_DOMINGO()}` }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText(`¿El ${PRIMER_DOMINGO()} no hay servicio?`);
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Sí, ese día no hay' }).click();
      await expect(primera).toContainText('Este día no hay');
      await primera.getByRole('button', { name: `Volver a habilitar: ${PRIMER_DOMINGO()}` }).click();
      await expect(primera).toContainText('En armado');

      // Cupo por área.
      await seccion.getByLabel('Personas por fecha en Seguridad').fill('2');
      await seccion.getByLabel('Personas por fecha en Seguridad').locator('xpath=ancestor::form').getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Listo: Seguridad necesita 2 por fecha.')).toBeVisible();
      await page.reload();
      await expect(seccion.getByLabel('Personas por fecha en Seguridad')).toHaveValue('2');

      // Quitar: confirmación neutra.
      await seccion.getByRole('button', { name: 'Quitar: Todos los domingos' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar' }).click();
      await expect(seccion.getByText('Todavía no tiene días de servicio')).toBeVisible();
    });

    test('un Ministerio sin áreas tiene un solo cupo; una regla mensual pide qué vez del mes', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      const seccion = await irAlMinisterio(page, MINISTERIOS_009.mesa);
      await expect(seccion.getByLabel('Personas por fecha en Todo el Ministerio (no tiene áreas)')).toHaveValue('1');

      await seccion.getByLabel('Cada cuánto').selectOption('mensual');
      await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'domingo' });
      await seccion.getByRole('button', { name: 'Agregar día' }).click();
      // Falta "qué vez del mes": error en el campo, resumen arriba con foco (H-50).
      const resumen = seccion.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole('link', { name: /Elegí qué vez del mes/ })).toBeVisible();
      await expect(seccion.getByLabel('Qué vez del mes')).toHaveAttribute('aria-invalid', 'true');
      await sinViolaciones(page);

      await seccion.getByLabel('Qué vez del mes').selectOption({ label: 'segundo' });
      await seccion.getByRole('button', { name: 'Agregar día' }).click();
      await expect(seccion.getByText('El segundo domingo de cada mes', { exact: true })).toBeVisible();
    });
  });
}

test('validación por campo: el formulario vacío, el día repetido (lo dice la API) y un cupo fuera de rango', async ({ page, permitirErrorDeConsola }) => {
  // El 409 del día repetido es la respuesta esperada de la API (la consola del navegador lo anota).
  permitirErrorDeConsola(/the server responded with a status of 409/);
  await loguearseComoAdminE2E(page);
  const id = (await ministerioPorNombre(MINISTERIOS_009.bienvenida)).id;
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/dias-de-servicio`, { frecuencia: 'semanal', diaSemana: 0 });
  const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);

  await seccion.getByRole('button', { name: 'Agregar día' }).click();
  await expect(page.locator('#campo-frecuencia-error')).toHaveText('Elegí si es todas las semanas o una vez por mes.');
  await expect(page.locator('#campo-diaSemana-error')).toHaveText('Elegí un día de la semana de la lista.');

  await seccion.getByLabel('Cada cuánto').selectOption('semanal');
  await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'domingo' });
  await seccion.getByRole('button', { name: 'Agregar día' }).click();
  await expect(page.locator('#campo-diaSemana-error')).toHaveText('Ese día ya está cargado. Elegí otro.');
  await expect(seccion.getByLabel('Día', { exact: true })).toHaveAttribute('aria-invalid', 'true');

  const cupo = seccion.getByLabel('Personas por fecha en Seguridad');
  await cupo.fill('25');
  await cupo.locator('xpath=ancestor::form').getByRole('button', { name: 'Guardar' }).click();
  await expect(cupo).toHaveAttribute('aria-invalid', 'true');
  await expect(seccion.getByText('Escribí un número de 1 a 20: cuántas personas hacen falta por fecha.')).toBeVisible();
  await expect(cupo).toBeFocused();
});

test('si la API falla al agregar un día, avisa, no queda cargado y se puede reintentar', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await loguearseComoAdminE2E(page);
  const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);
  const caida = await apiCaida(page, 'POST', /\/ministerios\/[^/]+\/dias-de-servicio$/);
  await seccion.getByLabel('Cada cuánto').selectOption('semanal');
  await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'sábado' });
  await seccion.getByRole('button', { name: 'Agregar día' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  expect(caida.intentos).toBe(1);
  await expect(seccion.getByText('Todavía no tiene días de servicio')).toBeVisible();
  await expect(seccion.getByRole('button', { name: 'Agregar día' })).toBeEnabled();
  // Lo elegido queda, para reintentar sin volver a cargar.
  await expect(seccion.getByLabel('Día', { exact: true })).toHaveValue('6');
});

test('tres toques en "Agregar día" mandan un solo pedido', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);
  const pedidos = contarPedidos(page, 'POST', /\/ministerios\/[^/]+\/dias-de-servicio$/);
  await seccion.getByLabel('Cada cuánto').selectOption('semanal');
  await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'sábado' });
  await tresClics(seccion.getByRole('button', { name: 'Agregar día' }));
  await expect(seccion.getByText('Todos los sábados', { exact: true })).toBeVisible();
  expect(pedidos.n).toBe(1);
  await expect(page.getByText('Ese día ya está cargado')).toHaveCount(0);
});

test('el Pastor ve los días y los cupos sin poder cambiarlos (D253)', async ({ page }) => {
  const id = (await ministerioPorNombre(MINISTERIOS_009.bienvenida)).id;
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/dias-de-servicio`, { frecuencia: 'semanal', diaSemana: 0 });
  await loguearseComoPastorE2E(page);
  const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);
  await expect(seccion.getByText('Todos los domingos', { exact: true })).toBeVisible();
  await expect(seccion.getByRole('listitem').filter({ hasText: PRIMER_DOMINGO() })).toContainText('En armado');
  await expect(seccion.getByRole('button')).toHaveCount(0);
  await expect(seccion.getByRole('combobox')).toHaveCount(0);
  await expect(seccion.getByRole('spinbutton')).toHaveCount(0);
  await sinViolaciones(page);
});

test.describe('en celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la sección entra en la pantalla y se carga un día con el teclado', async ({ page }) => {
    await loguearseComoAdminE2E(page);
    const seccion = await irAlMinisterio(page, MINISTERIOS_009.bienvenida);
    await seccion.getByLabel('Cada cuánto').focus();
    await page.keyboard.press('ArrowDown');
    await seccion.getByLabel('Día', { exact: true }).selectOption({ label: 'domingo' });
    await seccion.getByLabel('Cada cuánto').selectOption('semanal');
    await seccion.getByRole('button', { name: 'Agregar día' }).focus();
    await page.keyboard.press('Enter');
    await expect(seccion.getByText('Todos los domingos', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
