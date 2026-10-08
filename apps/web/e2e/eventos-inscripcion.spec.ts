import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { anotarPorApi, crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';

/**
 * spec 011, T054 — anotarse desde la página del Evento, en celular y con axe
 * en claro y oscuro: con cupo 2 y lista, dos confirmadas y la tercera en la
 * lista con su lugar; con aprobación, "en revisión"; lleno sin lista, botón
 * deshabilitado y explicado; sin sesión, "Anotarme" lleva al ingreso con el
 * `destino` de vuelta al Evento (FR-015 a FR-021, SC-001).
 */
const marca = `e2e-insc-${Date.now()}`;

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('cupo 2 con lista: la tercera queda en el lugar 1 de la lista @celular', async ({ page, baseURL }) => {
      const evento = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-${tema}-cupo`, requiereInscripcion: true, cupo: 2, permiteListaEspera: true });
      const emails = [1, 2, 3].map((n) => `e2e-insc-${tema}-${n}-${Date.now()}@example.com`);
      for (const [n, email] of emails.entries()) await crearPersonaActiva(baseURL!, email, `Persona${n + 1}`);
      await anotarPorApi(baseURL!, emails[0], evento.id);
      await anotarPorApi(baseURL!, emails[1], evento.id);

      await loguearseComoTest(page, emails[2]);
      await page.goto(`/eventos/${evento.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      await expect(page.getByText('El cupo está completo, pero podés anotarte en la lista de espera', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: 'Anotarme en la lista de espera' }).click();
      await expect(page.getByRole('heading', { name: `¿Te anotamos a ${evento.nombre}?` })).toBeFocused();
      expect((await auditar(page)).violations).toEqual([]);
      await page.getByRole('button', { name: 'Sí, anotarme' }).click();
      await expect(page.getByText('Lugar 1 en la lista de espera')).toBeVisible();
      await expect(page.getByText('Quedaste en el lugar 1 de la lista de espera', { exact: false })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
    });

    test('con aprobación queda en revisión; lleno sin lista, botón deshabilitado con explicación @celular', async ({ page, baseURL }) => {
      const conAprobacion = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-${tema}-aprob`, requiereInscripcion: true, requiereAprobacion: true });
      const lleno = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-${tema}-lleno`, requiereInscripcion: true, cupo: 1 });
      const ocupa = `e2e-insc-${tema}-ocupa-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, ocupa, 'Ocupa');
      await anotarPorApi(baseURL!, ocupa, lleno.id);
      const email = `e2e-insc-${tema}-aprob-${Date.now()}@example.com`;
      await crearPersonaActiva(baseURL!, email, 'Aprob');
      await loguearseComoTest(page, email);

      await page.goto(`/eventos/${conAprobacion.slug}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
      await expect(page.getByText('El equipo revisa cada inscripción y te avisa.')).toBeVisible();
      await page.getByRole('button', { name: 'Sí, anotarme' }).click();
      await expect(page.getByText('Inscripción en revisión')).toBeVisible();
      await expect(page.getByText('Recibimos tu inscripción. El equipo la revisa y te avisamos.')).toBeVisible();

      await page.goto(`/eventos/${lleno.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      const boton = page.getByRole('button', { name: 'Cupo completo' });
      await expect(boton).toBeDisabled();
      await expect(boton).toHaveAccessibleDescription('Ya no quedan lugares y este evento no tiene lista de espera.');
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}

test('sin sesión, "Anotarme" lleva al ingreso con el destino de vuelta al Evento (FR-020) @celular', async ({ page, baseURL }) => {
  const evento = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-sin-sesion`, requiereInscripcion: true });
  await page.goto(`/eventos/${evento.slug}`);
  await page.waitForLoadState('networkidle');
  const anotarme = page.getByRole('link', { name: 'Anotarme' });
  await expect(anotarme).toHaveAttribute('href', `/ingresar?destino=${encodeURIComponent(`/eventos/${evento.slug}?anotarme=1`)}`);
});

test('al volver con ?anotarme=1 se abre la confirmación sola (SC-001)', async ({ page, baseURL }) => {
  const evento = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-vuelta`, requiereInscripcion: true });
  const email = `e2e-insc-vuelta-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Vuelta');
  await loguearseComoTest(page, email);
  await page.goto(`/eventos/${evento.slug}?anotarme=1`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: `¿Te anotamos a ${evento.nombre}?` })).toBeVisible();
  await page.getByRole('button', { name: 'Sí, anotarme' }).click();
  await expect(page.getByText('Estás anotada')).toBeVisible();
});
