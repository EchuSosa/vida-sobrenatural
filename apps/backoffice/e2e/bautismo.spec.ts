import type { Page } from '@playwright/test';
import { test, expect, apiComo, auditar, crearAxeBuilder, crearPersona, EMAIL_ADMIN, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { crearEventoDeBautismo, estadoDeBautismo, personaConPedido } from './helpers-010';

/**
 * spec 010, T030, T038, T051 y T059 (Historias 2, 3, 5 y 7; SC-002, SC-003,
 * SC-007): el Admin revisa un pedido de bautismo desde su detalle, suma
 * aceptadas a un Evento de bautismo desde la sección del Evento, confirma
 * quiénes se bautizaron en un Evento pasado (sembrado por
 * `sembrar-e2e/010-bautismo.ts`) y habilita o pide en nombre de alguien desde
 * su Perfil. El Pastor ve sin acciones. Axe en claro y oscuro.
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

    test('detalle: aceptar sin fecha (la Persona queda esperando fecha) y rechazar con motivo', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const a = await personaConPedido(sufijo, 'Lucia');
      const r = await personaConPedido(sufijo, 'Martin');
      await loguearseComoAdminE2E(page);

      await page.goto(`/solicitudes/bautismo/${a.solicitudId}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Bautismo de Lucia ${a.apellido}`);
      await expect(page.getByText('Quiere bautizarse con su familia')).toBeVisible();
      await expect(page.getByText('el pedido lo creó el equipo en su nombre')).toBeVisible();
      // D229: el talle que se eligió al pedir; el Admin lo corrige desde acá.
      await expect(page.getByTestId('talle-remera')).toHaveText('L');
      await page.getByLabel('Cambiar el talle').selectOption('XL');
      await page.getByRole('button', { name: 'Guardar talle' }).click();
      await expect(page.getByTestId('talle-remera')).toHaveText('XL');
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Sí, aceptar' }).click();
      await expect(page.getByText('Aceptada', { exact: true })).toBeVisible();
      await expect(page.getByText('Esperando fecha: todavía no está en ningún Evento de bautismo.')).toBeVisible();
      expect((await estadoDeBautismo(a.email)).estado).toBe('esperando_fecha');

      await page.goto(`/solicitudes/bautismo/${r.solicitudId}`);
      await page.getByRole('button', { name: 'Rechazar', exact: true }).click();
      await page.getByLabel('Motivo (opcional, solo para el equipo)').fill('Primero charlarlo con su Discipuladora');
      await page.getByRole('button', { name: 'Sí, rechazar' }).click();
      await expect(page.getByText('Rechazada', { exact: true })).toBeVisible();
      await expect(page.getByText('Primero charlarlo con su Discipuladora')).toBeVisible();
      // Sin Vida Nueva ni habilitación (la creó el Admin en su nombre), vuelve a "no habilitada"; nunca ve el motivo.
      expect(JSON.stringify(await estadoDeBautismo(r.email))).not.toContain('Discipuladora');

      // La bandeja filtrada por Bautismo las lista con su tipo escrito.
      await page.goto(`/solicitudes?tipo=bautismo&filtro=todas&q=${encodeURIComponent(a.apellido)}`);
      await expect(page.getByRole('link', { name: new RegExp(`Lucia ${a.apellido}`) }).first()).toBeVisible();
      await sinViolaciones(page);
    });

    test('Evento de bautismo: sumar aceptadas de a varias y quitar a una; sin QR ni lista genérica de inscriptos', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const evento = await crearEventoDeBautismo();
      const uno = await personaConPedido(sufijo, 'Julieta', true);
      const dos = await personaConPedido(sufijo, 'Ramiro', true);
      await loguearseComoAdminE2E(page);
      await page.goto(`/eventos/${evento.id}`);
      const seccion = page.getByRole('region', { name: 'Bautismo', exact: true });
      await expect(seccion).toBeVisible();
      await expect(page.getByRole('region', { name: 'Inscriptos', exact: true })).toHaveCount(0);
      await expect(page.getByRole('img', { name: /QR/i })).toHaveCount(0);
      await expect(seccion.getByText('Todavía no hay nadie asignado')).toBeVisible();
      // Solo la sección: en oscuro, el "Eliminar" de la 011 (outline + text-destructive) da 3.9:1
      // mientras el Evento no tiene inscripciones (anotado en el PR como cruce con la 011).
      await page.waitForLoadState('networkidle');
      const soloSeccion = await crearAxeBuilder(page).include('#bautismo').analyze();
      expect(soloSeccion.violations, JSON.stringify(soloSeccion.violations, null, 2)).toEqual([]);

      await seccion.getByRole('checkbox', { name: new RegExp(`Julieta ${uno.apellido}`) }).check();
      await seccion.getByRole('checkbox', { name: new RegExp(`Ramiro ${dos.apellido}`) }).check();
      await seccion.getByRole('button', { name: 'Sumar al bautismo (2)' }).click();
      await expect(seccion.getByRole('status')).toContainText('Se sumaron 2 personas');
      await expect(seccion.getByRole('link', { name: `Julieta ${uno.apellido}` })).toBeVisible();
      expect((await estadoDeBautismo(uno.email)).estado).toBe('con_fecha');
      // D229: el resumen de talles para comprar las remeras (las dos pidieron L).
      await expect(seccion.getByTestId('resumen-talles')).toHaveText(/Remeras:\s*L: 2$/);
      await sinViolaciones(page);

      await seccion.getByRole('button', { name: `Quitar Ramiro ${dos.apellido}` }).click();
      await page.getByRole('button', { name: 'Sí, quitar' }).click();
      await expect(seccion.getByRole('checkbox', { name: new RegExp(`Ramiro ${dos.apellido}`) })).toBeVisible();
      expect((await estadoDeBautismo(dos.email)).estado).toBe('esperando_fecha');
      await expect(seccion.getByTestId('resumen-talles')).toHaveText(/Remeras:\s*L: 1$/);
    });

    test('Perfil: habilitar el bautismo y pedirlo en nombre de alguien', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      const persona = await crearPersona(`e2e-bautismo-perfil-${sufijo}@example.com`, { nombre: 'Elena', apellido: `Perfil${sufijo}` });
      await loguearseComoAdminE2E(page);
      await page.goto(`/personas/${persona.id}`);
      const seccion = page.getByRole('region', { name: 'Bautismo', exact: true });
      await expect(seccion).toContainText('No tiene Vida Nueva en curso ni completada.');
      await seccion.getByRole('button', { name: 'Habilitar el bautismo' }).click();
      await sinViolaciones(page);
      await page.getByRole('button', { name: 'Sí, habilitar' }).click();
      await expect(seccion).toContainText('Bautismo habilitado por');
      expect((await estadoDeBautismo(persona.email)).estado).toBe('puede_pedir');

      await seccion.getByRole('button', { name: 'Pedir el bautismo en su nombre' }).click();
      // D229: el talle es obligatorio — sin elegirlo, error en el campo y resumen arriba (H-50).
      const dialogo = page.getByRole('alertdialog');
      await dialogo.getByRole('button', { name: 'Sí, pedirlo' }).click();
      await expect(dialogo.getByRole('link', { name: 'Elegí un talle de remera de la lista.' })).toBeVisible();
      await expect(dialogo.getByLabel('¿Qué talle de remera usa?')).toHaveAttribute('aria-invalid', 'true');
      await sinViolaciones(page);
      await dialogo.getByLabel('¿Qué talle de remera usa?').selectOption('S');
      await dialogo.getByRole('button', { name: 'Sí, pedirlo' }).click();
      await expect(seccion.getByRole('link', { name: 'Tiene un pedido de bautismo por revisar' })).toBeVisible();
      await sinViolaciones(page);
    });
  });
}

test('Evento pasado: confirmar quiénes se bautizaron, con uno destildado', async ({ page }) => {
  const evento = await apiComo<{ items: Array<{ id: string; nombre: string }> }>(EMAIL_ADMIN, 'GET', '/eventos?filtro=pasados&tipo=bautismo&take=100');
  const pasado = evento.items.find((e) => e.nombre === 'e2e-Bautismo pasado para confirmar');
  expect(pasado).toBeDefined();
  await loguearseComoAdminE2E(page);
  await page.goto(`/eventos/${pasado!.id}`);
  const seccion = page.getByRole('region', { name: 'Bautismo', exact: true });
  await expect(seccion.getByText('¿Quiénes se bautizaron?')).toBeVisible();
  await sinViolaciones(page);
  await seccion.getByRole('checkbox', { name: /Camila/ }).uncheck();
  await seccion.getByRole('button', { name: 'Confirmar bautismos (2)' }).click();
  await page.getByRole('button', { name: 'Sí, confirmar' }).click();
  await expect(seccion.getByText('se bautizó')).toHaveCount(2);
  expect((await estadoDeBautismo('e2e-bautismo-confirmar-1@example.com')).estado).toBe('bautizada');
  expect((await estadoDeBautismo('e2e-bautismo-confirmar-3@example.com')).estado).toBe('esperando_fecha');
});

test('el Pastor ve el detalle y la sección del Evento sin acciones', async ({ page }) => {
  const sufijo = `pastor${Date.now()}`;
  const p = await personaConPedido(sufijo, 'Sofia');
  const evento = await crearEventoDeBautismo();
  await loguearseComoPastorE2E(page);
  await page.goto(`/solicitudes/bautismo/${p.solicitudId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Bautismo de Sofia ${p.apellido}`);
  await expect(page.getByRole('button', { name: 'Aceptar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
  await page.goto(`/eventos/${evento.id}`);
  await expect(page.getByRole('region', { name: 'Bautismo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sumar al bautismo/ })).toHaveCount(0);
});
