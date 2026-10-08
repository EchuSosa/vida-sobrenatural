import { type Page } from '@playwright/test';
import { test, expect, loguearseComoPastorE2E, crearMenorPendienteTutor } from './helpers';
import { verificarEnlacesAlcanzables } from './enlaces-alcanzables';

/**
 * specs/005, Historia 5 (T046, FR-018/D64): el Pastor ve todo el backoffice
 * y no gestiona nada — salvo la Palabra Profética (D129). Congela la
 * auditoría de T044: CADA fila de esa tabla tiene su verificación acá, no
 * una muestra. Las papeleras (404 para el Pastor, H-129) ya las cubren
 * libros.spec.ts y sedes.spec.ts por URL; acá se verifica además que ninguna
 * pantalla le OFRECE el enlace (T071), con verificarEnlacesAlcanzables.
 */

/** Ningún control de gestión con esos nombres, en ninguna parte de la página. */
async function sinControles(page: Page, nombres: RegExp[]) {
  for (const nombre of nombres) {
    await expect(page.getByRole('button', { name: nombre }), `botón ${nombre}`).toHaveCount(0);
    await expect(page.getByRole('link', { name: nombre }), `enlace ${nombre}`).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: nombre }), `ítem de menú ${nombre}`).toHaveCount(0);
  }
}

test.describe('Pastor: solo lectura (T046)', () => {
  test.beforeEach(async ({ page }) => {
    await loguearseComoPastorE2E(page);
  });

  test('Libros: ve el listado y abre el detalle, sin crear, reordenar, inactivar, eliminar ni editar', async ({ page }) => {
    await page.goto('/libros');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Libros', level: 1 })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    // T071: el enlace a la papelera es navegación a una pantalla que no puede abrir.
    await sinControles(page, [/^Crear Libro$/, /^Papelera$/, /^Mover .* hacia (arriba|abajo)$/, /^Arrastrar para reordenar/, /^Eliminar /]);

    // T044: "Ver detalle" es navegación (libros.ver) — está; las acciones del menú, no.
    await page.getByRole('button', { name: /^Acciones para / }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Ver detalle' })).toBeVisible();
    await sinControles(page, [/^Inactivar$/, /^Reactivar$/]);
    await page.getByRole('menuitem', { name: 'Ver detalle' }).click();

    await expect(page).toHaveURL(/\/libros\/[^/]+$/);
    await expect(page.getByLabel('Título')).toBeDisabled();
    await sinControles(page, [/^Guardar cambios$/, /^Inactivar$/, /^Reactivar$/, /^Eliminar/, /portada/i]);
  });

  test('Palabra Profética: SÍ puede cargar y editar (D129)', async ({ page }) => {
    await page.goto('/palabra-profetica');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Cargar una nueva' })).toBeVisible();
    await expect(page.getByLabel('Año')).toBeEditable();
    await expect(page.getByRole('button', { name: 'Crear' })).toBeVisible();
  });

  test('Personas: ve el listado, sin "Cambiar roles"', async ({ page }) => {
    await page.goto('/personas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Personas', level: 1 })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await sinControles(page, [/^Cambiar roles/, /^Ver el historial de roles/]);
  });

  test('Sedes: ve el listado y abre el detalle, sin crear, inactivar, eliminar, editar ni ir a la papelera (H-133)', async ({ page }) => {
    await page.goto('/sedes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Sedes', level: 1 })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await sinControles(page, [/^Crear Sede$/, /^Papelera$/, /^Eliminar /]);

    await page.getByRole('button', { name: /^Acciones para / }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Ver detalle' })).toBeVisible();
    await sinControles(page, [/^Inactivar$/, /^Reactivar$/]);
    await page.getByRole('menuitem', { name: 'Ver detalle' }).click();

    await expect(page).toHaveURL(/\/sedes\/[^/]+$/);
    await expect(page.getByLabel('Nombre')).toBeDisabled();
    await sinControles(page, [/^Guardar cambios$/, /^Desactivar$/, /^Reactivar$/]);
  });

  test('Pendientes tutor: ve la lista de menores (D64), sin Activar ni Cerrar el caso (T070)', async ({ page }) => {
    const apellido = `PastorLee${Date.now()}`;
    await crearMenorPendienteTutor(`e2e-pastor-lee-${Date.now()}@example.com`, 'E2E', apellido);
    await page.goto(`/pendientes-tutor?q=${apellido}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Casos pendientes de tutor' })).toBeVisible();
    await expect(page.getByText(apellido).first()).toBeVisible();
    await sinControles(page, [/^Activar$/, /^Cerrar el caso$/]);
  });

  // spec 013 (T091): las pantallas nuevas, sin ningún botón de gestión.
  test('Perfil de Persona: lo ve entero, sin roles ni "Pedir en su nombre"', async ({ page }) => {
    await page.goto('/personas/0013e2e0-0000-4000-8000-000000000001');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Perfil Con Foto');
    await sinControles(page, [/^Cambiar roles/, /^Ver el historial de roles/, /^Pedir Vida Nueva/]);
  });

  test('Catálogos y Cursos: los ve, sin agregar, editar, inactivar, eliminar ni la papelera', async ({ page }) => {
    await page.goto('/cursos');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Cursos', level: 1 })).toBeVisible();
    await sinControles(page, [/^Agregar un Curso$/, /^Papelera$/]);
    await page.getByRole('link', { name: /^Ver el Curso / }).first().click();
    await expect(page.getByLabel('Nombre')).not.toBeEditable();
    await sinControles(page, [/^Guardar los cambios$/, /^Inactivar$/, /^Reactivar$/, /^Eliminar$/]);
  });

  test('ninguna pantalla que puede abrir le ofrece un enlace a una que no puede abrir (T071)', async ({ page }) => {
    // spec 013: el recorrido suma el perfil, Cumpleaños, Catálogos y Cursos — más pantallas que abrir.
    test.setTimeout(120_000);
    // Los detalles se enlazan desde un menú cerrado (fuera del DOM hasta abrirlo):
    // el helper no los ve solo, así que se abren acá y se le pasan como extra.
    const detalleDe = async (listado: string) => {
      await page.goto(listado);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /^Acciones para / }).first().click();
      const href = await page.getByRole('menuitem', { name: 'Ver detalle' }).getAttribute('href');
      await page.keyboard.press('Escape');
      return href!;
    };
    const detalleLibro = await detalleDe('/libros');
    const detalleSede = await detalleDe('/sedes');

    const { roles, visitadas } = await verificarEnlacesAlcanzables(page, [detalleLibro, detalleSede]);
    expect(roles).toEqual(['pastor']);
    // Recorrió de verdad: todas las pantallas del Pastor, y un detalle de cada uno.
    expect(visitadas).toEqual(
      expect.arrayContaining(['/libros', '/sedes', '/personas', '/palabra-profetica', '/pendientes-tutor', detalleLibro, detalleSede]),
    );
  });
});
