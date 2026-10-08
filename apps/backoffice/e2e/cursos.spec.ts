import type { Page } from '@playwright/test';
import { test, expect, auditar, crearGrupo, crearPersona, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';

/**
 * spec 013, T075 (Historia 6): Catálogos y Cursos. Lo que cambia datos se hace
 * con "Vida Nueva grupal", que ningún otro e2e usa; el Curso "Vida Nueva"
 * individual (con Grupos de otros specs) solo se mira: eliminar deshabilitado y
 * la confirmación reforzada, que se abre y se cancela.
 */
const API = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

async function api<T>(page: Page, metodo: 'GET' | 'DELETE', ruta: string): Promise<T> {
  const { apiToken } = await (await page.request.get('/api/auth/session')).json();
  const r = await page.request.fetch(`${API()}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${apiToken}` } });
  if (!r.ok()) throw new Error(`${metodo} ${ruta} respondió ${r.status()}: ${await r.text()}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
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

    test('H6.1, H6.3, H6.4: Catálogos con Sedes y Cursos; un Curso con Grupos no se elimina y se inactiva escribiendo su nombre', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      // Vida Nueva individual necesita un Grupo en curso (normalmente ya lo dejaron otros specs).
      const cursos = await api<Array<{ categoria: string; tipo: string; gruposEnCurso: number }>>(page, 'GET', '/cursos');
      if (!cursos.some((c) => c.categoria === 'vida_nueva' && c.tipo === 'individual' && c.gruposEnCurso > 0)) {
        const sufijo = `${colorScheme}${Date.now()}`;
        await crearGrupo([await crearPersona(`e2e-cursos-grupo-${sufijo}@example.com`, { nombre: 'Cursa', apellido: `Cursos${sufijo}` })]);
      }
      await page.goto('/catalogos');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catálogos');
      await expect(page.getByRole('link', { name: /Dónde se reúne la iglesia/ })).toHaveAttribute('href', '/sedes');
      await expect(page.getByRole('link', { name: /Vida Nueva y Vida de Servicio/ })).toHaveAttribute('href', '/cursos');
      await expect(page.getByRole('link', { name: /Ministerios/ })).toHaveCount(0);
      await sinViolaciones(page);

      await page.getByRole('link', { name: /Vida Nueva y Vida de Servicio/ }).click();
      await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Catálogos');
      await sinViolaciones(page);
      await page.getByRole('link', { name: 'Ver el Curso Vida Nueva', exact: true }).click();

      // H6.4: tiene Grupos (de otros specs): Eliminar deshabilitado, con la explicación y la oferta de inactivar.
      await expect(page.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
      await expect(page.getByText('No se puede eliminar porque tiene Grupos', { exact: false })).toBeVisible();
      // H6.3: con Grupos en curso, inactivar pide el nombre exacto (y se cancela: el Curso lo usan otros e2e).
      await page.getByRole('button', { name: 'Inactivar' }).click();
      const dialogo = page.getByRole('alertdialog');
      const confirmar = dialogo.getByRole('button', { name: 'Sí, inactivar' });
      await expect(confirmar).toBeDisabled();
      await dialogo.getByLabel('Nombre del Curso').fill('Vida Nuev');
      await expect(confirmar).toBeDisabled();
      await dialogo.getByLabel('Nombre del Curso').fill('Vida Nueva');
      await expect(confirmar).toBeEnabled();
      await sinViolaciones(page);
      await dialogo.getByRole('button', { name: 'Volver' }).click();
      await expect(page.getByText('Activo', { exact: true })).toBeVisible();
    });

    test('H6.6: el Pastor ve Catálogos y Cursos sin acciones', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/cursos');
      await expect(page.getByRole('button', { name: 'Agregar un Curso' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Papelera' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Ver el Curso Vida Nueva', exact: true }).click();
      await expect(page.getByRole('button', { name: /Inactivar|Eliminar|Guardar/ })).toHaveCount(0);
      await sinViolaciones(page);
    });
  });
}

test('H6.5: agregar "Vida Nueva grupal", inactivarlo, reactivarlo, eliminarlo y recuperarlo de la papelera', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  // Si quedó de una corrida anterior, a la papelera (no tiene Grupos): el alta lo recupera.
  const existentes = await api<Array<{ id: string; categoria: string; tipo: string }>>(page, 'GET', '/cursos?incluirInactivos=true');
  const previo = existentes.find((c) => c.categoria === 'vida_nueva' && c.tipo === 'grupal');
  if (previo) await api(page, 'DELETE', `/cursos/${previo.id}`);

  await page.goto('/cursos');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Agregar un Curso' }).click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: 'Agregar el Curso' }).click();
  await expect(panel.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
  await expect(panel.locator('#campo-combinacion-error')).toHaveText('Elegí un Curso de la lista.');
  await panel.getByLabel('Curso', { exact: true }).selectOption('vida_nueva:grupal');
  await panel.getByLabel('Nombre').fill('Vida Nueva en grupo');
  await panel.getByRole('button', { name: 'Agregar el Curso' }).click();
  await expect(panel).toHaveCount(0);

  await page.getByRole('link', { name: 'Ver el Curso Vida Nueva en grupo' }).click();
  await page.getByRole('button', { name: 'Inactivar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, inactivar' }).click();
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reactivar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, reactivar' }).click();
  await expect(page.getByText('Activo', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, eliminar' }).click();
  await expect(page).toHaveURL(/\/cursos$/);
  await page.getByRole('link', { name: 'Papelera' }).click();
  await expect(page.getByRole('navigation', { name: 'Ruta' })).toContainText('Cursos');
  await page.getByRole('button', { name: 'Recuperar el Curso Vida Nueva en grupo' }).click();
  await expect(page.getByText('La papelera está vacía.')).toBeVisible();
});

test('Sedes vive bajo Catálogos (D213, T077): fuera del menú, Catálogos marcado y la miga empieza en Catálogos', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/catalogos');
  const menu = page.getByRole('navigation', { name: 'Principal' });
  await expect(menu.getByRole('link', { name: 'Sedes', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Dónde se reúne la iglesia/ }).click();
  await expect(page).toHaveURL(/\/sedes$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sedes');
  await expect(menu.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('aria-current', 'page');
  const miga = page.getByRole('navigation', { name: 'Ruta' });
  await expect(miga.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('href', '/catalogos');
  await expect(miga).toContainText('Sedes');

  await page.goto('/sedes/papelera');
  await expect(menu.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('aria-current', 'page');
  await expect(miga.getByRole('link', { name: 'Catálogos' })).toBeVisible();
  await expect(miga.getByRole('link', { name: 'Sedes' })).toBeVisible();

  // En Cursos también: es el otro catálogo.
  await page.goto('/cursos');
  await expect(menu.getByRole('link', { name: 'Catálogos' })).toHaveAttribute('aria-current', 'page');
});
