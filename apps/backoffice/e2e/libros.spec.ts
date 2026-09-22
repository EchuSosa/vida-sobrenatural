import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { loguearseComoAdminE2E, loguearseComoPastorE2E, loguearseComoOtroRolE2E, auditar } from './helpers';

/**
 * Historia 4 (specs/003-contenido-institucional, D64/D119/FR-020): mismo
 * patrón que sedes.spec.ts — tabla compartida, alta en modal, detalle
 * editable, portada (primer uso real de StorageService), papelera. A
 * diferencia de Sedes, eliminar un Libro siempre está permitido (FR-020,
 * sin la rama "bloqueada" de datos relacionados). Corre en modo claro y
 * oscuro (Constitución Principio VII).
 */

// Playwright corre estos tests con cwd = apps/backoffice.
const PORTADA_VALIDA = readFileSync(join(process.cwd(), '../../packages/ui/src/assets/marca/logo-oscuro-1024.png'));

async function crearLibroPorModal(page: Page, titulo: string) {
  await page.getByRole('button', { name: 'Crear Libro' }).click();
  const modal = page.getByRole('dialog', { name: 'Crear Libro' });
  await expect(modal).toBeVisible();
  await modal.getByLabel('Título').fill(titulo);
  await modal.getByLabel('Autor/a').fill('Autor E2E');
  await modal.getByLabel('Año').fill('2024');

  // H-92: la fila de Año/Orden desbordaba el modal (flex-1 sin min-w-0) —
  // el campo Orden quedaba cortado. Verificado acá: el campo entero cae
  // dentro del ancho del modal.
  const campoOrden = modal.getByLabel('Orden');
  const cajaModal = await modal.boundingBox();
  const cajaOrden = await campoOrden.boundingBox();
  expect(cajaModal).not.toBeNull();
  expect(cajaOrden).not.toBeNull();
  if (cajaModal && cajaOrden) {
    expect(cajaOrden.x + cajaOrden.width).toBeLessThanOrEqual(cajaModal.x + cajaModal.width + 1);
  }

  await modal.getByRole('button', { name: 'Crear Libro' }).click();
  await expect(page.getByText('Libro creado.')).toBeVisible();
  await expect(modal).toBeHidden();
}

function filaLibro(page: Page, titulo: string) {
  return page.getByRole('row', { name: new RegExp(titulo) });
}

async function abrirDetalleDesdeFila(page: Page, fila: ReturnType<typeof filaLibro>) {
  await fila.getByRole('button', { name: /^Acciones para/ }).click();
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click();
  await page.waitForURL(/\/libros\/[^/]+$/);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear un Libro, subir portada con texto alternativo, y editarlo', async ({ page }) => {
      const titulo = `e2e-libro-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');

      await crearLibroPorModal(page, titulo);

      const fila = filaLibro(page, titulo);
      await expect(fila).toBeVisible();
      await abrirDetalleDesdeFila(page, fila);

      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      await expect(page.getByText('Activo', { exact: true })).toBeVisible();
      // Sin portada real todavía — placeholder con aspecto de tapa (FR-027).
      await expect(page.getByRole('img', { name: `Portada de ${titulo}` })).toBeVisible();

      let resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'portada.png',
        mimeType: 'image/png',
        buffer: PORTADA_VALIDA,
      });
      await page.getByLabel('Texto alternativo').fill(`Tapa de ${titulo}`);
      await page.getByRole('button', { name: 'Subir portada', exact: true }).click();
      await expect(page.getByText('Portada guardada.')).toBeVisible();
      await expect(page.getByRole('img', { name: `Tapa de ${titulo}` })).toBeVisible();

      resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // Reemplazar la portada.
      await page.getByLabel('Reemplazar portada (opcional)').setInputFiles({
        name: 'portada2.png',
        mimeType: 'image/png',
        buffer: PORTADA_VALIDA,
      });
      await page.getByLabel('Texto alternativo').fill(`Tapa reemplazada de ${titulo}`);
      await page.getByRole('button', { name: 'Reemplazar portada', exact: true }).click();
      await expect(page.getByText('Portada guardada.')).toBeVisible();

      // Quitarla — vuelve al placeholder (FR-027).
      await page.getByRole('button', { name: 'Quitar portada', exact: true }).click();
      await expect(page.getByText('Portada quitada.')).toBeVisible();
      await expect(page.getByRole('img', { name: `Portada de ${titulo}` })).toBeVisible();

      // Editar los datos del formulario.
      await page.getByLabel('Descripción (opcional)').fill('Descripción de prueba e2e.');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Cambios guardados.')).toBeVisible();
    });

    test('un archivo de tipo inválido o demasiado pesado muestra el error antes de subir; sin texto alternativo no se puede subir', async ({
      page,
    }) => {
      const titulo = `e2e-libro-portada-invalida-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await crearLibroPorModal(page, titulo);
      await abrirDetalleDesdeFila(page, filaLibro(page, titulo));

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'archivo.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('no es una imagen'),
      });
      await expect(page.getByText('La portada tiene que ser un archivo JPG, PNG o WebP.')).toBeVisible();

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'grande.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(6 * 1024 * 1024, 1),
      });
      await expect(
        page.getByText('La portada pesa más del máximo permitido (5 MB)', { exact: false }),
      ).toBeVisible();

      // Un archivo válido sin texto alternativo no deja subir.
      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'portada.png',
        mimeType: 'image/png',
        buffer: PORTADA_VALIDA,
      });
      await page.getByRole('button', { name: 'Subir portada', exact: true }).click();
      await expect(page.getByText('Completá el texto alternativo de la portada antes de subirla.')).toBeVisible();
    });

    test('inactivar/reactivar y eliminar (siempre permitido) a la papelera, y restaurar', async ({ page }) => {
      const titulo = `e2e-libro-papelera-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await crearLibroPorModal(page, titulo);
      await abrirDetalleDesdeFila(page, filaLibro(page, titulo));

      await page.getByRole('button', { name: 'Inactivar', exact: true }).click();
      await page
        .getByRole('alertdialog', { name: `¿Inactivar ${titulo}?` })
        .getByRole('button', { name: 'Sí, inactivar' })
        .click();
      await expect(page.getByText('Libro inactivado.')).toBeVisible();

      await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
      await page
        .getByRole('alertdialog', { name: `¿Reactivar ${titulo}?` })
        .getByRole('button', { name: 'Sí, reactivar' })
        .click();
      await expect(page.getByText('Libro reactivado.')).toBeVisible();

      // FR-020: eliminar siempre permitido, sin bloqueo por datos relacionados.
      await page.getByRole('button', { name: 'Eliminar Libro' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Eliminar ${titulo}?` })
        .getByRole('button', { name: 'Sí, eliminar' })
        .click();
      await expect(page.getByText('Libro eliminado.')).toBeVisible();
      await page.waitForURL(/\/libros$/);

      await page.goto('/libros/papelera');
      await page.waitForLoadState('networkidle');
      await expect(filaLibro(page, titulo)).toBeVisible();

      // H-95: miga de pan arriba del título, no "Volver a Libros" suelto.
      const migaLibros = page.getByRole('navigation', { name: 'Ruta' });
      await expect(migaLibros.getByRole('link', { name: 'Libros' })).toBeVisible();
      await expect(migaLibros.getByText('Papelera')).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await filaLibro(page, titulo).getByRole('button', { name: 'Restaurar' }).click();
      await expect(page.getByText(`${titulo} restaurado.`)).toBeVisible();
    });

    test('Pastor ve el listado y el detalle pero no puede editar nada (D64)', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Libros' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear Libro' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Acciones para/ })).toHaveCount(0);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('otro rol no encuentra la sección en el menú y el acceso directo por URL se lo niega (FR-030)', async ({
      page,
    }) => {
      await loguearseComoOtroRolE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Libros' })).toHaveCount(0);

      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Necesitás el rol Admin o Pastor', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear Libro' })).toHaveCount(0);
    });
  });
}
