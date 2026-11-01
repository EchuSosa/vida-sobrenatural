import type { Page } from '@playwright/test';
import { abrirEtapa, test, expect, loguearseComoTest, registrarPersonaDeTest } from './helpers';
import { crearEdicionPorApi, registrarVidaNuevaHecha } from './helpers-008';
import { EMAILS_009, MINISTERIOS_009, entrarConTema, prepararSinPostulacion } from './helpers-009';
import { crearEventoComoAdmin, crearPersonaActiva } from './helpers-011';
import { EMAILS_014, GRUPOS_014, prepararSinGrupo } from './helpers-014';
import { EMAILS_015, reiniciarEleccion, reiniciarYaSirvo } from './helpers-015';
import { CONSOLA_400, CONSOLA_500, TEXTO_ERROR_INTERNO, apiCaida, apiRechazaCampos, contarPedidos, tresClics } from '../../../scripts/e2e-casos-infelices';

/**
 * Pasada de casos infelices (Echu, 2026-11-01): por cada acción principal de la app, qué pasa
 * cuando la API falla, cuando rechaza un campo y cuando se toca dos veces. Lo que se afirma en
 * todos: la persona ve un mensaje que dice qué pasó (texto, no solo color), no pierde lo que había
 * elegido, puede volver a intentar, y un toque repetido no manda dos pedidos.
 */

const cardVs = (page: Page) => page.getByRole('region', { name: 'Vida de Servicio', exact: true });

test('Vida de Servicio: si la API falla el pedido no se manda y se puede reintentar; tres toques mandan uno solo', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  test.slow();
  const sufijo = `${Date.now()}`;
  const edicion = `e2e-infeliz-${sufijo}`;
  await crearEdicionPorApi(baseURL!, { nombre: edicion });
  const email = `e2e-infeliz-vs-${sufijo}@example.com`;
  await registrarPersonaDeTest(page, email);
  await registrarVidaNuevaHecha(baseURL!, email);
  await page.goto('/mi-camino');

  const caida = await apiCaida(page, 'POST', /\/vida-de-servicio\/solicitudes\/me$/);
  await cardVs(page).getByRole('button', { name: 'Quiero anotarme' }).click();
  await page.getByRole('alertdialog').getByRole('radio', { name: new RegExp(edicion) }).check();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Enviar mi pedido' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  expect(caida.intentos).toBe(1);
  await expect(cardVs(page)).not.toContainText('Recibimos tu pedido');

  await page.unrouteAll({ behavior: 'wait' });
  const pedidos = contarPedidos(page, 'POST', /\/vida-de-servicio\/solicitudes\/me$/);
  await cardVs(page).getByRole('button', { name: 'Quiero anotarme' }).click();
  await page.getByRole('alertdialog').getByRole('radio', { name: new RegExp(edicion) }).check();
  await tresClics(page.getByRole('alertdialog').getByRole('button', { name: 'Enviar mi pedido' }));
  await expect(cardVs(page)).toContainText('Recibimos tu pedido');
  expect(pedidos.n).toBe(1);
});

test('Elección de ministerio: si la API falla lo dice en pantalla y no se pierde lo elegido; tres toques mandan uno solo', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await reiniciarEleccion(EMAILS_015.persona);
  try {
    await entrarConTema(page, baseURL!, EMAILS_015.persona, 'claro');
    await page.goto('/mi-camino/ministerios/elegir');
    const seguridad = page.getByRole('group', { name: MINISTERIOS_009.bienvenida }).getByLabel('Seguridad');
    await seguridad.check();

    await apiCaida(page, 'PUT', /\/elecciones-ministerio\/me$/);
    await page.getByRole('button', { name: 'Enviar mi elección' }).click();
    await expect(page.getByRole('alert').filter({ hasText: TEXTO_ERROR_INTERNO })).toBeVisible();
    await expect(seguridad).toBeChecked();
    await expect(page.getByRole('button', { name: 'Enviar mi elección' })).toBeEnabled();

    await page.unrouteAll({ behavior: 'wait' });
    const pedidos = contarPedidos(page, 'PUT', /\/elecciones-ministerio\/me$/);
    await tresClics(page.getByRole('button', { name: 'Enviar mi elección' }));
    await expect(page).toHaveURL(/\/mi-camino(#.*)?$/);
    expect(pedidos.n).toBe(1);
  } finally {
    await reiniciarEleccion(EMAILS_015.persona);
  }
});

test('Postulación: un error de campo del SERVIDOR se muestra debajo del campo con resumen y foco; si la API falla, avisa y deja reintentar', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_400);
  permitirErrorDeConsola(CONSOLA_500);
  await prepararSinPostulacion(baseURL!, EMAILS_009.apta);
  try {
    await entrarConTema(page, baseURL!, EMAILS_009.apta, 'claro');
    await page.goto('/mi-camino/ministerios');
    await page.getByRole('link', { name: new RegExp(MINISTERIOS_009.bienvenida) }).click();
    await page.getByLabel('Seguridad').check();
    await page.getByLabel('¿Por qué te gustaría servir acá? (opcional)').fill('Me gusta recibir a la gente');

    // El texto pasa la validación local, pero el servidor lo rechaza: la pantalla lo ubica en su campo.
    await apiRechazaCampos(page, 'POST', /\/postulaciones\/me$/, [{ campo: 'motivacion', code: 'TEXTO_DEMASIADO_LARGO' }]);
    await page.getByRole('button', { name: 'Postularme' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' })).toBeFocused();
    await expect(page.locator('#campo-motivacion-error')).toContainText('500');

    await page.unrouteAll({ behavior: 'wait' });
    await apiCaida(page, 'POST', /\/postulaciones\/me$/);
    await page.getByRole('button', { name: 'Postularme' }).click();
    await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toBeEnabled();
    await expect(page.getByLabel('Seguridad')).toBeChecked();
  } finally {
    await prepararSinPostulacion(baseURL!, EMAILS_009.apta);
  }
});

test('"Ya sirvo": si la API falla, avisa y la persona sigue en el formulario con lo que eligió', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await reiniciarYaSirvo(EMAILS_015.yaSirvo);
  try {
    await entrarConTema(page, baseURL!, EMAILS_015.yaSirvo, 'claro');
    await page.goto('/mi-camino/ministerios/ya-sirvo');
    const seguridad = page.getByRole('group', { name: MINISTERIOS_009.bienvenida }).getByLabel('Seguridad');
    await seguridad.check();
    await apiCaida(page, 'POST', /\/camino\/me\/declaraciones$/);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ya sirvo en un ministerio');
    await expect(seguridad).toBeChecked();
  } finally {
    await reiniciarYaSirvo(EMAILS_015.yaSirvo);
  }
});

test('Perfil: si la API falla, el aviso es el texto de la app (no el detalle crudo del servidor)', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await registrarPersonaDeTest(page, `e2e-infeliz-perfil-${Date.now()}@example.com`);
  await page.goto('/perfil');
  await page.waitForLoadState('networkidle');
  await apiCaida(page, 'PATCH', /\/personas\/me$/);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  // El `detail` del 500 simulado es "x": antes era lo único que se veía.
  await expect(page.getByText('x', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
});

test('Grupo de extensión: si la API falla el pedido no queda hecho; tres toques en confirmar mandan uno solo', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await prepararSinGrupo(baseURL!, EMAILS_014.buscadora);
  try {
    await entrarConTema(page, baseURL!, EMAILS_014.buscadora, 'claro');
    await page.goto('/mi-camino/grupo-extension');
    await page.getByLabel('Tu dirección').fill('7 nro 1200');
    await page.getByRole('button', { name: 'Buscar grupos' }).click();
    const tarjeta = page.getByRole('region', { name: 'Grupos para vos' }).getByRole('article', { name: GRUPOS_014.cerca });

    await apiCaida(page, 'POST', /\/solicitudes\/me$/);
    await tarjeta.getByRole('button', { name: `Quiero sumarme a ${GRUPOS_014.cerca}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quiero sumarme' }).click();
    await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
    await expect(page.getByText(`Pediste sumarte a ${GRUPOS_014.cerca}`)).toHaveCount(0);

    await page.unrouteAll({ behavior: 'wait' });
    const pedidos = contarPedidos(page, 'POST', /\/solicitudes\/me$/);
    await tarjeta.getByRole('button', { name: `Quiero sumarme a ${GRUPOS_014.cerca}` }).click();
    await tresClics(page.getByRole('alertdialog').getByRole('button', { name: 'Sí, quiero sumarme' }));
    await expect(page.getByText(`Pediste sumarte a ${GRUPOS_014.cerca}`)).toBeVisible();
    expect(pedidos.n).toBe(1);
  } finally {
    await prepararSinGrupo(baseURL!, EMAILS_014.buscadora);
  }
});

test('Evento: si la API falla al anotarse, lo dice en la página y no queda anotada', async ({ page, baseURL, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const marca = `e2e-infeliz-${Date.now()}`;
  const evento = await crearEventoComoAdmin(baseURL!, { nombre: `${marca}-evento`, requiereInscripcion: true });
  const email = `${marca}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Infeliz');
  await loguearseComoTest(page, email);
  await page.goto(`/eventos/${evento.slug}`);
  await apiCaida(page, 'POST', /\/inscripciones\/me$/);
  await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, anotarme' }).click();
  await expect(page.getByRole('alert').filter({ hasText: TEXTO_ERROR_INTERNO })).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Anotarme', exact: true })).toBeVisible();
});

test('"Ya lo hice": si la API falla, avisa y la etapa no queda declarada', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await registrarPersonaDeTest(page, `e2e-infeliz-yalohice-${Date.now()}@example.com`);
  await page.goto('/mi-camino');
  const bautismo = await abrirEtapa(page, 'Bautismo');
  await apiCaida(page, 'POST', /\/camino\/me\/declaraciones$/);
  await bautismo.getByRole('button', { name: 'Ya lo hice' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, avisar a la iglesia' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  await page.reload();
  const deNuevo = await abrirEtapa(page, 'Bautismo');
  await expect(deNuevo.getByRole('button', { name: 'Ya lo hice' })).toBeVisible();
});
