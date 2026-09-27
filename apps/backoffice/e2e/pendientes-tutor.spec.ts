import {
  test,
  expect,
  loguearseComoAdminE2E,
  crearMenorPendienteTutor,
  crearPersonaActiva,
  auditar,
  verificarQueElFocoCiclaEnElPanel,
} from './helpers';

/**
 * H-29 (revisión manual ronda 2) / H-34 (ronda 3 — la red de regresión que
 * faltaba): activar un menor pendiente_tutor, con y sin tutor vinculado por
 * búsqueda. Corre en modo claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('activar un menor vinculando a un tutor ya registrado, encontrado por búsqueda', async ({ page }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      const emailTutor = `e2e-tutor-${sufijo}@example.com`;
      const apellidoTutor = `Tutor${sufijo}`;

      await crearMenorPendienteTutor(emailMenor);
      await crearPersonaActiva(emailTutor, apellidoTutor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await expect(fila).toBeVisible();
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();

      const resultados = await auditar(page, ['region']);
      expect(resultados.violations).toEqual([]);

      await panel.getByLabel('Buscar tutor ya registrado (opcional)').fill(apellidoTutor);
      const resultado = panel.getByRole('button', { name: new RegExp(apellidoTutor) });
      await expect(resultado).toBeVisible();
      await resultado.click();

      await expect(panel.getByText('Quitar')).toBeVisible();
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      // Escopado a <main> — no a `getByText('E2E Menor')` a secas: el toast
      // de éxito ("E2E Menor: caso activado.") repite el nombre y tarda unos
      // segundos en desaparecer (sonner), así que sin este scope el conteo
      // podía quedar en 1 aunque la fila ya se hubiera ido de la tabla.
      await expect(page.getByRole('main').getByText('E2E Menor')).toHaveCount(0);
    });

    test('activar un menor con los datos del tutor a mano', async ({ page }) => {
      const sufijo = `${colorScheme}-texto-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      await crearMenorPendienteTutor(emailMenor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      await panel.getByLabel('Nombre del tutor').fill('Tutor');
      await panel.getByLabel('Apellido del tutor').fill('de Prueba');
      await panel.getByLabel('Teléfono del tutor').fill('92219000009');
      await panel.getByRole('button', { name: 'Activar' }).click();

      await expect(panel).toBeHidden();
      // Ver el comentario del primer test — escopado a <main> por el mismo motivo.
      await expect(page.getByRole('main').getByText('E2E Menor')).toHaveCount(0);
    });

    test('H-71: el teléfono del tutor usa el selector de código de país; H-72: su error se limpia al escribir y revalida al salir', async ({
      page,
    }) => {
      const sufijo = `${colorScheme}-h71-${Date.now()}`;
      const emailMenor = `e2e-menor-${sufijo}@example.com`;
      await crearMenorPendienteTutor(emailMenor);

      await loguearseComoAdminE2E(page);
      await page.goto('/pendientes-tutor');
      await page.waitForLoadState('networkidle');

      const fila = page.getByText('E2E Menor').locator('..').locator('..');
      await fila.getByRole('button', { name: 'Activar' }).click();

      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();

      // H-71: código de país propio (D90), como en registro/Perfil/Sede —
      // antes era un Input plano de texto libre.
      await expect(panel.getByLabel('Código de país')).toHaveValue('+54');

      const telefono = panel.getByLabel('Teléfono del tutor');
      const errorTelefono = panel.locator('#campo-tutorTelefono-error');

      // H-72: formato inválido + salir del campo, sin haber enviado.
      await telefono.fill('12');
      await telefono.blur();
      await expect(errorTelefono).toBeVisible();
      await expect(errorTelefono).toHaveText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.');

      // Escribir de nuevo lo limpia al toque, antes de volver a salir del campo.
      await telefono.fill('123');
      await expect(errorTelefono).toBeHidden();

      // Corregido y fuera del campo: se queda limpio.
      await telefono.fill('92219000009');
      await telefono.blur();
      await expect(errorTelefono).toBeHidden();

      await expect(panel).toBeVisible();

      // Nunca se envió — cierra el caso para no dejar un "E2E Menor" de más
      // en la lista (el resto de este archivo busca filas por ese nombre).
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await fila.getByRole('button', { name: 'Cerrar el caso' }).click();
      await page
        .getByRole('alertdialog', { name: /¿Cerrar el caso de/ })
        .getByRole('button', { name: 'Sí, cerrar el caso' })
        .click();
      await expect(page.getByText('Caso cerrado.')).toBeVisible();
    });
  });
}

// Revisión del criterio de H-88: orden por columna (nombre y fecha de
// solicitud), resuelto en la API — no en memoria, esta cola pagina de
// verdad. Independiente del tema, como el resto de los tests de orden de
// esta app.
test('ordenar por Nombre se refleja en la URL, sobrevive a un F5, y se puede volver a Solicitado', async ({ page }) => {
  const sufijo = `orden-${Date.now()}`;
  const emailZeta = `e2e-zeta-${sufijo}@example.com`;
  const emailAlfa = `e2e-alfa-${sufijo}@example.com`;
  // Orden de creación (y por lo tanto de fecha de solicitud) a propósito
  // AL REVÉS del alfabético — si "Nombre" y "Solicitado" dieran el mismo
  // resultado, el test no probaría nada.
  await crearMenorPendienteTutor(emailZeta, 'Zeta', `Orden${sufijo}`);
  await crearMenorPendienteTutor(emailAlfa, 'Alfa', `Orden${sufijo}`);

  await loguearseComoAdminE2E(page);
  await page.goto('/pendientes-tutor');
  await page.waitForLoadState('networkidle');

  const filaZeta = page.getByRole('row', { name: /Zeta/ });
  const filaAlfa = page.getByRole('row', { name: /Alfa/ });

  // El listado ya trae otros casos (seed, y los de tests anteriores de
  // este archivo) — no importa la posición absoluta, solo el orden
  // RELATIVO entre Zeta y Alfa, que es lo que cada columna decide distinto.
  const nombres = page.locator('table tbody tr td:first-child');
  async function posicionesRelativas() {
    const textos = await nombres.allTextContents();
    return { zeta: textos.findIndex((t) => t.includes('Zeta')), alfa: textos.findIndex((t) => t.includes('Alfa')) };
  }

  // Default (fecha de solicitud, sin nada en la URL): Zeta se creó primero.
  await expect(filaZeta).toBeVisible();
  await expect(filaAlfa).toBeVisible();
  let posiciones = await posicionesRelativas();
  expect(posiciones.zeta).toBeLessThan(posiciones.alfa);

  await page.getByRole('button', { name: 'Nombre' }).click();
  await page.waitForURL(/orden=nombre/);
  posiciones = await posicionesRelativas();
  expect(posiciones.alfa).toBeLessThan(posiciones.zeta);

  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain('orden=nombre');
  posiciones = await posicionesRelativas();
  expect(posiciones.alfa).toBeLessThan(posiciones.zeta);

  // H-88 revisado: nombrar el estado y ofrecer la vuelta — acá alcanza con
  // que el propio encabezado de la columna por defecto permita volver.
  await page.getByRole('button', { name: 'Solicitado' }).click();
  await page.waitForURL((url) => !url.search.includes('orden=nombre'));
  posiciones = await posicionesRelativas();
  expect(posiciones.zeta).toBeLessThan(posiciones.alfa);

  // Limpieza — cierra los dos casos para no dejar filas de más.
  await filaZeta.getByRole('button', { name: 'Cerrar el caso' }).click();
  await page
    .getByRole('alertdialog', { name: /¿Cerrar el caso de/ })
    .getByRole('button', { name: 'Sí, cerrar el caso' })
    .click();
  await expect(page.getByText('Caso cerrado.')).toBeVisible();
  await filaAlfa.getByRole('button', { name: 'Cerrar el caso' }).click();
  await page
    .getByRole('alertdialog', { name: /¿Cerrar el caso de/ })
    .getByRole('button', { name: 'Sí, cerrar el caso' })
    .click();
  await expect(page.getByText('Caso cerrado.')).toBeVisible();
});

// Cierre de H-101 (D-paginado, antes de la spec 004): reemplaza a "cargar
// más" — no había ningún test de eso en este archivo (ni en el resto del
// e2e de apps/backoffice) para reemplazar, así que este es nuevo, no una
// migración de uno existente.
//
// TAMANIO_PAGINA (constantes.ts) es 20 — 25 casos de acá da una segunda
// página real y parcial (20 + 5) SIN depender de cuántos otros pendientes
// de tutor existan en la base (seed, u otros tests de este archivo): la
// búsqueda por `terminoBusqueda` (único por corrida, en el NOMBRE de los
// 25) acota el total a exactamente esos 25, filtrado en la API (H-88),
// nunca en memoria.
test('el paginado: ir a la página 2, la URL lo refleja, sobrevive a un F5, y buscar desde ahí vuelve a la página 1', async ({
  page,
}) => {
  const sufijo = `${Date.now()}`;
  const terminoBusqueda = `PagE2E${sufijo}`;
  const CANTIDAD = 25;

  await Promise.all(
    Array.from({ length: CANTIDAD }, (_, i) =>
      crearMenorPendienteTutor(`e2e-pag-${sufijo}-${i}@example.com`, terminoBusqueda, `Caso${i}`),
    ),
  );

  await loguearseComoAdminE2E(page);
  await page.goto('/pendientes-tutor');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Buscar por nombre, apellido o teléfono').fill(terminoBusqueda);
  await page.waitForURL(new RegExp(`q=${encodeURIComponent(terminoBusqueda)}`));
  await expect(page.getByText(`${CANTIDAD} resultados`)).toBeVisible();
  await expect(page.getByText('Página 1 de 2')).toBeVisible();

  // B2: un ENLACE de verdad — se puede ubicar por rol "link", no "button".
  const enlacePagina2 = page.getByRole('link', { name: 'Ir a la página 2' });
  await expect(enlacePagina2).toBeVisible();
  await enlacePagina2.click();
  await page.waitForURL(/pagina=2/);
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  // La quinta parte "de sobra" (25 - 20) es lo que tiene que verse acá — no
  // CUÁLES 5 de los 25 (los 25 se crean en paralelo, así que el orden por
  // fecha de creación entre ellos no es determinístico), solo que sean 5.
  await expect(page.locator('table tbody tr')).toHaveCount(5);

  // Un F5 en la página 2 sigue en la página 2 (C3/C5) — no vuelve a la 1.
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain('pagina=2');
  await expect(page.getByText('Página 2 de 2')).toBeVisible();

  // Buscar desde la página 2 vuelve a la página 1 (C3) — acá, a una
  // búsqueda más angosta (por apellido, "Caso2" matchea Caso2/20..24: 6 de
  // los 25) que ya no tiene segunda página, así que si el reinicio no
  // funcionara, esta búsqueda mostraría vacío en vez de esos 6 casos.
  await page.getByLabel('Buscar por nombre, apellido o teléfono').fill('Caso2');
  await page.waitForURL((url) => !url.search.includes('pagina=2'));
  await expect(page.getByText('6 resultados')).toBeVisible();
  await expect(page.getByText('Página', { exact: false })).toHaveCount(0); // una sola página — Paginacion no renderiza nada (totalPaginas<=1).
  await expect(page.getByRole('row', { name: /Caso20/ })).toBeVisible();

  // Limpieza — cierra los 25 casos vía la API (admin), no clic por clic:
  // 25 confirmaciones en el sheet harían este test innecesariamente lento.
  const sesion = await (await page.request.get('/api/auth/session')).json();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
  const listado = await (
    await page.request.get(`${apiBaseUrl}/personas/pendientes-tutor?skip=0&take=${CANTIDAD}&buscar=${encodeURIComponent(terminoBusqueda)}`, {
      headers: { Authorization: `Bearer ${sesion.apiToken}` },
    })
  ).json();
  await Promise.all(
    listado.items.map((persona: { id: string }) =>
      page.request.patch(`${apiBaseUrl}/personas/${persona.id}/marcar-inactiva`, {
        headers: { Authorization: `Bearer ${sesion.apiToken}` },
      }),
    ),
  );
});

/**
 * T029 (H-131, corrección en e336a48): el diálogo de Activar usa el mismo
 * Sheet compartido que los paneles de Personas — mismo recorrido de foco.
 */
test('el panel de Activar atrapa el foco y lo hace ciclar en orden (T029)', async ({ page }) => {
  const apellido = `Foco${Date.now()}`;
  await crearMenorPendienteTutor(`e2e-foco-menor-${Date.now()}@example.com`, 'E2E', apellido);
  await loguearseComoAdminE2E(page);
  await page.goto(`/pendientes-tutor?q=${apellido}`);
  await page.waitForLoadState('networkidle');

  const fila = page.getByText(`E2E ${apellido}`).locator('..').locator('..');
  await fila.getByRole('button', { name: 'Activar' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByLabel('Buscar tutor ya registrado (opcional)')).toBeVisible();

  // El formulario valida al salir de cada campo (H-72): recorrido vacío, cada
  // Tab agregaría un enlace al resumen de errores y cambiaría los controles a
  // mitad de camino. Con datos válidos el panel queda quieto — y Activar,
  // habilitado, entra en el ciclo.
  await panel.getByLabel('Nombre del tutor').fill('Tutor');
  await panel.getByLabel('Apellido del tutor').fill('de Prueba');
  await panel.getByLabel('Teléfono del tutor').fill('92219000009');
  await expect(panel.getByRole('button', { name: 'Activar' })).toBeEnabled();

  await verificarQueElFocoCiclaEnElPanel(page, panel);
});
