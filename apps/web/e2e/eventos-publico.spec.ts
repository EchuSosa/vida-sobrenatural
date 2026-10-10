import type { EventoDetalle } from '@vida-sobrenatural/shared-types';
import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { accionDeAdmin, anotarPorApi, crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';

/**
 * spec 011, T047 — la cartelera y la página pública de un Evento, en celular
 * (`@celular`) y con axe en claro y oscuro (Principio VII): qué entra a la
 * cartelera y en qué orden; fecha, lugar, costo y cupo como texto; el
 * informativo, el cancelado, el pasado y el de bautismo; el eliminado da
 * 404; metadatos, JSON-LD y sitemap (FR-001 a FR-006, FR-043, FR-046, SC-006).
 */

const marca = `e2e-pub-${Date.now()}`;
const eventos: Record<string, EventoDetalle> = {};
// Las horas son cercanas a propósito: la cartelera pagina de a 12 y los otros specs crean Eventos a +3 h o más.

test.beforeAll(async ({ baseURL }) => {
  const en = (horas: number) => new Date(Date.now() + horas * 3_600_000).toISOString();
  eventos.primero = await crearEventoComoAdmin(baseURL!, {
    nombre: `${marca} campamento`,
    inicio: en(1),
    lugar: 'Quinta Los Pinos',
    publicoObjetivo: 'Jóvenes de 15 a 25',
    requiereInscripcion: true,
    cupo: 2,
    permiteListaEspera: true,
    costo: '15000',
    instruccionesPago: 'Alias VIDA.SOBRENATURAL',
  });
  eventos.informativo = await crearEventoComoAdmin(baseURL!, { nombre: `${marca} noche de alabanza`, inicio: en(1.5) });
  eventos.bautismo = await crearEventoComoAdmin(baseURL!, { nombre: `${marca} bautismos`, inicio: en(2), tipo: 'bautismo' });
  eventos.cancelado = await crearEventoComoAdmin(baseURL!, { nombre: `${marca} cancelado`, inicio: en(1.2) });
  await accionDeAdmin(baseURL!, eventos.cancelado.id, 'cancelar');
  eventos.pasado = await crearEventoComoAdmin(baseURL!, { nombre: `${marca} pasado`, inicio: en(-72) });
  eventos.eliminado = await crearEventoComoAdmin(baseURL!, { nombre: `${marca} eliminado`, inicio: en(1.2) });
  await accionDeAdmin(baseURL!, eventos.eliminado.id, 'eliminar');
});

test('sitemap: incluye cada Evento publicado, no los eliminados (FR-006)', async ({ page }) => {
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`/eventos/${eventos.primero.slug}`);
  expect(sitemap).not.toContain(`/eventos/${eventos.eliminado.slug}<`);
});

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    });

    test('la cartelera muestra los próximos en orden y deja afuera cancelados, pasados y eliminados @celular', async ({ page }) => {
      await page.goto('/eventos');
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      await expect(page.getByRole('heading', { name: 'Eventos', level: 1 })).toBeVisible();
      const titulos = await page.getByRole('heading', { level: 2 }).filter({ hasText: marca }).allInnerTexts();
      expect(titulos).toEqual([`${marca} campamento`, `${marca} noche de alabanza`, `${marca} bautismos`]);
      const tarjeta = page.getByRole('link').filter({ hasText: `${marca} campamento` });
      await expect(tarjeta.getByText('Inscripción abierta')).toBeVisible();
      await expect(tarjeta.getByText('Quinta Los Pinos')).toBeVisible();
      await expect(page.getByRole('link').filter({ hasText: `${marca} noche de alabanza` }).getByText('Sin costo')).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
    });

    test('la página del Evento tiene todo como texto, metadatos y JSON-LD @celular', async ({ page }) => {
      await page.goto(`/eventos/${eventos.primero.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      await expect(page.getByRole('heading', { name: `${marca} campamento`, level: 1 })).toBeVisible();
      await expect(page.getByText('Inscripción abierta')).toBeVisible();
      await expect(page.getByText('Quinta Los Pinos')).toBeVisible();
      await expect(page.getByText('Jóvenes de 15 a 25')).toBeVisible();
      await expect(page.getByText(/\$\s?15\.000/)).toBeVisible();
      await expect(page.getByText('Quedan 2 lugares de 2')).toBeVisible();
      // Sin flyer: imagen por defecto con su texto alternativo (FR-003, FR-006).
      await expect(page.getByRole('img', { name: `Imagen de ${marca} campamento` })).toBeVisible();
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', `${marca} campamento — Vida Sobrenatural`);
      const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
      const jsonLd = bloques.map((b) => JSON.parse(b)).find((j) => j['@type'] === 'Event');
      expect(jsonLd).toMatchObject({ '@type': 'Event', name: `${marca} campamento`, eventStatus: 'https://schema.org/EventScheduled' });
      expect((await auditar(page)).violations).toEqual([]);
      await sinScrollHorizontal(page);
    });

    test('informativo, cancelado, pasado y bautismo dicen qué pasa; el eliminado no se encuentra @celular', async ({ page }) => {
      await page.goto(`/eventos/${eventos.informativo.slug}`);
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      await expect(page.getByText('No hace falta anotarse: vení directamente.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Anotarme' })).toHaveCount(0);

      await page.goto(`/eventos/${eventos.cancelado.slug}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Evento cancelado', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver los próximos eventos' })).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      await page.goto(`/eventos/${eventos.pasado.slug}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Ya pasó', { exact: true })).toBeVisible();

      // FR-046: el bautismo se pide desde Mi camino; sin "Anotarme" ni inscriptos.
      await page.goto(`/eventos/${eventos.bautismo.slug}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('El bautismo se pide desde Mi camino', { exact: false })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ir a Mi camino' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Anotarme' })).toHaveCount(0);
      expect((await auditar(page)).violations).toEqual([]);

      // FR-043: "No encontramos esta página". La respuesta ya empezó a transmitirse
      // (loading.tsx), así que Next la marca `noindex` en vez de cambiar el código.
      await page.goto(`/eventos/${eventos.eliminado.slug}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible();
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    });
  });
}

test('DEMO-17: con sesión, la tarjeta de un Evento al que ya se anotó dice "Ya te anotaste" en lugar del estado @celular', async ({ page, baseURL }) => {
  const nombre = `e2e-anotada-${Date.now()}`;
  const evento = await crearEventoComoAdmin(baseURL!, { nombre, inicio: new Date(Date.now() + 0.5 * 3_600_000).toISOString(), requiereInscripcion: true });
  const email = `e2e-anotada-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Anotada');
  await anotarPorApi(baseURL!, email, evento.id);

  await loguearseComoTest(page, email);
  await page.goto('/eventos');
  const tarjeta = page.getByRole('link').filter({ hasText: nombre });
  await expect(tarjeta.getByText('Ya te anotaste')).toBeVisible();
  await expect(tarjeta.getByText('Inscripción abierta')).toHaveCount(0);
  expect((await auditar(page)).violations).toEqual([]);
});
