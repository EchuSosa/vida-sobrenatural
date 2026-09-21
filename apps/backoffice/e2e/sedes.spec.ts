import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loguearseComoAdminE2E, asegurarUnaSolaSedeActiva, reactivarSedes } from './helpers';

/**
 * H-30 (revisión manual ronda 2) / H-34 (ronda 3) / H-51+H-52+H-50 (ronda 4,
 * D117): listado con filtro activas/todas, alta en modal, detalle con
 * edición, Desactivar/Reactivar desde el detalle, errores de validación por
 * campo en el alta. Corre en modo claro y oscuro (Constitución Principio VII).
 */

async function crearSedePorModal(page: import('@playwright/test').Page, nombre: string) {
  await page.getByRole('button', { name: 'Crear Sede' }).click();
  const modal = page.getByRole('dialog', { name: 'Crear Sede' });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder('Nombre').fill(nombre);
  await modal.getByPlaceholder('Dirección').fill('Calle 7 y 47, La Plata');
  await modal.getByPlaceholder('Horarios (ej. "Domingos 10:30 hs")').fill('Domingos 11 hs');
  // CONTACTO_SEDE_REQUERIDO: hace falta al menos un teléfono o un email de contacto.
  await modal.getByLabel('Teléfono de contacto (opcional)').fill('92211230000');
  await modal.getByRole('button', { name: 'Crear Sede' }).click();
  await expect(page.getByText('Sede creada.')).toBeVisible();
  await expect(modal).toBeHidden();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear una Sede por el modal, abrir su detalle y editarla', async ({ page }) => {
      const nombreSede = `e2e-sede-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await crearSedePorModal(page, nombreSede);

      const fila = page.getByRole('link', { name: new RegExp(nombreSede) });
      await expect(fila).toBeVisible();
      await fila.click();

      await expect(page.getByRole('heading', { name: nombreSede })).toBeVisible();
      // exact: true — "Activa" sin acotar matchea "Desactivar"/"Reactivar" por substring.
      await expect(page.getByText('Activa', { exact: true })).toBeVisible();

      const resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByPlaceholder('Dirección').fill('Calle 50 y 115, La Plata');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Cambios guardados.')).toBeVisible();

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByPlaceholder('Dirección')).toHaveValue('Calle 50 y 115, La Plata');

      // Desactiva lo creado — activa y visible para siempre en Visitanos/el
      // registro reales ensuciaría el ambiente compartido (Sede no se borra).
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, desactivar' })
        .click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
    });

    test('crear una Sede con un teléfono inválido muestra el error debajo del campo y un resumen arriba (H-50)', async ({
      page,
    }) => {
      const nombreSede = `e2e-sede-h50-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Crear Sede' }).click();
      const modal = page.getByRole('dialog', { name: 'Crear Sede' });
      await expect(modal).toBeVisible();
      await modal.getByPlaceholder('Nombre').fill(nombreSede);
      await modal.getByPlaceholder('Dirección').fill('Calle 7 y 47, La Plata');
      await modal.getByPlaceholder('Horarios (ej. "Domingos 10:30 hs")').fill('Domingos 11 hs');
      // TELEFONO_REGEX pide 5-15 dígitos/espacios después del código de
      // país. El backend arma "código + espacio + número": con "123" el
      // backtracking del regex (país de 1 a 4 dígitos) encuentra una lectura
      // válida igual (ej. "+54 123" ~ país "5", resto "4 123" de 5
      // caracteres) — "12" no deja ninguna combinación posible.
      await modal.getByLabel('Teléfono de contacto (opcional)').fill('12');
      await modal.getByRole('button', { name: 'Crear Sede' }).click();

      const resumen = modal.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeVisible();
      await expect(resumen).toBeFocused();
      await expect(
        modal.getByText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.'),
      ).toHaveCount(2);
      // No se creó nada — sigue en el modal, no hace falta limpiar después.
      await expect(modal).toBeVisible();

      const resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });

    test('desactivar y reactivar una Sede desde su detalle', async ({ page }) => {
      const nombreSede = `e2e-sede-reactivar-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await crearSedePorModal(page, nombreSede);
      await page.getByRole('link', { name: new RegExp(nombreSede) }).click();

      await page.getByRole('button', { name: 'Desactivar' }).click();
      const dialogoDesactivar = page.getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` });
      await expect(dialogoDesactivar).toBeVisible();
      await expect(dialogoDesactivar).toHaveCSS('opacity', '1');
      await dialogoDesactivar.getByRole('button', { name: 'Sí, desactivar' }).click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
      await expect(page.getByText('Inactiva', { exact: true })).toBeVisible();

      // Deja de estar en "Activas"; sigue en "Todas" (H-51 — no desaparece).
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(nombreSede)).toHaveCount(0);
      await page.getByRole('button', { name: 'Todas' }).click();
      await expect(page.getByRole('link', { name: new RegExp(nombreSede) })).toBeVisible();

      await page.getByRole('link', { name: new RegExp(nombreSede) }).click();
      await page.getByRole('button', { name: 'Reactivar' }).click();
      const dialogoReactivar = page.getByRole('alertdialog', { name: `¿Reactivar la Sede ${nombreSede}?` });
      await expect(dialogoReactivar).toBeVisible();
      await dialogoReactivar.getByRole('button', { name: 'Sí, reactivar' }).click();
      await expect(page.getByText('Sede reactivada.')).toBeVisible();
      await expect(page.getByText('Activa', { exact: true })).toBeVisible();

      // Cierra el ciclo desactivando de nuevo — dejarla activa ensuciaría
      // Visitanos y el registro reales para siempre (Sede no se borra).
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, desactivar' })
        .click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
    });

    test('reactivar rechaza si otra Sede activa ya tiene el mismo nombre', async ({ page }) => {
      const nombreSede = `e2e-sede-dup-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      // Crea la primera y la desactiva.
      await crearSedePorModal(page, nombreSede);
      await page.getByRole('link', { name: new RegExp(nombreSede) }).click();
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, desactivar' })
        .click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();

      // Crea una segunda Sede activa con el mismo nombre — válido, porque el
      // chequeo de unicidad solo mira activas.
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await crearSedePorModal(page, nombreSede);

      // Reactivar la primera ahora choca con la segunda — hay dos filas con
      // el mismo nombre, se elige la inactiva por el badge (el orden entre
      // dos Sedes con nombre idéntico no está garantizado).
      await page.getByRole('button', { name: 'Todas' }).click();
      await page.getByRole('link', { name: new RegExp(nombreSede) }).filter({ hasText: 'Inactiva' }).click();
      await page.getByRole('button', { name: 'Reactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Reactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, reactivar' })
        .click();
      await expect(page.getByText('Ya existe otra Sede activa con este nombre')).toBeVisible();
      await expect(page.getByText('Inactiva', { exact: true })).toBeVisible();

      // La segunda Sede quedó activa con este nombre — a diferencia de una
      // inactiva (que no se ve públicamente), dejarla así ensuciaría
      // Visitanos y el registro reales. Se desactiva para no filtrar datos
      // de prueba a la parte pública, aunque el ambiente no borra Sedes.
      // Seguimos en el detalle de la primera (todavía inactiva) — el filtro
      // "Todas" vive en el listado, no acá.
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Todas' }).click();
      // "Activa" es substring de "Inactiva" — se excluye por texto, no se busca por él.
      await page.getByRole('link', { name: new RegExp(nombreSede) }).filter({ hasNotText: 'Inactiva' }).click();
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, desactivar' })
        .click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
    });

    test('desactivar la única Sede activa la bloquea con un diálogo informativo', async ({ page }) => {
      await loguearseComoAdminE2E(page);
      // H-40: el test prepara su propio estado (exactamente una Sede activa)
      // en vez de saltearse según lo que ya tenga la base.
      const idsAReactivar = await asegurarUnaSolaSedeActiva(page);

      try {
        await page.goto('/sedes');
        await page.waitForLoadState('networkidle');

        // Scoped a <main>: el <Sidebar> del backoffice también son <a> con role="link".
        const filas = page.locator('main').getByRole('link');
        await expect(filas).toHaveCount(1);
        await filas.first().click();

        // A diferencia del listado viejo, el detalle no sabe de antemano
        // que es la única activa — confirma el ConfirmDestructiveDialog
        // normal primero; la API responde SEDE_UNICA_ACTIVA y el detalle
        // reemplaza ese diálogo por el aviso informativo.
        await page.getByRole('button', { name: 'Desactivar' }).click();
        await page
          .getByRole('alertdialog', { name: /¿Desactivar la Sede/ })
          .getByRole('button', { name: 'Sí, desactivar' })
          .click();

        const dialogo = page.getByRole('alertdialog', { name: 'Necesitás al menos una Sede activa' });
        await expect(dialogo).toBeVisible();

        const resultados = await new AxeBuilder({ page }).analyze();
        expect(resultados.violations).toEqual([]);

        // AlertDialogAction acá está renderizado como <Link> (role="link"),
        // no como botón — es una navegación real a /sedes, no una acción in-place.
        await dialogo.getByRole('link', { name: 'Crear una Sede' }).click();
        await expect(dialogo).toBeHidden();
        await expect(page).toHaveURL(/\/sedes$/);
        // La navegación de arriba es client-side (<Link>) — esperar a que
        // asiente antes de que el finally use page.request, o esa llamada
        // queda esperando detrás de la transición en curso.
        await page.waitForLoadState('networkidle');
      } finally {
        // Restaura el estado real de la base — este ambiente también lo usan
        // pruebas manuales, no es descartable entre corridas.
        await reactivarSedes(page, idsAReactivar);
      }
    });
  });
}
