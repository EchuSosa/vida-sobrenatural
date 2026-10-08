import type { Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoAdminE2E } from './helpers';
import { apagarDisponibilidad, crearDiscipulador, crearPersona, estadoDeGrupo, estadoMiCamino, pedirVidaNuevaComo, sinScrollHorizontal, sinSesion } from './helpers';
import { campo, completarFecha, elegirHora } from '../../../scripts/e2e-campos-fecha-hora';
import { enLaWeb, loguearseEnLaWeb } from './helpers-006';

const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';

/**
 * specs/004, T061: el flujo crítico de punta a punta, cruzando lo que armaron
 * los lotes A, B y C — la Persona pide (por API, con un horario de miércoles)
 * → un Discipulador nuevo carga ese horario en /mi-disponibilidad y se prende
 * → el Admin lo ve sugerido en el cruce de /solicitudes/[id] y le propone →
 * el Discipulador acepta en /mis-discipulados → registra un Encuentro → pide
 * darlo por terminado → el Admin confirma en /grupos/[id] → la Persona ve
 * "¡Terminaste Vida Nueva!" en Mi camino (apps/web). Con axe en cada pantalla,
 * en claro y oscuro, y en los dos proyectos (`@celular`): el Discipulador lo
 * hace desde el teléfono.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Vida Nueva de punta a punta — modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test.beforeEach(async ({ page }) => {
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    async function sinViolaciones(page: Page) {
      if (colorScheme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
      else await expect(page.locator('html')).not.toHaveClass(/dark/);
      const { violations } = await auditar(page);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    }

    test('@celular pedir → disponibilidad → proponer → aceptar → Encuentro → terminar → "terminaste" en Mi camino', async ({ page, browser }, testInfo) => {
      test.setTimeout(120_000);
      const sufijo = `${colorScheme}-${testInfo.project.name}-${Date.now()}`;
      const persona = await crearPersona(`e2e-flujo-persona-${sufijo}@example.com`, { nombre: 'Tomás', apellido: `Flujo ${sufijo}`, genero: 'masculino' });
      const disc = await crearDiscipulador(`e2e-flujo-disc-${sufijo}@example.com`, { nombre: 'Rodrigo', apellido: `Flujo ${sufijo}`, genero: 'masculino' });
      const nombreDisc = `Rodrigo Flujo ${sufijo}`;

      try {
        // 1. La Persona pide Vida Nueva, los miércoles de 20 a 22 (ningún sembrado tiene ese horario).
        const solicitudId = await pedirVidaNuevaComo(persona.email, [{ diaSemana: 3, inicio: 20 * 60, fin: 22 * 60 }]);

        // 2. El Discipulador carga ese horario y prende su disponibilidad.
        await loguearseEnLaWeb(page, disc.email, colorScheme);
        await page.goto(enLaWeb('/mi-disponibilidad'));
        const estado = page.getByTestId('estado-disponibilidad');
        await expect(estado).toContainText('hasta que no cargues tus horarios no aparecés para nuevos discipulados');
        await page.getByLabel('Día', { exact: true }).first().selectOption({ label: 'Miércoles' });
        await elegirHora(campo(page, 'Desde').first(), '20:00');
        await elegirHora(campo(page, 'Hasta').first(), '22:00');
        await page.getByRole('button', { name: 'Agregar franja' }).click();
        await expect(page.getByText('Miércoles 20:00 a 22:00')).toBeVisible();
        await page.getByRole('button', { name: 'Prender mi disponibilidad' }).click();
        await expect(estado).toContainText('Hoy el Admin te ve como disponible');
        await sinViolaciones(page);

        // 3. El Admin lo ve sugerido en el cruce y le propone.
        await sinSesion(page);
        await loguearseComoAdminE2E(page);
        await page.goto(`/solicitudes/${solicitudId}`);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Vida Nueva de Tomás Flujo ${sufijo}`);
        const franja = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Miércoles 20:00 a 22:00' }) });
        const sugerido = franja.getByRole('listitem').filter({ hasText: 'Sugerido' });
        await expect(sugerido).toContainText(nombreDisc);
        await sinViolaciones(page);
        await sugerido.getByRole('button', { name: 'Elegir' }).click();
        await page.getByRole('button', { name: `Proponer a ${nombreDisc}` }).click();
        await sinViolaciones(page);
        await page.getByRole('button', { name: `Sí, proponer a ${nombreDisc}` }).click();
        await expect(page.getByText(`Propuesta a ${nombreDisc}, hace 0 días.`)).toBeVisible();

        // 4. El Discipulador acepta desde Mis discipulados.
        await sinSesion(page);
        await loguearseEnLaWeb(page, disc.email, colorScheme);
        await page.goto(enLaWeb('/mis-discipulados'));
        const propuesta = page.getByRole('article', { name: new RegExp(`Tomás Flujo ${sufijo}`) });
        await expect(propuesta).not.toContainText('+54');
        await sinViolaciones(page);
        await propuesta.getByRole('button', { name: 'Aceptar a Tomás' }).click();
        await page.getByRole('button', { name: 'Sí, acepto' }).click();
        await expect(page.getByText(/Aceptaste\. Ya podés ver los datos de contacto/)).toBeVisible();
        expect(await sinScrollHorizontal(page)).toBe(true);
        await sinViolaciones(page);

        // 5. Registra un Encuentro.
        await page.getByRole('link', { name: /Ver el discipulado de Tomás/ }).click();
        await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Tomás Flujo ${sufijo}`) })).toBeVisible();
        const grupoId = new URL(page.url()).pathname.split('/mis-discipulados/')[1];
        await page.getByRole('button', { name: 'Registrar encuentro' }).click();
        const panel = page.getByRole('dialog', { name: 'Registrar encuentro' });
        await completarFecha(campo(panel, 'Fecha'), '2026-09-01');
        await panel.getByLabel('Capítulos').fill('1 al 12');
        await panel.getByRole('button', { name: 'Guardar encuentro' }).click();
        await expect(page.getByText('Encuentro registrado.')).toBeVisible();
        await expect(page.getByRole('listitem').filter({ hasText: 'Capítulos: 1 al 12' })).toBeVisible();
        await sinViolaciones(page);

        // 6. Pide darlo por terminado.
        await page.getByRole('button', { name: 'Pedir darlo por terminado' }).click();
        await page.getByRole('button', { name: 'Sí, pedirlo' }).click();
        await expect(page.getByText(/Falta que el Admin lo confirme/)).toBeVisible();
        await sinViolaciones(page);

        // 7. El Admin lo confirma en /grupos/[id].
        await sinSesion(page);
        await loguearseComoAdminE2E(page);
        await page.goto(`/grupos/${grupoId}`);
        await expect(page.getByRole('region', { name: 'Qué falta decidir' })).toContainText(/pidió darlo por terminado el/);
        await sinViolaciones(page);
        await page.getByRole('button', { name: 'Confirmar que terminó' }).click();
        await sinViolaciones(page);
        await page.getByRole('button', { name: 'Sí, dar por terminado' }).click();
        await expect(page.getByText('El discipulado quedó terminado.')).toBeVisible();
        expect(await estadoDeGrupo(grupoId)).toEqual({ estado: 'finalizado', motivoCierre: 'completado' });

        // 8. La Persona ve "terminaste" en Mi camino (apps/web).
        expect((await estadoMiCamino(persona.email)).estado).toBe('finalizado');
        const web = await browser.newContext({ baseURL: WEB_BASE_URL, colorScheme });
        try {
          const miCamino = await web.newPage();
          const { csrfToken } = await (await miCamino.request.get('/api/auth/csrf')).json();
          await miCamino.request.post('/api/auth/callback/test-login', { form: { email: persona.email, csrfToken } });
          await miCamino.goto('/mi-camino');
          await expect(miCamino.getByRole('region', { name: 'Vida Nueva' })).toContainText('¡Terminaste Vida Nueva!');
          await miCamino.waitForLoadState('networkidle');
          const { violations } = await auditar(miCamino);
          expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        } finally {
          await web.close();
        }
      } finally {
        // Que no quede apareciendo en los cruces de los demás specs.
        await apagarDisponibilidad(disc.email);
      }
    });
  });
}
