import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, loguearseComoTest, registrarPersonaDeTest, sinScrollHorizontal } from './helpers';
import { usarTema } from './helpers-006';
import { EMAIL_LIDER_1, EMAIL_LIDER_2, crearEdicionPorApi, inscribirPorApi, registrarVidaNuevaHecha } from './helpers-008';

/**
 * spec 008, T042 + T053 + T060 (web) + T075 (Historias 4, 6 y 7; FR-019,
 * FR-023, FR-027, FR-032, FR-043; SC-004, SC-006): el Líder 1 ve su edición y
 * no la del Líder 2; carga material (un archivo de 16 MB muestra el error con
 * el límite); toma asistencia con un toque por ausencia y un solo envío; y
 * propone una baja con confirmación neutra. A 360 px primero, sin scroll
 * horizontal a 320 px. `axe` en claro y oscuro.
 */

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  // Después de navegar del lado del cliente, Next escribe el <title> un instante más tarde (metadatos en streaming).
  await expect(page).toHaveTitle(/.+/);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
    // Registra Personas por el flujo real y arma la edición por la API: más que el promedio.
    test.slow();

    test('Mis grupos: cada Líder ve lo suyo; material, asistencia y baja @celular', async ({ page, baseURL }) => {
      const sufijo = `${tema}-${Date.now()}`;
      const mia = `e2e-mia-${sufijo}`;
      const ajena = `e2e-ajena-${sufijo}`;
      const grupoId = await crearEdicionPorApi(baseURL!, { nombre: mia, semanas: 4, lideres: [EMAIL_LIDER_1] });
      const ajenaId = await crearEdicionPorApi(baseURL!, { nombre: ajena, lideres: [EMAIL_LIDER_2] });
      // Dos inscriptas (registradas por el flujo real en un contexto aparte).
      const contexto = await page.context().browser()!.newContext({ baseURL });
      const otra = await contexto.newPage();
      const inscriptas: string[] = [];
      for (const n of [1, 2]) {
        const email = `e2e-vs-lider-${n}-${sufijo}@example.com`;
        await registrarPersonaDeTest(otra, email);
        const id = await registrarVidaNuevaHecha(baseURL!, email);
        await inscribirPorApi(baseURL!, id, grupoId);
        inscriptas.push(id);
      }
      await contexto.close();

      await loguearseComoTest(page, EMAIL_LIDER_1);
      await usarTema(page, EMAIL_LIDER_1, tema);
      await page.goto('/mis-grupos');
      await expect(page.getByRole('link', { name: `Abrir ${mia}` })).toBeVisible();
      await expect(page.getByRole('link', { name: `Abrir ${ajena}` })).toHaveCount(0);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 320);
      await page.waitForLoadState('networkidle');
      await page.goto(`/mis-grupos/${ajenaId}`);
      await expect(page.getByRole('heading', { name: 'No encontramos esa edición' })).toBeVisible();

      // Detalle.
      await page.waitForLoadState('networkidle');
      await page.goto(`/mis-grupos/${grupoId}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(mia);
      await expect(page.getByTestId('inscripto')).toHaveCount(2);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 320);

      // Material: un archivo de 16 MB → el error con el límite, sin subir nada.
      await page.getByRole('link', { name: 'Cargar el material de la semana 4' }).click();
      await page.getByLabel('Título').fill('El servicio en la iglesia');
      await page.locator('#campo-archivosNuevos').setInputFiles({ name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(16 * 1024 * 1024, 0x20) });
      await page.getByRole('button', { name: 'Guardar material' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
      await expect(page.locator('[id="error-archivosNuevos.0"]')).toContainText('15 MB');
      await page.getByRole('button', { name: 'Sacar enorme.pdf' }).click();
      await page.getByLabel('Texto (opcional)').fill('Leé el capítulo 4.');
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Guardar material' }).click();
      await expect(page.getByText('Cargado, se ve el día de la fecha')).toBeVisible();

      // Asistencia: todos presentes, un toque marca la ausencia, un solo envío.
      await page.waitForLoadState('networkidle');
      await page.goto(`/mis-grupos/${grupoId}/asistencia`);
      await expect(page.getByTestId('contador-asistencia')).toHaveText('2 presentes, 0 ausentes');
      const botones = page.getByRole('main').getByRole('button', { pressed: true });
      await expect(botones).toHaveCount(2);
      await botones.first().click();
      await expect(page.getByTestId('contador-asistencia')).toHaveText('1 presente, 1 ausente');
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page, 320);
      const envios: string[] = [];
      page.on('request', (r) => {
        if (r.method() === 'PUT' && r.url().includes('/asistencia/')) envios.push(r.url());
      });
      await page.getByRole('button', { name: 'Guardar asistencia' }).click();
      await expect(page.getByText('Esta fecha ya tiene asistencia guardada')).toBeVisible();
      expect(envios).toHaveLength(1);

      // Proponer baja: confirmación neutra (D151).
      await page.waitForLoadState('networkidle');
      await page.goto(`/mis-grupos/${grupoId}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /^Proponer baja de/ }).first().click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toBeVisible();
      await expect(page.locator('[role="alertdialog"][data-tono="neutro"], [role="alertdialog"] [data-tono="neutro"]')).toHaveCount(1);
      await dialogo.getByLabel('Dejó de venir sin avisar').check();
      await sinViolaciones(page, tema);
      await dialogo.getByRole('button', { name: 'Proponer la baja' }).click();
      await expect(page.getByText(/Propusiste la baja \(abandonó\)/)).toBeVisible();
    });
  });
}
