import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';

/**
 * spec 011, ampliación 2026-10-09 (FR-060 a FR-063, D229) — un Evento "para
 * mujeres desde 15 años": una mujer de 20 se anota respondiendo las preguntas
 * del Evento (FR-065, errores por campo); un varón ve para quién es y no ve el
 * botón. En celular y con axe en claro y oscuro.
 */
const marca = `e2e-dest-${Date.now()}`;
const hace = (anios: number) => `${new Date().getFullYear() - anios}-01-15`;

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('un varón ve para quién es el Evento y no el botón de anotarse @celular', async ({ page, baseURL }) => {
      const evento = await crearEventoComoAdmin(baseURL!, {
        nombre: `${marca}-${tema}-varon`,
        requiereInscripcion: true,
        destinatariosGenero: 'mujeres',
        edadMinima: 15,
      });
      const email = `e2e-dest-${tema}-varon-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, email, 'Varon', { genero: 'masculino', fechaNacimiento: hace(30) });
      await loguearseComoTest(page, email);
      await page.goto(`/eventos/${evento.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);

      await expect(page.getByTestId('destinatarios-evento')).toHaveText('Este evento es para mujeres desde 15 años.');
      const aviso = page.getByTestId('evento-no-corresponde');
      await expect(aviso).toContainText('Este evento es para mujeres desde 15 años.');
      await expect(aviso).toContainText('no podés anotarte desde acá');
      await expect(page.getByRole('button', { name: /Anotarme/ })).toHaveCount(0);
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
    });

    test('una mujer de 20 se anota respondiendo las preguntas del Evento @celular', async ({ page, baseURL }) => {
      const evento = await crearEventoComoAdmin(baseURL!, {
        nombre: `${marca}-${tema}-mujer`,
        requiereInscripcion: true,
        destinatariosGenero: 'mujeres',
        edadMinima: 15,
        preguntas: [
          { texto: '¿Sos celíaca?', tipo: 'si_no', obligatoria: true, sensible: true },
          { texto: '¿Participaste alguna vez de una jornada de sanidad?', tipo: 'opcion', opciones: ['Sí, hace mucho', 'No, nunca'], obligatoria: false, sensible: false },
        ],
      });
      const email = `e2e-dest-${tema}-mujer-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, email, 'Mujer', { genero: 'femenino', fechaNacimiento: hace(20) });
      await loguearseComoTest(page, email);
      await page.goto(`/eventos/${evento.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);

      await expect(page.getByTestId('evento-no-corresponde')).toHaveCount(0);
      await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
      await expect(page.getByRole('heading', { name: `¿Te anotamos a ${evento.nombre}?` })).toBeFocused();
      await expect(page.getByText('Solo lo ve el equipo que organiza; se borra 30 días después del evento.')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      // Sin responder la obligatoria: el error debajo de la pregunta y en el resumen, con foco (H-50).
      await page.getByRole('button', { name: 'Sí, anotarme' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estas respuestas' });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole('link', { name: 'Respondé esta pregunta para poder anotarte.' })).toBeVisible();
      await expect(page.getByRole('group', { name: '¿Sos celíaca?' })).toHaveAttribute('aria-invalid', 'true');
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);

      await page.getByRole('group', { name: '¿Sos celíaca?' }).getByLabel('No', { exact: true }).check();
      await page.getByLabel('No, nunca').check();
      await page.getByRole('button', { name: 'Sí, anotarme' }).click();
      await expect(page.getByText('Estás anotada').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Tus respuestas' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
    });
  });
}
