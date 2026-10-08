import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { crearPersonaActiva } from './helpers-011';
import { usarTema } from './helpers-006';
import { sembrarAvisos, sinLeerDe } from './helpers-012';

/**
 * spec 012, T019 — la pestaña Avisos en celular (360 px): contador con texto
 * accesible, "Sin leer" con ícono, tocar un aviso lleva a su destino y baja el
 * contador, el manual completo con saltos de línea, "Marcar todos", estado
 * vacío, paginado por URL, el error de "Marcar todos", "99+" y axe en los dos
 * temas (US1-1 a US1-7, SC-003, SC-008, FR-009, D150).
 */
test.use({ viewport: { width: 360, height: 780 } });

const marca = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const pestanaAvisos = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Avisos/ });

async function personaConSesion(page: import('@playwright/test').Page, baseURL: string, clave: string) {
  const email = `e2e-avisos-${clave}-${marca()}@example.com`;
  const id = await crearPersonaActiva(baseURL, email, 'Avisos');
  await loguearseComoTest(page, email);
  return { id, email };
}

test('contador, "Sin leer" y tocar un aviso lleva a su destino y baja el contador @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'destino');
  const [primero] = await sembrarAvisos(id, [
    { evento: 'discipulado.propuesta_aceptada', params: { solicitudId: 's', grupoId: 'g', discipuladorId: 'd' } },
    { evento: 'discipulado.finalizacion_confirmada' },
    { tipo: 'manual', titulo: 'Culto especial', mensaje: 'Este domingo hay culto especial.' },
    { evento: 'discipulado.baja_confirmada', params: { grupoId: 'g', inscripcionId: 'i' }, leida: true },
  ]);
  await page.goto('/avisos');
  await page.waitForLoadState('networkidle');

  // US1-1: número + texto accesible, no solo color (D81).
  await expect(pestanaAvisos(page)).toHaveAccessibleName('Avisos 3 avisos sin leer');
  await expect(page.getByRole('link', { name: /Sin leer.*¡Ya tenés quien te acompañe en Vida Nueva!/ })).toBeVisible();
  await expect(page.getByText('Sin leer', { exact: true })).toHaveCount(3);

  // US1-2, SC-003: un toque y llega; al volver, el contador bajó.
  await page.getByRole('link', { name: /¡Ya tenés quien te acompañe en Vida Nueva!/ }).click();
  await expect(page).toHaveURL(/\/mi-camino$/);
  expect(await sinLeerDe(id)).toBe(2);
  await page.goto('/avisos');
  await expect(pestanaAvisos(page)).toHaveAccessibleName('Avisos 2 avisos sin leer');
  await expect(page.getByRole('link', { name: /¡Ya tenés quien te acompañe/ })).not.toContainText('Sin leer');
  expect(primero).toBeTruthy();
});

test('el aviso manual se ve completo, con sus saltos de línea y sin enlaces @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'manual');
  const mensaje = 'Primera línea del aviso.\n\nSegunda línea con https://ejemplo.org/retiro';
  await sembrarAvisos(id, [{ tipo: 'manual', titulo: 'Retiro de otoño', mensaje }]);
  await page.goto('/avisos');
  await page.getByRole('link', { name: /Retiro de otoño/ }).click();
  await expect(page).toHaveURL(/\/avisos\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Retiro de otoño' })).toBeVisible();
  const cuerpo = page.getByText('Primera línea del aviso.');
  await expect(cuerpo).toHaveCSS('white-space', 'pre-line');
  expect(await cuerpo.innerText()).toContain('\n');
  await expect(page.getByRole('link', { name: /ejemplo\.org/ })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Avisos' })).toHaveAttribute('href', '/avisos');
  expect(await sinLeerDe(id)).toBe(0);
});

test('"Marcar todos como leídos" saca el contador y confirma (US1-4) @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'todos');
  await sembrarAvisos(id, [{}, {}, {}]);
  await page.goto('/avisos');
  await page.waitForLoadState('networkidle');
  const boton = page.getByRole('button', { name: 'Marcar todos como leídos' });
  // D150: 44 px de alto y letra de 16 px.
  expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(boton).toHaveCSS('font-size', '16px');
  await boton.click();
  await expect(page.getByText('Listo, marcamos todos como leídos.')).toBeVisible();
  await expect(pestanaAvisos(page)).toHaveAccessibleName('Avisos');
  await expect(page.getByRole('button', { name: 'Marcar todos como leídos' })).toHaveCount(0);
  expect(await sinLeerDe(id)).toBe(0);
});

test('si "Marcar todos" falla: mensaje con "Reintentar" y código, y el contador no cambia (US1-7) @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'error');
  await sembrarAvisos(id, [{}, {}]);
  await page.route('**/avisos/leer-todos', (ruta) =>
    ruta.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: JSON.stringify({ type: 'about:blank', title: 'Error', status: 500, code: 'ERROR_INTERNO', detail: 'x', requestId: 'req-e2e-123' }),
    }),
  );
  await page.goto('/avisos');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Marcar todos como leídos' }).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'No pudimos marcar los avisos' });
  await expect(alerta).toBeVisible();
  await expect(alerta).toContainText('Código de referencia: req-e2e-123');
  await expect(alerta.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(pestanaAvisos(page)).toHaveAccessibleName('Avisos 2 avisos sin leer');
  expect(await sinLeerDe(id)).toBe(2);
});

test('estado vacío con "Ir a Mi camino" (US1-5) @celular', async ({ page, baseURL }) => {
  await personaConSesion(page, baseURL!, 'vacio');
  await page.goto('/avisos');
  await expect(page.getByText('Acá vas a ver las novedades de tu camino y los avisos de la iglesia.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir a Mi camino' })).toHaveAttribute('href', '/mi-camino');
  await expect(page.getByRole('button', { name: 'Marcar todos como leídos' })).toHaveCount(0);
});

test('con 25 avisos pagina de a 20 por URL (US1-6) @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'paginas');
  await sembrarAvisos(id, Array.from({ length: 25 }, (_, i) => ({ leida: i > 2 })));
  await page.goto('/avisos');
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Siguiente/ })).toHaveAttribute('href', '/avisos?pagina=2');
  await page.getByRole('link', { name: /^Siguiente/ }).click();
  await expect(page).toHaveURL(/\/avisos\?pagina=2$/);
  await expect(page.getByRole('list').first().getByRole('listitem')).toHaveCount(5);
  // docs/15 punto 5: una página que no existe se corrige en la URL.
  await page.goto('/avisos?pagina=9');
  await expect(page).toHaveURL(/\/avisos\?pagina=2$/);
});

test('más de 99 sin leer muestra "99+" con el número real en el texto accesible @celular', async ({ page, baseURL }) => {
  const { id } = await personaConSesion(page, baseURL!, 'muchos');
  await sembrarAvisos(id, Array.from({ length: 100 }, () => ({})));
  await page.goto('/avisos');
  await expect(pestanaAvisos(page)).toContainText('99+');
  await expect(pestanaAvisos(page)).toHaveAccessibleName('Avisos 100 avisos sin leer');
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe sin violaciones en Avisos y en el aviso completo, modo ${tema}; 16 px (SC-008, D150) @celular`, async ({ page, baseURL }) => {
    const { id, email } = await personaConSesion(page, baseURL!, `axe-${tema}`);
    const [manual] = await sembrarAvisos(id, [
      { tipo: 'manual', titulo: 'Aviso de prueba', mensaje: 'Una línea.\nOtra línea.' },
      { evento: 'evento.cancelado', params: { eventoId: 'e', evento: 'Retiro', slug: 'retiro' } },
      { evento: 'discipulado.finalizacion_confirmada', leida: true },
    ]);
    await usarTema(page, email, tema);
    await page.goto('/avisos');
    await page.waitForLoadState('networkidle');
    await esperarTema(page, tema);
    expect((await auditar(page)).violations).toEqual([]);
    await sinScrollHorizontal(page, 360);
    const tarjeta = page.getByRole('link', { name: /Aviso de prueba/ });
    await expect(tarjeta.getByText('Aviso de prueba')).toHaveCSS('font-size', '16px');
    expect((await tarjeta.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await page.goto(`/avisos/${manual}`);
    await page.waitForLoadState('networkidle');
    await esperarTema(page, tema);
    expect((await auditar(page)).violations).toEqual([]);
    await sinScrollHorizontal(page, 360);
  });
}
