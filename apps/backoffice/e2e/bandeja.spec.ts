import type { Page } from '@playwright/test';
import {
  test,
  expect,
  auditar,
  crearPersona,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  pedirVidaNuevaComo,
  sinScrollHorizontal,
  MARTES_19_A_21,
} from './helpers';

/**
 * spec 013, T025 (Historia 1): la bandeja unificada de Solicitudes en pantalla,
 * claro y oscuro con axe, y a 320 px sin scroll horizontal. Las Solicitudes
 * se arman por API: una que la Persona pidió sola y otra cargada en su nombre
 * por el Admin (H1.7). Cada test busca por un apellido propio, porque la base
 * de e2e la comparten todos los specs.
 */

const API = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

async function api<T>(page: Page, metodo: 'GET' | 'POST', ruta: string, data?: unknown): Promise<T> {
  const { apiToken } = await (await page.request.get('/api/auth/session')).json();
  const response = await page.request.fetch(`${API()}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    data,
  });
  const cuerpo = await response.text();
  if (!response.ok()) throw new Error(`${metodo} ${ruta} respondió ${response.status()}: ${cuerpo}`);
  return (cuerpo ? JSON.parse(cuerpo) : undefined) as T;
}

/** Dos Personas con el mismo apellido: una pide sola, a la otra se la carga el Admin logueado en `page`. */
async function dosPedidos(page: Page, apellido: string) {
  const sola = await crearPersona(`e2e-bandeja-sola-${apellido.toLowerCase()}@example.com`, { nombre: 'Sola', apellido });
  const solicitudSola = await pedirVidaNuevaComo(sola.email);
  const cargada = await crearPersona(`e2e-bandeja-cargada-${apellido.toLowerCase()}@example.com`, { nombre: 'Cargada', apellido });
  const { id: solicitudCargada } = await api<{ id: string }>(page, 'POST', '/discipulado/solicitudes', { personaId: cargada.id, franjas: [MARTES_19_A_21] });
  return { solicitudSola, solicitudCargada, sola: `Sola ${apellido}`, cargada: `Cargada ${apellido}` };
}

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

    test('H1.1, H1.3, H1.4, H1.7: las abiertas, la que más espera arriba, con su espera; la fila lleva al detalle', async ({ page }) => {
      const apellido = `Bandeja${colorScheme}${Date.now()}`;
      await loguearseComoAdminE2E(page);
      const { solicitudCargada, sola, cargada } = await dosPedidos(page, apellido);

      await page.goto(`/solicitudes?q=${apellido}`);
      await expect(page.getByRole('heading', { name: 'Solicitudes', level: 1 })).toBeVisible();
      const filas = page.getByRole('row').filter({ hasText: apellido });
      await expect(filas).toHaveCount(2);
      // Orden por espera: la primera que se pidió, primero (FR-005).
      await expect(filas.nth(0)).toContainText(sola);
      await expect(filas.nth(1)).toContainText(cargada);
      // FR-002: estado en texto + ícono, días de espera y quién la cargó (H1.7).
      for (const fila of [filas.nth(0), filas.nth(1)]) {
        await expect(fila).toContainText('Pendiente');
        await expect(fila).toContainText('Desde hoy');
        await expect(fila.locator('svg').first()).toBeVisible();
      }
      await expect(filas.nth(0)).toContainText('La Persona');
      await expect(filas.nth(1)).not.toContainText('La Persona');
      await expect(page.getByLabel('Mostrar')).toHaveValue('abiertas');

      // H1.3: el filtro por tipo solo existe con más de un tipo conectado.
      const conectados = Object.keys(await api<Record<string, number>>(page, 'GET', '/solicitudes/conteo-abiertas'));
      // Por rol y nombre: el <label> envuelve al <select>, así que su texto incluye las opciones.
      await expect(page.getByRole('combobox', { name: 'Tipo', exact: true })).toHaveCount(conectados.length > 1 ? 1 : 0);
      await sinViolaciones(page);

      // H1.4: el nombre lleva al perfil de la Persona (con su avatar en la fila)...
      await expect(filas.nth(1).getByRole('link', { name: cargada, exact: true })).toHaveAttribute('href', /^\/personas\/[0-9a-f-]+$/);
      // ...y cada fila, al detalle de su tipo.
      await page.getByRole('link', { name: `Ver la solicitud de ${cargada}` }).click();
      await expect(page).toHaveURL(new RegExp(`/solicitudes/${solicitudCargada}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Vida Nueva de ${cargada}`);
    });

    test('H1.5: "Resueltas" muestra lo rechazado con quién lo revisó; cambiar el filtro vuelve a la página 1', async ({ page }) => {
      const apellido = `Resuelta${colorScheme}${Date.now()}`;
      await loguearseComoAdminE2E(page);
      const { solicitudSola, sola } = await dosPedidos(page, apellido);
      await api(page, 'POST', `/discipulado/solicitudes/${solicitudSola}/rechazar`);

      await page.goto(`/solicitudes?q=${apellido}`);
      await expect(page.getByRole('row').filter({ hasText: apellido })).toHaveCount(1);

      // El select reacciona recién hidratado: esperar a que la página termine de cargar.
      await page.waitForLoadState('networkidle');
      await page.getByLabel('Mostrar').selectOption('resueltas');
      await expect(page).toHaveURL(/filtro=resueltas/);
      await expect(page).not.toHaveURL(/pagina=/);
      const fila = page.getByRole('row').filter({ hasText: sola });
      await expect(fila).toContainText('Rechazada');
      await expect(fila).toContainText('No espera');
      // Revisada por <Admin>, el <fecha> (la columna se ve en escritorio).
      await expect(fila).toContainText(/, el \d/);
      await sinViolaciones(page);

      // Con un tipo (implícito o elegido), el filtro ofrece sus estados (FR-004).
      // Con más de un tipo conectado (la 006 suma el historial), hay que elegirlo.
      const conectados = Object.keys(await api<Record<string, number>>(page, 'GET', '/solicitudes/conteo-abiertas'));
      if (conectados.length > 1) {
        await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('discipulado');
        await expect(page).toHaveURL(/tipo=discipulado/);
      }
      await page.getByLabel('Mostrar').selectOption({ label: 'Rechazada' });
      await expect(page).toHaveURL(/estado=rechazada/);
      await expect(page.getByRole('row').filter({ hasText: sola })).toHaveCount(1);
    });

    test('H1.6: el Pastor ve la bandeja sin acciones de resolver ni "Pedir en nombre de"', async ({ page }) => {
      const apellido = `Pastor${colorScheme}${Date.now()}`;
      await loguearseComoAdminE2E(page);
      const { sola } = await dosPedidos(page, apellido);

      await page.context().clearCookies();
      await loguearseComoPastorE2E(page);
      await page.goto(`/solicitudes?q=${apellido}`);
      await expect(page.getByRole('row').filter({ hasText: sola })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pedir Vida Nueva en nombre de…' })).toHaveCount(0);
      // La única acción por fila es ir al detalle.
      await expect(page.getByRole('row').filter({ hasText: sola }).getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('link', { name: `Ver la solicitud de ${sola}` })).toBeVisible();
      await sinViolaciones(page);
    });
  });
}

test('H1.8: paginado de a 20 en la URL, "?pagina=99" va a la última y cambiar el filtro vuelve a la 1', async ({ page }) => {
  test.setTimeout(240_000);
  const apellido = `Pagina${Date.now()}`;
  await loguearseComoAdminE2E(page);
  for (let i = 0; i < 21; i++) {
    const persona = await crearPersona(`e2e-bandeja-pag-${i}-${apellido.toLowerCase()}@example.com`, { nombre: `P${String(i).padStart(2, '0')}`, apellido });
    await api(page, 'POST', '/discipulado/solicitudes', { personaId: persona.id, franjas: [MARTES_19_A_21] });
  }

  await page.goto(`/solicitudes?q=${apellido}`);
  await expect(page.getByRole('row').filter({ hasText: apellido })).toHaveCount(20);
  await expect(page.getByText('Página 1 de 2')).toBeVisible();

  await page.goto(`/solicitudes?q=${apellido}&pagina=99`);
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.getByRole('row').filter({ hasText: apellido })).toHaveCount(1);

  await page.waitForLoadState('networkidle');
  await page.getByLabel('Mostrar').selectOption('todas');
  await expect(page).toHaveURL(/filtro=todas/);
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
});

test('a 320 px no hay scroll horizontal y la Persona, el estado y "Ver" siguen a la vista', async ({ page }) => {
  const apellido = `Angosta${Date.now()}`;
  await loguearseComoAdminE2E(page);
  const { sola } = await dosPedidos(page, apellido);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/solicitudes?q=${apellido}`);
  const fila = page.getByRole('row').filter({ hasText: sola });
  await expect(fila).toContainText('Pendiente');
  await expect(fila).toContainText('Desde hoy');
  await expect(page.getByRole('link', { name: `Ver la solicitud de ${sola}` })).toBeVisible();
  expect(await sinScrollHorizontal(page)).toBe(true);
});
