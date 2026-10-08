import type { Page } from '@playwright/test';
import {
  test,
  expect,
  auditar,
  crearGrupo,
  crearPersona,
  idDePersona,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  pedirVidaNuevaComo,
  sinScrollHorizontal,
  EMAIL_DISCIPULADOR_1,
} from './helpers';

/**
 * spec 013, T035 (Historia 2): el perfil de Persona en pantalla. Las Personas
 * con foto, menor con tutor y dada de baja vienen de los fixtures de la 013
 * (`apps/api/scripts/sembrar-e2e/013-backoffice.ts`, ids fijos); el resto se
 * arma por API en cada test.
 */
const PERFIL = {
  conFoto: '0013e2e0-0000-4000-8000-000000000001',
  menor: '0013e2e0-0000-4000-8000-000000000002',
  tutor: '0013e2e0-0000-4000-8000-000000000003',
  baja: '0013e2e0-0000-4000-8000-000000000004',
} as const;

const API = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

async function apiComoSesion(page: Page, metodo: 'GET' | 'POST', ruta: string) {
  const { apiToken } = await (await page.request.get('/api/auth/session')).json();
  const r = await page.request.fetch(`${API()}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${apiToken}` } });
  if (!r.ok()) throw new Error(`${metodo} ${ruta} respondió ${r.status()}: ${await r.text()}`);
}

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

const seccion = (page: Page, nombre: string) => page.getByRole('region', { name: nombre });

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('FR-010/FR-018, H2.1, FR-012, FR-016: del listado al perfil, con foto o iniciales, roles y pedir en su nombre', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto(`/personas?q=${encodeURIComponent('Perfil Con Foto')}`);
      const fila = page.getByRole('row').filter({ hasText: 'Perfil Con Foto' });
      await expect(fila.locator('img')).toHaveCount(1);
      await fila.getByRole('link', { name: 'Perfil Con Foto, Ana' }).click();
      await expect(page).toHaveURL(new RegExp(`/personas/${PERFIL.conFoto}$`));

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Perfil Con Foto');
      await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Personas');
      await expect(page.getByRole('img', { name: 'Foto de Ana Perfil Con Foto' })).toBeVisible();
      await expect(seccion(page, 'Datos')).toContainText('Desde 2019');
      await expect(seccion(page, 'Datos')).toContainText('Lo dio en la app el 10 de enero de 2026');
      await sinViolaciones(page);

      // FR-012: el panel de roles y su historial, los mismos del listado.
      await page.getByRole('button', { name: 'Cambiar roles de Ana Perfil Con Foto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Ver el historial de roles de Ana Perfil Con Foto' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');

      // FR-016: pedir Vida Nueva en su nombre, con el nombre a la vista (D97).
      await page.getByRole('button', { name: 'Pedir Vida Nueva en nombre de…' }).click();
      await expect(page.getByRole('dialog').getByRole('heading', { name: 'Pedir Vida Nueva para Ana Perfil Con Foto' })).toBeVisible();
      await page.keyboard.press('Escape');

      // Sin foto: las iniciales, con contraste (axe).
      await page.goto(`/personas/${PERFIL.tutor}`);
      await expect(page.getByRole('img', { name: 'Foto de Tomás Perfil Tutor' })).toHaveText('TP');
      await sinViolaciones(page);
    });

    test('H2.2, H2.3: sus Solicitudes y sus Grupos, enlazados; la Discipuladora ve los que tiene a cargo', async ({ page }) => {
      const sufijo = `${colorScheme}${Date.now()}`;
      await loguearseComoAdminE2E(page);
      const rechazada = await crearPersona(`e2e-perfil-h22-${sufijo}@example.com`, { nombre: 'Rocío', apellido: `Historial${sufijo}` });
      const solicitudId = await pedirVidaNuevaComo(rechazada.email);
      await apiComoSesion(page, 'POST', `/discipulado/solicitudes/${solicitudId}/rechazar`);
      const { grupoId } = await crearGrupo([rechazada]);

      await page.goto(`/personas/${rechazada.id}`);
      const solicitudes = seccion(page, 'Solicitudes');
      await expect(solicitudes.getByRole('listitem')).toHaveCount(2);
      await expect(solicitudes).toContainText('Rechazada');
      await expect(solicitudes).toContainText('Aprobada');
      await expect(solicitudes.getByRole('link', { name: 'Ver todas en la bandeja' })).toHaveAttribute('href', `/solicitudes?persona=${rechazada.id}&filtro=todas`);
      await expect(seccion(page, 'Grupos que cursó').getByRole('link', { name: 'Ver el Grupo de Vida Nueva' })).toHaveAttribute('href', `/grupos/${grupoId}`);
      await expect(seccion(page, 'Grupos que cursó')).toContainText('Cursando');
      await sinViolaciones(page);

      await solicitudes.getByRole('link', { name: 'Vida Nueva' }).last().click();
      await expect(page).toHaveURL(new RegExp(`/solicitudes/${solicitudId}$`));
      await page.getByRole('link', { name: `Ver el perfil de Rocío Historial${sufijo}` }).click();
      await expect(page).toHaveURL(new RegExp(`/personas/${rechazada.id}$`));

      await page.goto(`/personas/${await idDePersona(EMAIL_DISCIPULADOR_1)}`);
      await expect(seccion(page, 'Grupos a cargo').getByRole('link', { name: 'Ver el Grupo de Vida Nueva' }).first()).toBeVisible();
      await expect(seccion(page, 'Grupos a cargo')).toContainText('En curso');
    });

    test('H2.4, H2.5, FR-017, H2.8: el tutor de un menor y su vínculo inverso, una Persona dada de baja y un id que no existe', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      await page.goto(`/personas/${PERFIL.menor}`);
      await expect(page.getByText('Menor de edad')).toBeVisible();
      await expect(seccion(page, 'Datos').getByRole('link', { name: 'Tomás Perfil Tutor' })).toHaveAttribute('href', `/personas/${PERFIL.tutor}`);
      await expect(seccion(page, 'Familia')).toContainText('Su tutor/a: Tomás Perfil Tutor');

      await page.goto(`/personas/${PERFIL.tutor}`);
      await expect(seccion(page, 'Familia')).toContainText('A su cargo: Mía Perfil Menor');

      await page.goto(`/personas/${PERFIL.baja}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Berta Perfil Baja');
      await expect(page.getByText('Dada de baja')).toBeVisible();

      await page.goto('/personas/00000000-0000-4000-8000-000000000000');
      await expect(page.getByRole('heading', { name: 'No encontramos esta Persona' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ir a Personas' })).toHaveAttribute('href', '/personas');
      await sinViolaciones(page);
    });

    test('H2.6: el Pastor ve el perfil con el contacto y sin botones de gestión', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto(`/personas/${PERFIL.conFoto}`);
      await expect(seccion(page, 'Datos').getByRole('link', { name: '+54 9 221 900-1300' })).toBeVisible();
      await expect(seccion(page, 'Datos')).toContainText('e2e-perfil-con-foto@example.com');
      await expect(page.getByRole('button', { name: /Cambiar roles/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Pedir Vida Nueva en nombre de…' })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}

test('H2.9 @celular: a 360 px sin scroll, etiquetas y botones de 16 px y 44 px de alto', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loguearseComoAdminE2E(page);
  await page.goto(`/personas/${PERFIL.conFoto}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await sinScrollHorizontal(page)).toBe(true);

  const etiqueta = seccion(page, 'Datos').locator('dt').first();
  expect(parseFloat(await etiqueta.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  for (const nombre of ['Cambiar roles de Ana Perfil Con Foto', 'Ver el historial de roles de Ana Perfil Con Foto']) {
    const boton = page.getByRole('button', { name: nombre });
    expect(parseFloat(await boton.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const telefono = seccion(page, 'Datos').getByRole('link', { name: '+54 9 221 900-1300' });
  expect((await telefono.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
