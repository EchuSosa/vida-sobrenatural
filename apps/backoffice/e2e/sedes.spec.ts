import { test, expect, type Page, type Locator } from '@playwright/test';
import { loguearseComoAdminE2E, asegurarUnaSolaSedeActiva, reactivarSedes, crearAxeBuilder } from './helpers';

/**
 * H-30 (revisión manual ronda 2) / H-34 (ronda 3) / H-51+H-52+H-50 (ronda 4,
 * D117) / H-69+D119 (ronda 6): tabla compartida (packages/ui) con filtro
 * activas/todas, alta en modal, columna de acciones (Ver detalle,
 * Inactivar/Reactivar, Eliminar), papelera con Restaurar. Corre en modo
 * claro y oscuro (Constitución Principio VII).
 */

async function crearSedePorModal(page: Page, nombre: string) {
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

/** H-69: la fila de la tabla (no un <a>) — "Ver detalle" vive en su menú de acciones (D119). */
function filaSede(page: Page, nombreSede: string) {
  return page.getByRole('row', { name: new RegExp(nombreSede) });
}

async function abrirDetalleDesdeFila(page: Page, fila: Locator) {
  await fila.getByRole('button', { name: /^Acciones para/ }).click();
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click();
  // El click en el <Link> de "Ver detalle" dispara una navegación client-side
  // (Next.js) que no es instantánea — sin esto, la siguiente aserción del
  // test puede correr contra el listado todavía visible, en medio de la
  // transición y de la animación de cierre del menú (Base UI).
  await page.waitForURL(/\/sedes\/[^/]+$/);
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

      const fila = filaSede(page, nombreSede);
      await expect(fila).toBeVisible();
      await abrirDetalleDesdeFila(page, fila);

      await expect(page.getByRole('heading', { name: nombreSede })).toBeVisible();
      // exact: true — "Activa" sin acotar matchea "Desactivar"/"Reactivar" por substring.
      await expect(page.getByText('Activa', { exact: true })).toBeVisible();

      const resultados = await crearAxeBuilder(page).analyze();
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
      const telefono = modal.getByLabel('Teléfono de contacto (opcional)');
      await telefono.fill('12');
      // H-72: salir del campo ahora revalida en el momento — sin este blur
      // explícito, el propio click en "Crear Sede" dispara ese blur (el
      // teléfono todavía tiene el foco) y el mensaje que aparece corre el
      // botón antes de que el click llegue a destino. Un blur previo es lo
      // que haría alguien tabulando o clickeando en otro lado primero.
      await telefono.blur();
      await expect(modal.locator('#campo-contactoTelefono-error')).toBeVisible();
      await modal.getByRole('button', { name: 'Crear Sede' }).click();

      const resumen = modal.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeVisible();
      await expect(resumen).toBeFocused();
      await expect(
        modal.getByText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.'),
      ).toHaveCount(2);
      // No se creó nada — sigue en el modal, no hace falta limpiar después.
      await expect(modal).toBeVisible();

      const resultados = await crearAxeBuilder(page).analyze();
      expect(resultados.violations).toEqual([]);
    });

    test('H-72: el error de un campo se limpia al escribir y vuelve al salir si sigue mal, sin reenviar', async ({
      page,
    }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Crear Sede' }).click();
      const modal = page.getByRole('dialog', { name: 'Crear Sede' });
      await expect(modal).toBeVisible();

      const horarios = modal.getByPlaceholder('Horarios (ej. "Domingos 10:30 hs")');
      const errorHorarios = modal.locator('#campo-horarios-error');

      // Formato inválido + salir del campo: aparece el error, sin haber enviado.
      await horarios.fill('cualquier cosa');
      await horarios.blur();
      await expect(errorHorarios).toBeVisible();
      await expect(errorHorarios).toHaveText('Usá un formato como "Domingos 10:30 hs" o "Domingos 10 hs y Martes 19 hs".');

      // Escribir de nuevo lo limpia al toque, antes de volver a salir del campo.
      await horarios.fill('cualquier cosa a');
      await expect(errorHorarios).toBeHidden();

      // Corregido y fuera del campo: se queda limpio (no "vuelve" porque ahora es válido).
      await horarios.fill('Domingos 10:30 hs');
      await horarios.blur();
      await expect(errorHorarios).toBeHidden();

      await expect(modal).toBeVisible();
      await expect(page.getByText('Sede creada.')).toBeHidden();
      // Sin axe acá a propósito: este test verifica el estado de
      // validación, no accesibilidad — H-73 (más abajo) audita el botón de
      // envío en su estado normal, y H-50 lo hace con un error real visible.
    });

    // H-73 (revisión manual ronda 8): el botón de envío de este modal midió
    // 4.46 contra el mínimo de 4.5 en un axe corrido apenas se abría el
    // panel. Causa real: el panel entra con `transition duration-200` de
    // `opacity: 0` a `1` (Sheet, D95-style) — sin esperar a que asiente
    // (mismo patrón que el resto de este archivo/apps/web con diálogos y
    // toasts, ver `toHaveCSS('opacity', '1')`), axe mide un fotograma a
    // mitad de la transición, con el botón todavía semitransparente sobre
    // el fondo de la página. Confirmado con getComputedStyle: `opacity` da
    // "0" apenas `toBeVisible()` resuelve. bg-primary + text-primary-
    // foreground miden 5.80:1 (docs/17-paleta-y-tokens.md) — no hay nada
    // que tocar en la paleta ni en la clase base del Button.
    test('H-73: el botón "Crear Sede" cumple contraste una vez que el panel asienta su transición', async ({
      page,
    }) => {
      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Crear Sede' }).click();
      const modal = page.getByRole('dialog', { name: 'Crear Sede' });
      await expect(modal).toBeVisible();
      await expect(modal).toHaveCSS('opacity', '1');
      await page.mouse.move(0, 0);

      const resultados = await crearAxeBuilder(page).analyze();
      expect(resultados.violations).toEqual([]);
    });

    test('desactivar y reactivar una Sede desde su detalle', async ({ page }) => {
      const nombreSede = `e2e-sede-reactivar-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await crearSedePorModal(page, nombreSede);
      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede));

      await page.getByRole('button', { name: 'Desactivar' }).click();
      const dialogoDesactivar = page.getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` });
      await expect(dialogoDesactivar).toBeVisible();
      await expect(dialogoDesactivar).toHaveCSS('opacity', '1');
      await dialogoDesactivar.getByRole('button', { name: 'Sí, desactivar' }).click();
      await expect(dialogoDesactivar).toBeHidden();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
      await expect(page.getByText('Inactiva', { exact: true })).toBeVisible();

      // Deja de estar en "Activas"; sigue en "Todas" (H-51 — no desaparece).
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(nombreSede)).toHaveCount(0);
      await page.getByRole('button', { name: 'Todas' }).click();
      await expect(filaSede(page, nombreSede)).toBeVisible();

      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede));
      await page.getByRole('button', { name: 'Reactivar' }).click();
      const dialogoReactivar = page.getByRole('alertdialog', { name: `¿Reactivar la Sede ${nombreSede}?` });
      await expect(dialogoReactivar).toBeVisible();
      await dialogoReactivar.getByRole('button', { name: 'Sí, reactivar' }).click();
      await expect(dialogoReactivar).toBeHidden();
      await expect(page.getByText('Sede reactivada.')).toBeVisible();
      await expect(page.getByText('Activa', { exact: true })).toBeVisible();

      // Cierra el ciclo desactivando de nuevo — dejarla activa ensuciaría
      // Visitanos y el registro reales para siempre (Sede no se borra).
      // getByRole('button', { name: 'Desactivar', exact: true }) — sin
      // exact, matchea también "Sí, desactivar" si ese diálogo (ya cerrado,
      // pero router.refresh() tarda un instante en re-renderizar
      // ConfirmDestructiveDialog con las props nuevas) todavía no terminó
      // de desmontarse.
      await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
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
      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede));
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
      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede).filter({ hasText: 'Inactiva' }));
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
      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede).filter({ hasNotText: 'Inactiva' }));
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

        // Una sola fila de datos en la tabla (más el <thead>, que no cuenta como "row" de datos para este propósito).
        const filas = page.getByRole('table', { name: 'Sedes' }).locator('tbody tr');
        await expect(filas).toHaveCount(1);
        await abrirDetalleDesdeFila(page, filas.first());

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

        // El click en "Sí, desactivar" de arriba deja el cursor apoyado en
        // esa posición de pantalla — si "Crear una Sede" (abajo) termina
        // renderizando en el mismo lugar, queda en :hover sin que nadie lo
        // haya pasado por encima de verdad, y axe audita ese estado en vez
        // del normal (D118: el hover de un botón primario baja de 4.5:1).
        await page.mouse.move(0, 0);
        const resultados = await crearAxeBuilder(page).analyze();
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

    test('D119: no se puede eliminar una Sede con Personas asociadas; eliminar una sin datos la saca de Activas y Todas, y se puede restaurar', async ({
      page,
    }) => {
      const nombreSede = `e2e-sede-eliminar-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await crearSedePorModal(page, nombreSede);

      const fila = filaSede(page, nombreSede);
      await fila.getByRole('button', { name: /^Eliminar/ }).click();
      const dialogoEliminar = page.getByRole('alertdialog', { name: `¿Eliminar ${nombreSede}?` });
      await expect(dialogoEliminar).toBeVisible();
      await dialogoEliminar.getByRole('button', { name: 'Sí, eliminar' }).click();
      await expect(page.getByText('Sede eliminada.')).toBeVisible();

      // Fuera de Activas y de Todas (D119: "desaparece de todas las vistas normales").
      await expect(filaSede(page, nombreSede)).toHaveCount(0);
      await page.getByRole('button', { name: 'Todas' }).click();
      await expect(filaSede(page, nombreSede)).toHaveCount(0);

      // Restaurar desde la papelera la devuelve a "Todas".
      await page.goto('/sedes/papelera');
      await page.waitForLoadState('networkidle');
      const filaPapelera = page.getByRole('row', { name: new RegExp(nombreSede) });
      await expect(filaPapelera).toBeVisible();

      const resultadosPapelera = await crearAxeBuilder(page).analyze();
      expect(resultadosPapelera.violations).toEqual([]);

      await filaPapelera.getByRole('button', { name: 'Restaurar' }).click();
      await expect(page.getByText(`${nombreSede} restaurada.`)).toBeVisible();
      await expect(filaPapelera).toHaveCount(0);

      await page.goto('/sedes');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Todas' }).click();
      await expect(filaSede(page, nombreSede)).toBeVisible();

      // Limpieza: sacarla de "Activas" reales para no ensuciar Visitanos/el registro.
      await abrirDetalleDesdeFila(page, filaSede(page, nombreSede));
      await page.getByRole('button', { name: 'Desactivar' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Desactivar la Sede ${nombreSede}?` })
        .getByRole('button', { name: 'Sí, desactivar' })
        .click();
      await expect(page.getByText('Sede desactivada.')).toBeVisible();
    });
  });
}
