import type { Page } from '@playwright/test';
import { formatearDiaDeServicio, type GrillaDeTurnos } from '@vida-sobrenatural/shared-types';
import { test, expect, auditar, esperarTema, sinScrollHorizontal, salirDeLaPagina } from './helpers';
import { api, tokenDe } from './helpers-006';
import { entrarConTema } from './helpers-009';
import { EMAILS_017, MIEMBRO_017, MINISTERIO_017, primerDomingo, reiniciarTurnos } from './helpers-017';
import { CONSOLA_500, TEXTO_ERROR_INTERNO, apiCaida, contarPedidos, tresClics } from '../../../scripts/e2e-casos-infelices';

/**
 * spec 017, US2 y US3 (T020; D252–D256): la líder arma y publica el rol desde "Mi ministerio" y la
 * persona ve su próximo turno en el Inicio y en "Mis turnos". Casos infelices: API caída al sumar a
 * alguien y en la tarjeta del Inicio, y tres toques en "Sí, publicar" (un solo pedido).
 */
const fecha = () => formatearDiaDeServicio(primerDomingo(), 'es');

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle');
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

/** La líder (por la API) suma al miembro en Seguridad el primer domingo y publica. */
async function asignarYPublicar(baseURL: string) {
  const token = await tokenDe(baseURL, EMAILS_017.lider);
  const liderados = (await api(token, 'GET', '/ministerios/liderados')) as Array<{ id: string; nombre: string }>;
  const ministerioId = liderados.find((m) => m.nombre === MINISTERIO_017)!.id;
  const grilla = (await api(token, 'GET', `/ministerios/${ministerioId}/turnos`)) as GrillaDeTurnos;
  const miembro = grilla.integrantes.find((i) => `${i.persona.nombre} ${i.persona.apellido}` === MIEMBRO_017)!;
  const seguridad = grilla.areas.find((a) => a.nombre === 'Seguridad')!;
  await api(token, 'POST', `/ministerios/${ministerioId}/fechas/${primerDomingo()}/turnos`, { personaId: miembro.persona.id, celulaId: seguridad.id });
  await api(token, 'POST', `/ministerios/${ministerioId}/fechas/${primerDomingo()}/publicacion`);
}

async function abrirTurnos(page: Page) {
  await page.goto('/mi-ministerio');
  await page.getByRole('link', { name: 'Armar los turnos' }).click();
  // En dev, la primera vez la ruta se compila: se espera la navegación, no 5 s de una aserción.
  await page.waitForURL(/\/mi-ministerio\/[0-9a-f-]+\/turnos$/);
  await expect(page.getByRole('heading', { level: 1, name: `Turnos de ${MINISTERIO_017}` })).toBeVisible();
  return page.getByRole('region', { name: new RegExp(`^${fecha()}`, 'i') });
}

test.beforeEach(async () => {
  await reiniciarTurnos();
});
test.afterAll(async () => {
  await reiniciarTurnos();
});

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('⭐ la líder suma a alguien en Seguridad y publica la fecha @celular', async ({ page, baseURL }, testInfo) => {
      const email = testInfo.project.name === 'celular' ? EMAILS_017.liderCelular : EMAILS_017.lider;
      await entrarConTema(page, baseURL!, email, tema);
      const elegida = await abrirTurnos(page);
      await expect(elegida).toContainText('Borrador');
      const seguridad = elegida.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3, name: 'Seguridad' }) });
      await expect(seguridad).toContainText('Falta 1 persona');
      await sinViolaciones(page, tema);

      await seguridad.getByText('Agregar en Seguridad').click();
      const sumar = seguridad.getByRole('button', { name: new RegExp(`^Sumar a ${MIEMBRO_017}`) });
      await expect(sumar).toContainText('No sirvió en las últimas fechas');
      await sumar.click();
      await expect(page.getByText(`Listo: ${MIEMBRO_017} sirve el ${fecha()}.`)).toBeVisible();
      await expect(seguridad).toContainText('Completa');
      await expect(seguridad.getByRole('button', { name: `Quitar a ${MIEMBRO_017} del ${fecha()}` })).toBeVisible();

      await elegida.getByRole('button', { name: 'Publicar' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText(`¿Publicar el ${fecha()}?`);
      await expect(dialogo).toContainText('Se le avisa a la persona que tiene turno.');
      await sinViolaciones(page, tema);
      await dialogo.getByRole('button', { name: 'Sí, publicar' }).click();
      await expect(page.getByText(`Listo: el ${fecha()} quedó publicado.`)).toBeVisible();
      await expect(elegida).toContainText('Publicada');
      await expect(elegida.getByRole('button', { name: 'Publicar' })).toHaveCount(0);
      await sinScrollHorizontal(page, 360);
    });

    test('la persona ve su próximo turno en el Inicio y en Mis turnos', async ({ page, baseURL }) => {
      await asignarYPublicar(baseURL!);
      await entrarConTema(page, baseURL!, EMAILS_017.miembro, tema);
      await page.goto('/inicio');
      const tarjeta = page.getByRole('region', { name: 'Tu próximo turno' });
      await expect(tarjeta).toContainText(`${fecha()} — ${MINISTERIO_017} — Seguridad`);
      await sinViolaciones(page, tema);
      await tarjeta.getByRole('link', { name: 'Ver mis turnos' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Mis turnos' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: `${MINISTERIO_017} — Seguridad` })).toContainText(fecha());
      await sinViolaciones(page, tema);
    });
  });
}

test('sin turnos publicados, el Inicio no muestra la tarjeta y Mis turnos lo dice', async ({ page, baseURL }) => {
  await entrarConTema(page, baseURL!, EMAILS_017.miembro, 'claro');
  await page.goto('/inicio');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('region', { name: 'Tu próximo turno' })).toHaveCount(0);
  await page.goto('/mis-turnos');
  await expect(page.getByText('Todavía no tenés turnos publicados.')).toBeVisible();
});

test('si la API falla en la tarjeta del Inicio, lo dice ahí, el resto sigue y "Reintentar" la trae @celular', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await asignarYPublicar(baseURL!);
  await entrarConTema(page, baseURL!, EMAILS_017.miembro, 'claro');
  const caida = await apiCaida(page, 'GET', /\/turnos\/me$/);
  await page.goto('/inicio');
  const tarjeta = page.getByRole('region', { name: 'Tu próximo turno' });
  await expect(tarjeta).toContainText('No pudimos cargar tus turnos.');
  await expect(page.getByRole('region', { name: 'Tu camino' })).toBeVisible();
  expect(caida.intentos).toBeGreaterThanOrEqual(1);
  await page.unrouteAll();
  await tarjeta.getByRole('button', { name: 'Reintentar' }).click();
  await expect(tarjeta).toContainText(`${MINISTERIO_017} — Seguridad`);
});

test('si la API falla al sumar a alguien, avisa con "Reintentar" y la celda sigue igual', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await entrarConTema(page, baseURL!, EMAILS_017.lider, 'claro');
  const elegida = await abrirTurnos(page);
  const caida = await apiCaida(page, 'POST', /\/fechas\/[\d-]+\/turnos$/);
  const seguridad = elegida.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3, name: 'Seguridad' }) });
  await seguridad.getByText('Agregar en Seguridad').click();
  await seguridad.getByRole('button', { name: new RegExp(`^Sumar a ${MIEMBRO_017}`) }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  expect(caida.intentos).toBe(1);
  await expect(seguridad).toContainText('Falta 1 persona');
});

test('tres toques en "Sí, publicar" mandan un solo pedido', async ({ page, baseURL }) => {
  await entrarConTema(page, baseURL!, EMAILS_017.lider, 'claro');
  const elegida = await abrirTurnos(page);
  const pedidos = contarPedidos(page, 'POST', /\/publicacion$/);
  await elegida.getByRole('button', { name: 'Publicar' }).click();
  await tresClics(page.getByRole('alertdialog').getByRole('button', { name: 'Sí, publicar' }));
  await expect(elegida).toContainText('Publicada');
  expect(pedidos.n).toBe(1);
});

test.describe('"No puedo ir" (US4, D257)', () => {
  for (const tema of ['claro', 'oscuro'] as const) {
    test.describe(`modo ${tema}`, () => {
      test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

      test('la persona avisa con un motivo; la líder ve que falta cubrir y el motivo @celular', async ({ page, baseURL }) => {
        await asignarYPublicar(baseURL!);
        await entrarConTema(page, baseURL!, EMAILS_017.miembro, tema);
        await page.goto('/mis-turnos');
        await page.getByRole('button', { name: `No puedo ir el ${fecha()}` }).click();
        const dialogo = page.getByRole('alertdialog');
        await expect(dialogo).toContainText(`¿No podés ir el ${fecha()}?`);
        await dialogo.getByLabel('Motivo (opcional)').fill('Tengo un viaje');
        await sinViolaciones(page, tema);
        await dialogo.getByRole('button', { name: 'Avisar que no puedo' }).click();
        await expect(page.getByText(`Listo: le avisamos a tu líder que no podés ir el ${fecha()}.`)).toBeVisible();
        await expect(page.getByText('Todavía no tenés turnos publicados.')).toBeVisible();

        // Salir de la página antes de borrar las cookies (docs/24: pedidos en vuelo).

        await salirDeLaPagina(page);

        await page.context().clearCookies();
        await entrarConTema(page, baseURL!, EMAILS_017.lider, tema);
        const elegida = await abrirTurnos(page);
        const seguridad = elegida.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3, name: 'Seguridad' }) });
        await expect(seguridad).toContainText(`${MIEMBRO_017} avisó que no puede ir`);
        await expect(seguridad).toContainText('Motivo: Tengo un viaje');
        await expect(seguridad).toContainText('Falta 1 persona');
      });
    });
  }

  test('tres toques en "Avisar que no puedo" mandan un solo pedido', async ({ page, baseURL }) => {
    await asignarYPublicar(baseURL!);
    await entrarConTema(page, baseURL!, EMAILS_017.miembro, 'claro');
    await page.goto('/mis-turnos');
    const pedidos = contarPedidos(page, 'POST', /\/cancelacion$/);
    await page.getByRole('button', { name: `No puedo ir el ${fecha()}` }).click();
    await tresClics(page.getByRole('alertdialog').getByRole('button', { name: 'Avisar que no puedo' }));
    await expect(page.getByText('Todavía no tenés turnos publicados.')).toBeVisible();
    expect(pedidos.n).toBe(1);
  });

  test('si la API falla, avisa con "Reintentar" y el turno sigue en la lista', async ({ page, baseURL, permitirErrorDeConsola }) => {
    permitirErrorDeConsola(CONSOLA_500);
    await asignarYPublicar(baseURL!);
    await entrarConTema(page, baseURL!, EMAILS_017.miembro, 'claro');
    await page.goto('/mis-turnos');
    const caida = await apiCaida(page, 'POST', /\/cancelacion$/);
    await page.getByRole('button', { name: `No puedo ir el ${fecha()}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Avisar que no puedo' }).click();
    await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(caida.intentos).toBe(1);
    await page.reload();
    await expect(page.getByRole('button', { name: `No puedo ir el ${fecha()}` })).toBeVisible();
  });
});
