import {
  test,
  expect,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  crearPersonaActiva,
  auditar,
  verificarQueElFocoCiclaEnElPanel,
} from './helpers';
import { armarDiscipuladoYPropuesta } from './discipulado-en-la-base.cjs';

/**
 * specs/005-roles-permisos-acceso, Historia 2 (T028/T029): ascender a una
 * Persona es un flujo crítico — el modal de roles abierto (y con un
 * rechazo a la vista) corre axe en modo claro y oscuro. El listado solo, sin
 * modal, ya lo audita axe-todas-las-rutas.spec.ts.
 *
 * El tema se fuerza por localStorage igual que el smoke de rutas: el default
 * de la app es claro (D106), no el del sistema, así que `colorScheme` solo no
 * alcanzaría para ver el modo oscuro.
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }
    });

    test('el Admin otorga y quita un rol de cargo, también Discipulador sin discipulados a cargo', async ({ page }) => {
      const sufijo = `${tema}-${Date.now()}`;
      const apellido = `Roles${sufijo}`;
      await crearPersonaActiva(`e2e-roles-${sufijo}@example.com`, apellido);

      await loguearseComoAdminE2E(page);
      await page.goto(`/personas?q=${apellido}`);
      await page.waitForLoadState('networkidle');

      await page.getByRole('main').getByRole('button', { name: `Cambiar roles de E2E ${apellido}` }).click();
      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      expect((await auditar(page, ['region'])).violations).toEqual([]);

      await panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' }).click();
      await expect(panel.getByRole('button', { name: 'Quitar el rol de Líder de curso' })).toBeVisible();
      await expect(panel.getByText('Tiene este rol')).toHaveCount(1);

      // specs/004, T058 (D137, cierra H-127): sin discipulados ni propuestas,
      // quitar Discipulador se ofrece y funciona. (Hasta la 004 la pantalla no
      // lo ofrecía nunca: la guarda fallaba cerrada.) El caso con discipulados
      // está abajo, en "T058".
      await panel.getByRole('button', { name: 'Otorgar el rol de Discipulador/a' }).click();
      await panel.getByRole('button', { name: 'Quitar el rol de Discipulador/a' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar el rol' }).click();
      await expect(panel.getByRole('button', { name: 'Otorgar el rol de Discipulador/a' })).toBeVisible();
      expect((await auditar(page, ['region'])).violations).toEqual([]);

      await panel.getByRole('button', { name: 'Quitar el rol de Líder de curso' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quitar el rol' }).click();
      await expect(panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' })).toBeVisible();

      await panel.getByRole('button', { name: 'Cerrar', exact: true }).click();

      // Historia 6 (T056): el historial muestra los cuatro cambios REALES, el
      // más reciente primero, con quién los hizo.
      await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
      const historial = page.getByRole('dialog');
      await expect(historial.getByRole('heading', { name: `Historial de roles de E2E ${apellido}` })).toBeVisible();
      const filas = historial.getByRole('listitem');
      await expect(filas).toHaveCount(4);
      await expect(filas.nth(0)).toContainText('Quitado: Líder de curso');
      await expect(filas.nth(1)).toContainText('Quitado: Discipulador/a');
      await expect(filas.nth(2)).toContainText('Otorgado: Discipulador/a');
      await expect(filas.nth(3)).toContainText('Otorgado: Líder de curso');
      for (let i = 0; i < 4; i++) await expect(filas.nth(i)).toContainText('Lo hizo');
      expect((await auditar(page, ['region'])).violations).toEqual([]);
    });

    // specs/004, T058 (FR-043, cierra H-127): con un discipulado activo y una
    // propuesta pendiente, el panel no ofrece quitar Discipulador: nombra a
    // cada uno, dice cómo destrabarlo y enlaza adonde se hace — el discipulado
    // a su Grupo, la propuesta a su Solicitud. Las páginas de destino son de
    // otros lotes: acá se verifica el href (brief del lote D).
    test('con un discipulado y una propuesta, el panel los nombra y enlaza a cada uno (T058)', async ({ page }) => {
      const sufijo = `${tema}-${Date.now()}`;
      const apellido = `ConDiscipulado${sufijo}`;
      const emails = {
        discipuladora: `e2e-con-discipulado-${sufijo}@example.com`,
        inscripta: `e2e-inscripta-${sufijo}@example.com`,
        pide: `e2e-pide-${sufijo}@example.com`,
      };
      await crearPersonaActiva(emails.discipuladora, apellido);
      await crearPersonaActiva(emails.inscripta, `Inscripta${sufijo}`);
      await crearPersonaActiva(emails.pide, `Pide${sufijo}`);
      const { grupoId, solicitudId } = await armarDiscipuladoYPropuesta(emails);

      await loguearseComoAdminE2E(page);
      await page.goto(`/personas?q=${apellido}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('main').getByRole('button', { name: `Cambiar roles de E2E ${apellido}` }).click();
      const panel = page.getByRole('dialog');

      await expect(panel.getByRole('button', { name: 'Quitar el rol de Discipulador/a' })).toHaveCount(0);
      await expect(panel.getByText('Todavía no se le puede quitar el rol de Discipulador, porque tiene a su cargo:')).toBeVisible();
      await expect(panel.getByRole('link', { name: `El discipulado de E2E Inscripta${sufijo}` })).toHaveAttribute('href', `/grupos/${grupoId}`);
      await expect(panel.getByRole('link', { name: `Una propuesta pendiente para E2E Pide${sufijo}` })).toHaveAttribute(
        'href',
        `/solicitudes/${solicitudId}`,
      );
      await expect(panel.getByText('Entrá a cada uno para reasignar el discipulado o retirar la propuesta.')).toBeVisible();
      expect((await auditar(page, ['region'])).violations).toEqual([]);
    });
  });
}

test('un Pastor ve el listado pero no la acción de cambiar roles (personas.gestionar_roles es solo Admin)', async ({ page }) => {
  await loguearseComoPastorE2E(page);
  await page.goto('/personas');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Personas' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Cambiar roles/ })).toHaveCount(0);
  // Historia 6: el historial pide el mismo permiso (personas.gestionar_roles).
  await expect(page.getByRole('main').getByRole('button', { name: /Ver el historial de roles/ })).toHaveCount(0);
});

// Historia 6 (T056): los demás estados del historial. El vacío con una Persona
// real; el error y la fila del comando de recuperación interceptando la
// respuesta de la API (el CLI no se puede correr desde el navegador).
test.describe('historial de roles (T056)', () => {
  test('vacío: una Persona sin cambios lo dice, y aclara que lo anterior al registro no aparece', async ({ page }) => {
    const apellido = `SinHistorial${Date.now()}`;
    await crearPersonaActiva(`e2e-sin-historial-${Date.now()}@example.com`, apellido);
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
    const historial = page.getByRole('dialog');
    await expect(historial.getByText(`Todavía no hay cambios de rol registrados para E2E ${apellido}.`)).toBeVisible();
    await expect(historial.getByText('Los cambios hechos antes de que existiera este registro no aparecen acá.')).toBeVisible();
  });

  test('cargando: se anuncia mientras la API no responde', async ({ page }) => {
    const apellido = `HistorialCargando${Date.now()}`;
    await crearPersonaActiva(`e2e-historial-cargando-${Date.now()}@example.com`, apellido);
    let liberar: () => void = () => {};
    const respuestaRetenida = new Promise<void>((resolve) => (liberar = resolve));
    await page.route('**/cambios-de-rol**', async (route) => {
      await respuestaRetenida;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
    });
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
    const historial = page.getByRole('dialog');
    await expect(historial.getByRole('status')).toHaveText('Cargando el historial…');
    liberar();
    await expect(historial.getByText(`Todavía no hay cambios de rol registrados para E2E ${apellido}.`)).toBeVisible();
    await expect(historial.getByRole('status')).toHaveCount(0);
  });

  test('error: lo dice con un Reintentar que vuelve a pedir', async ({ page, permitirErrorDeConsola }) => {
    permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 500/);
    const apellido = `HistorialError${Date.now()}`;
    await crearPersonaActiva(`e2e-historial-error-${Date.now()}@example.com`, apellido);
    // Falla hasta que se aprieta Reintentar — no "el primer pedido": en
    // desarrollo React monta el efecto dos veces (StrictMode) y el primero se
    // descarta, así que contar pedidos no dice qué ve la persona.
    let fallar = true;
    let pedidosDespuesDeReintentar = 0;
    await page.route('**/cambios-de-rol**', async (route) => {
      if (fallar) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'ERROR_INTERNO' }) });
      } else {
        pedidosDespuesDeReintentar += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
      }
    });
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
    const historial = page.getByRole('dialog');
    await expect(historial.getByRole('alert')).toContainText('No pudimos cargar el historial');
    fallar = false;
    await historial.getByRole('button', { name: 'Reintentar' }).click();
    await expect(historial.getByText(`Todavía no hay cambios de rol registrados para E2E ${apellido}.`)).toBeVisible();
    expect(pedidosDespuesDeReintentar).toBeGreaterThan(0);
  });

  test('la fila del comando de recuperación dice que se hizo fuera de la aplicación, no queda vacía (H-141)', async ({ page }) => {
    const apellido = `HistorialCli${Date.now()}`;
    await crearPersonaActiva(`e2e-historial-cli-${Date.now()}@example.com`, apellido);
    await page.route('**/cambios-de-rol**', async (route) => {
      const personaId = new URL(route.request().url()).searchParams.get('personaId');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'c1', personaId, rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPor: null, createdAt: '2026-09-25T15:00:00.000Z' },
          ],
          total: 1,
        }),
      });
    });
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
    const fila = page.getByRole('dialog').getByRole('listitem');
    await expect(fila).toContainText('Otorgado: Admin');
    await expect(fila).toContainText('Se hizo fuera de la aplicación, con el comando de recuperación, por quien tuviera acceso al servidor.');
    await expect(fila).not.toContainText('Lo hizo');
  });
});

// T062 (D132): la pantalla no ofrece "Quitar" donde la API va a rechazar —
// decide con `puedeQuitarRol` (la misma función), no con "¿lo tiene?". El caso
// de Discipulador (3) lo cubren, arriba, el test del Admin que otorga y quita
// (sin discipulados, se ofrece) y el de T058 (con discipulados, se explica).
test.describe('T062: el modal no ofrece quitar lo que no se puede quitar', () => {
  test('caso 1: al Admin sembrado nadie le puede quitar el rol de Admin (FR-002)', async ({ page }) => {
    await loguearseComoAdminE2E(page);
    await page.goto('/personas?q=e2e-sembrado@example.com');
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: 'Cambiar roles de E2E Sembrado' }).click();
    const panel = page.getByRole('dialog');
    await expect(panel.getByText('Tiene este rol')).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'Quitar el rol de Admin' })).toHaveCount(0);
    await expect(panel.getByText('Esta Persona es el Admin principal de la instalación')).toBeVisible();
    // Sus otros roles sí se pueden otorgar.
    await expect(panel.getByRole('button', { name: 'Otorgar el rol de Pastor/a' })).toBeVisible();
  });

  test('caso 2: una Admin no puede quitarse su propio rol de Admin (FR-010)', async ({ page }) => {
    // e2e-admin es `admin` a secas (T073): lo que no tiene se ofrece para
    // otorgar. Que otro rol propio SÍ se pueda quitar lo cubren los unitarios de
    // puedeQuitarRol y la integración (no se le otorgan roles a esta Persona
    // acá: la comparten los demás specs).
    await loguearseComoAdminE2E(page);
    await page.goto('/personas?q=e2e-admin@example.com');
    await page.waitForLoadState('networkidle');
    await page.getByRole('main').getByRole('button', { name: 'Cambiar roles de E2E E2E' }).click();
    const panel = page.getByRole('dialog');
    await expect(panel.getByText('Tiene este rol')).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'Quitar el rol de Admin' })).toHaveCount(0);
    await expect(panel.getByText('No podés quitarte tu propio rol de Admin')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' })).toBeVisible();
  });
});

/**
 * T029 (H-131, corrección en e336a48): el foco queda atrapado en los dos
 * paneles de Personas. Se afirma la SECUENCIA de controles enfocados, ciclando
 * en orden con Tab y al revés con Shift+Tab — ver verificarQueElFocoCiclaEnElPanel.
 * Un solo tema: el foco no depende del color.
 */
test.describe('foco del teclado en los paneles (T029)', () => {
  test('el panel de roles atrapa el foco y lo hace ciclar en orden', async ({ page }) => {
    const apellido = `FocoRoles${Date.now()}`;
    await crearPersonaActiva(`e2e-foco-roles-${Date.now()}@example.com`, apellido);
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('main').getByRole('button', { name: `Cambiar roles de E2E ${apellido}` }).click();
    const panel = page.getByRole('dialog');
    await expect(panel.getByRole('button', { name: 'Otorgar el rol de Líder de curso' })).toBeVisible();

    await verificarQueElFocoCiclaEnElPanel(page, panel);
  });

  test('el panel de historial atrapa el foco y lo hace ciclar en orden', async ({ page }) => {
    const apellido = `FocoHistorial${Date.now()}`;
    await crearPersonaActiva(`e2e-foco-historial-${Date.now()}@example.com`, apellido);
    await loguearseComoAdminE2E(page);
    await page.goto(`/personas?q=${apellido}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('main').getByRole('button', { name: `Ver el historial de roles de E2E ${apellido}` }).click();
    const panel = page.getByRole('dialog');
    // Estado final (vacío) antes de contar controles: mientras carga, el panel tiene otros.
    await expect(panel.getByText(`Todavía no hay cambios de rol registrados para E2E ${apellido}.`)).toBeVisible();

    await verificarQueElFocoCiclaEnElPanel(page, panel);
  });
});
