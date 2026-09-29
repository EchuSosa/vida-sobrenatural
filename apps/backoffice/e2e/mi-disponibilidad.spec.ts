import type { Page } from '@playwright/test';
import { hoyEnArgentina, type MiDisponibilidad } from '@vida-sobrenatural/shared-types';
import { test, expect, auditar, loguearseComoDiscipuladorE2E } from './helpers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Deja al Discipulador "sin agenda" como lo siembra sembrar-e2e-admin.ts: sin
 * franjas, sin períodos, toggle apagado y máximo 1 — antes (el test corre en
 * dos temas y en dos proyectos, siempre sobre la misma Persona) y después
 * (otros specs la usan para el vacío de FR-047). Por la API, con su sesión.
 */
async function reiniciarDisponibilidad(page: Page) {
  const { apiToken } = await (await page.request.get('/api/auth/session')).json();
  const headers = { Authorization: `Bearer ${apiToken}` };
  const actual: MiDisponibilidad = await (await page.request.get(`${API_BASE_URL}/disponibilidad/me`, { headers })).json();
  for (const f of actual.franjas) await page.request.delete(`${API_BASE_URL}/disponibilidad/me/franjas/${f.id}`, { headers });
  for (const b of actual.bloqueos) await page.request.delete(`${API_BASE_URL}/disponibilidad/me/bloqueos/${b.id}`, { headers });
  await page.request.put(`${API_BASE_URL}/disponibilidad/me`, { headers, data: { disponible: false, maxPersonasPorGrupo: 1 } });
}

async function sinViolaciones(page: Page) {
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function agregarFranja(page: Page, dia: string, desde: string, hasta: string) {
  await page.getByLabel('Día', { exact: true }).selectOption({ label: dia });
  await page.getByLabel('Desde', { exact: true }).first().fill(desde);
  await page.getByLabel('Hasta', { exact: true }).first().fill(hasta);
  await page.getByRole('button', { name: 'Agregar franja' }).click();
}

/**
 * specs/004, T040 (Historia 4, FR-015/FR-016/FR-017/FR-031/FR-045/FR-047): el
 * Discipulador maneja su disponibilidad desde el teléfono (`@celular`: corre
 * también en el proyecto `celular`), en los dos temas, con axe.
 *
 * TODO(merge): falta el paso "como Admin, aparece en el cruce de una
 * Solicitud con esa franja (por API)" — `GET /discipulado/solicitudes/:id/cruce`
 * es del lote A y no existe en esta rama. El reflejo en el cruce ya lo
 * prueba la integración (disponibilidad.integration-spec.ts, contra
 * `CruceService.disponibles`); después del merge, sumar acá la llamada al
 * endpoint después de prender el toggle y de borrar la franja.
 */
/**
 * T041 (docs/15, "Celular"): con horarios y un período cargados —el estado más
 * ancho de la pantalla—, a 320 px no hay scroll horizontal y cada control
 * táctil mide al menos 44×44 px (D81).
 */
test.describe('a 320 px, con datos cargados', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test.beforeEach(async ({ page }) => {
    await loguearseComoDiscipuladorE2E(page, 'sin-agenda');
    await reiniciarDisponibilidad(page);
    const { apiToken } = await (await page.request.get('/api/auth/session')).json();
    const headers = { Authorization: `Bearer ${apiToken}` };
    const hoy = hoyEnArgentina();
    await page.request.post(`${API_BASE_URL}/disponibilidad/me/franjas`, { headers, data: { diaSemana: 3, inicio: 19 * 60, fin: 21 * 60 } });
    await page.request.post(`${API_BASE_URL}/disponibilidad/me/bloqueos`, { headers, data: { desde: hoy, hasta: sumarDias(hoy, 30) } });
  });

  test.afterEach(async ({ page }) => {
    await reiniciarDisponibilidad(page);
  });

  test('sin scroll horizontal y con objetivos táctiles de 44 px @celular', async ({ page }) => {
    await page.goto('/mi-disponibilidad');
    await expect(page.getByText('Vigente hoy')).toBeVisible();
    const sinDesborde = await page.evaluate(() => document.scrollingElement!.scrollWidth <= window.innerWidth);
    expect(sinDesborde, 'hay scroll horizontal a 320 px').toBe(true);

    const chicos = await page.locator('#contenido').evaluate((contenido) =>
      [...contenido.querySelectorAll<HTMLElement>('button, select, input')]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => ({ el: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 30)}"`, ...el.getBoundingClientRect().toJSON() }))
        .filter((r) => r.height < 44 || r.width < 44)
        .map((r) => `${r.el}: ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(chicos).toEqual([]);
  });
});

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await loguearseComoDiscipuladorE2E(page, 'sin-agenda');
      await reiniciarDisponibilidad(page);
    });

    test.afterEach(async ({ page }) => {
      await reiniciarDisponibilidad(page);
    });

    test('agenda, toggle, períodos y máximo, con la frase de arriba siempre al día @celular', async ({ page }) => {
      const estado = page.getByTestId('estado-disponibilidad');
      await page.goto('/mi-disponibilidad');

      // FR-047: sin agenda, el vacío dice por qué no aparece.
      await expect(page.getByRole('heading', { name: 'Mi disponibilidad', level: 1 })).toBeVisible();
      await expect(estado).toContainText('hasta que no cargues tus horarios no aparecés para nuevos discipulados');
      await expect(page.getByTestId('estado-toggle')).toContainText('Apagada');
      await sinViolaciones(page);

      // Cargar una franja no prende el toggle (FR-015).
      await agregarFranja(page, 'Martes', '19:00', '21:00');
      await expect(page.getByText('Martes 19:00 a 21:00')).toBeVisible();
      await expect(estado).toContainText('Ya tenés horarios: prendé tu disponibilidad para aparecer.');
      await expect(page.getByTestId('estado-toggle')).toContainText('Apagada');

      await page.getByRole('button', { name: 'Prender mi disponibilidad' }).click();
      await expect(estado).toContainText('Hoy el Admin te ve como disponible');
      await sinViolaciones(page);

      // Borrar la franja, con confirmación: vuelve a "sin agenda", el toggle sigue prendido.
      await page.getByRole('button', { name: 'Quitar' }).click();
      const confirmar = page.getByRole('alertdialog');
      await expect(confirmar).toContainText('¿Quitar el horario del Martes 19:00 a 21:00?');
      await sinViolaciones(page);
      await confirmar.getByRole('button', { name: 'Sí, quitar el horario' }).click();
      await expect(estado).toContainText('Todavía no cargaste horarios');
      await expect(page.getByTestId('estado-toggle')).toContainText('Prendida');

      // Fin anterior al inicio: error debajo del campo y en el resumen, con foco.
      await agregarFranja(page, 'Jueves', '21:00', '19:00');
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeFocused();
      await expect(resumen).toContainText('La hora de fin tiene que ser posterior a la de inicio');
      await expect(page.locator('#campo-franja-error')).toContainText('La hora de fin tiene que ser posterior a la de inicio');
      await expect(page.locator('#campo-franja-hasta')).toHaveAttribute('aria-invalid', 'true');
      await sinViolaciones(page);

      // Corregido, se agrega y el resumen se va.
      await page.getByLabel('Hasta', { exact: true }).first().fill('22:00');
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await expect(page.getByText('Jueves 21:00 a 22:00')).toBeVisible();
      await expect(resumen).toHaveCount(0);
      await expect(estado).toContainText('Hoy el Admin te ve como disponible');

      // Apagar el toggle: deja de aparecer.
      await page.getByRole('button', { name: 'Apagar mi disponibilidad' }).click();
      await expect(estado).toContainText('prendé tu disponibilidad para aparecer');
      await page.getByRole('button', { name: 'Prender mi disponibilidad' }).click();
      await expect(estado).toContainText('Hoy el Admin te ve como disponible');

      // Un período que cubre hoy: no aparece; borrarlo lo devuelve.
      const hoy = hoyEnArgentina();
      await page.getByLabel('Desde', { exact: true }).last().fill(hoy);
      await page.getByLabel('Hasta', { exact: true }).last().fill(sumarDias(hoy, 3));
      await page.getByRole('button', { name: 'Agregar período' }).click();
      await expect(estado).toContainText('Hoy no aparecés, por tu período del');
      await expect(page.getByText('Vigente hoy')).toBeVisible();
      await sinViolaciones(page);
      await page.getByRole('button', { name: /^Borrar: Del / }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, borrar el período' }).click();
      await expect(estado).toContainText('Hoy el Admin te ve como disponible');
      await expect(page.getByText('No tenés períodos cargados.')).toBeVisible();

      // Un período que ya terminó: error por campo, sin llegar a guardarse.
      await page.getByLabel('Desde', { exact: true }).last().fill(sumarDias(hoy, -5));
      const hastaPeriodo = page.getByLabel('Hasta', { exact: true }).last();
      await hastaPeriodo.fill(sumarDias(hoy, -1));
      // Al salir del campo ya avisa debajo (validación al salir, H-72), sin resumen todavía. (Tab
      // no sirve: en un campo de fecha recorre día, mes y año antes de salir.)
      await hastaPeriodo.blur();
      await expect(page.locator('#error-hasta')).toContainText('Ese período ya terminó');
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá estos campos:' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Agregar período' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Ese período ya terminó' })).toBeFocused();
      await expect(page.locator('#error-hasta')).toContainText('Ese período ya terminó');

      // Máximo por Grupo: sube a 3 y queda guardado.
      await page.getByLabel('Personas por grupo', { exact: true }).selectOption('3');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Listo: hasta 3 personas por grupo.')).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Personas por grupo', { exact: true })).toHaveValue('3');
      await sinViolaciones(page);
    });
  });
}
