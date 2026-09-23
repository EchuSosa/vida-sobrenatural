import {
  test,
  expect,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  loguearseComoOtroRolE2E,
  auditar,
} from './helpers';

/**
 * Historia 3 (specs/003-contenido-institucional): alta de Palabra
 * Profética, marcar vigente desmarca la anterior sola (FR-012, SC-006),
 * validación por campo (FR-014), otro rol bloqueado (FR-030). D64 (Pastor
 * solo lectura por defecto) queda reemplazado para esta pantalla por D129
 * (revisión manual): Pastor administra igual que Admin. Corre en modo
 * claro y oscuro (Constitución Principio VII).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('Admin crea una Palabra Profética y la marca vigente — la anterior queda "No vigente" en el historial', async ({
      page,
    }) => {
      const titulo = `e2e-pp-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      await page.getByLabel('Año').fill('2027');
      await page.getByLabel('Título').fill(titulo);
      await page.getByLabel('Texto').fill('Texto de prueba para el e2e de Historia 3.');
      await page.getByRole('button', { name: 'Crear' }).click();
      await expect(page.getByText('Palabra Profética creada.')).toBeVisible();

      const fila = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(fila).toBeVisible();
      await expect(fila.getByText('No vigente')).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await fila.getByRole('button', { name: 'Marcar vigente' }).click();
      await expect(page.getByText(`"${titulo}" marcada vigente.`)).toBeVisible();

      const filaVigente = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(filaVigente.getByText('Vigente', { exact: true })).toBeVisible();

      // Marcarla vigente de nuevo no rompe nada (Edge Case del spec).
      // No hay botón "Marcar vigente" en la fila de la ya vigente.
      await expect(filaVigente.getByRole('button', { name: 'Marcar vigente' })).toHaveCount(0);
    });

    test('un campo obligatorio vacío o una URL de YouTube inválida muestran el error debajo del campo (FR-014)', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // H-100: este test manda una URL de YouTube inválida a propósito
      // para probar la validación del servidor — el 400 es lo esperado,
      // no un defecto.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 400/);
      await loguearseComoAdminE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      // Título vacío — required nativo del navegador bloquea el submit; se
      // completa lo mínimo salvo título para forzar la validación propia.
      await page.getByLabel('Año').fill('2027');
      await page.getByLabel('Texto').fill('texto');
      await page.getByLabel('Título').fill('algo');
      await page.getByLabel('Título').fill('');
      await page.getByLabel('Título').blur();
      // El mismo mensaje aparece dos veces (el link del resumen y el
      // párrafo debajo del campo, H-50) — se apunta al segundo.
      await expect(page.locator('#campo-titulo-error')).toHaveText('Revisá este dato.');

      // Se corrige el título y se carga una URL de YouTube inválida.
      await page.getByLabel('Título').fill(`e2e-pp-validacion-${colorScheme}-${Date.now()}`);
      await page.getByLabel(/URL del video de YouTube/).fill('https://vimeo.com/123456789');
      await page.getByRole('button', { name: 'Crear' }).click();

      const errorYoutube = page.locator('#campo-youtubeUrl-error');
      await expect(errorYoutube).toContainText('Pegá la URL completa de un video de YouTube');

      // H-72: el error se limpia al escribir (MensajeErrorCampo se desmonta sin mensaje).
      await page.getByLabel(/URL del video de YouTube/).fill('https://www.youtube.com/watch?v=oVLmI6_IoC8');
      await expect(errorYoutube).toHaveCount(0);
    });

    // D129 (revisión manual): reemplaza un test que afirmaba lo contrario
    // ("Pastor ve el historial pero no puede editar") — no es un defecto
    // encontrado, es la decisión: Pastor administra la Palabra Profética
    // igual que Admin (crear y marcar vigente desde la pantalla; la
    // edición parcial vía API está cubierta en el integration spec, esta
    // pantalla no tiene una UI de edición aparte del alta).
    test('D129: Pastor puede crear una Palabra Profética y marcarla vigente, igual que Admin', async ({ page }) => {
      const titulo = `e2e-pp-pastor-${colorScheme}-${Date.now()}`;

      await loguearseComoPastorE2E(page);
      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Palabra Profética' })).toBeVisible();
      await page.getByLabel('Año').fill('2027');
      await page.getByLabel('Título').fill(titulo);
      await page.getByLabel('Texto').fill('Texto de prueba cargado por el Pastor.');
      await page.getByRole('button', { name: 'Crear' }).click();
      await expect(page.getByText('Palabra Profética creada.')).toBeVisible();

      const fila = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(fila).toBeVisible();
      await expect(fila.getByText('No vigente')).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await fila.getByRole('button', { name: 'Marcar vigente' }).click();
      await expect(page.getByText(`"${titulo}" marcada vigente.`)).toBeVisible();
      const filaVigente = page.getByRole('row', { name: new RegExp(titulo) });
      await expect(filaVigente.getByText('Vigente', { exact: true })).toBeVisible();
    });

    test('otro rol no encuentra la sección en el menú y el acceso directo por URL se lo niega (FR-030)', async ({
      page,
    }) => {
      await loguearseComoOtroRolE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Palabra Profética' })).toHaveCount(0);

      await page.goto('/palabra-profetica');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Necesitás el rol Admin o Pastor', { exact: false })).toBeVisible();
      await expect(page.getByLabel('Año')).toHaveCount(0);
    });
  });
}

// H-117/H-93: `texto` no tenía límite — 50.000 caracteres deja holgura de
// sobra sobre los 12.409 de la Palabra Profética 2021 real. Independiente
// del tema, como "el editor de Texto" más abajo.
test('un texto de más de 50.000 caracteres muestra el error debajo del campo, sin enviar', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/palabra-profetica');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Año').fill('2027');
  await page.getByLabel('Título').fill(`e2e-pp-largo-${Date.now()}`);
  // .fill() en vez de .type(): 50.001 caracteres tecleados uno por uno
  // sería insoportablemente lento, y acá lo que se prueba es la
  // validación por longitud, no el tipeo real (ya cubierto en "el editor
  // de Texto").
  await page.getByLabel('Texto').fill('a'.repeat(50_001));
  await page.getByLabel('Texto').blur();

  const errorTexto = page.locator('#campo-texto-error');
  await expect(errorTexto).toContainText('no puede superar los 50.000 caracteres');

  // H-72: se corrige y el error se limpia al escribir.
  await page.getByLabel('Texto').fill('texto corto');
  await expect(errorTexto).toHaveCount(0);
});

// H-90/D127 (revisión manual): TipTap reemplaza el <textarea> con botones
// que insertaban sintaxis — WYSIWYG de verdad, pero D127 se mantiene: se
// sigue guardando Markdown. Independiente del tema, como el resto de los
// tests de esta app que no dependen de contraste/color.
test('el editor de Texto: negrita, itálica, enlace, lista, cita, h2 y h3 con la barra (nunca h1, nunca javascript:), y se ve bien en la web pública', async ({
  page,
}) => {
  const titulo = `e2e-pp-editor-${Date.now()}`;
  await loguearseComoAdminE2E(page);
  await page.goto('/palabra-profetica');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Año').fill('2027');
  await page.getByLabel('Título').fill(titulo);

  const editor = page.getByLabel('Texto');
  const botonNegrita = page.getByRole('button', { name: 'Negrita' });
  const botonItalica = page.getByRole('button', { name: 'Itálica' });
  const botonEnlace = page.getByRole('button', { name: 'Enlace' });
  const botonLista = page.getByRole('button', { name: 'Lista' });
  const botonCita = page.getByRole('button', { name: 'Cita' });
  const botonH2 = page.getByRole('button', { name: 'Subtítulo (h2)' });
  const botonH3 = page.getByRole('button', { name: 'Subtítulo (h3)' });

  // H2, con el estado del botón reflejado en aria-pressed — no solo color
  // (D81/H-55): el <button> es de verdad, con teclado alcanza igual. La
  // marca se activa ANTES de escribir (clic, después tipear) en vez de
  // "escribir y después seleccionar": es como se usa de verdad (Google
  // Docs, Word), y evita que un clic en la barra deseleccione el texto
  // recién tipeado antes de que el comando llegue a aplicarse.
  await editor.click();
  await expect(botonH2).toHaveAttribute('aria-pressed', 'false');
  await botonH2.click();
  await expect(botonH2).toHaveAttribute('aria-pressed', 'true');
  // Sin tilde a propósito: el tipeo sintético de Playwright para un
  // carácter acentuado no siempre deja el editor en el mismo estado que un
  // teclado real, y acá lo que se prueba es el toggle de marcas por la
  // barra, no la fidelidad de Unicode (que ya se ejercita en el resto de
  // la app con textos reales en español).
  await page.keyboard.type('Un subtitulo');
  await page.keyboard.press('Enter');
  await expect(botonH2).toHaveAttribute('aria-pressed', 'false'); // Enter sale del heading — párrafo nuevo.

  // Negrita e itálica, cada una sobre su propio tramo de texto.
  await botonNegrita.click();
  await expect(botonNegrita).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('negrita ');
  await botonNegrita.click();
  await expect(botonNegrita).toHaveAttribute('aria-pressed', 'false');
  await botonItalica.click();
  await page.keyboard.type('italica');
  await botonItalica.click();
  await expect(editor.locator('strong')).toHaveText('negrita ');
  await expect(editor.locator('em')).toHaveText('italica');
  await page.keyboard.press('Enter');

  // H3
  await botonH3.click();
  await page.keyboard.type('Un subtitulo mas chico');
  await page.keyboard.press('Enter');

  // Lista
  await botonLista.click();
  await expect(botonLista).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('primero');
  await page.keyboard.press('Enter');
  await page.keyboard.type('segundo');
  await expect(editor.locator('li')).toHaveCount(2);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // Enter en un ítem vacío sale de la lista.

  // Cita (H-117: el contenido real separa versículos y citas largas del
  // cuerpo — blockquote en la lista permitida, botón propio con el mismo
  // atajo estándar que fija @tiptap/extension-blockquote, Mod-Shift-B).
  await botonCita.click();
  await expect(botonCita).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('Una cita citada aparte del cuerpo.');
  await expect(editor.locator('blockquote')).toHaveText('Una cita citada aparte del cuerpo.');
  // Enter en un párrafo vacío DENTRO de la cita la saca (mismo mecanismo
  // genérico de ProseMirror que ya sacaba de la lista, no algo propio de
  // blockquote) — dos Enter, no uno: el primero abre un párrafo vacío
  // todavía adentro, el segundo lo levanta afuera.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(botonCita).toHaveAttribute('aria-pressed', 'false');

  // Enlace, sin nada seleccionado — inserta el texto por defecto ya
  // convertido en enlace (mismo comportamiento que el editor viejo, con un
  // paso menos: ahí había que completar la URL a mano).
  page.once('dialog', (dialog) => dialog.accept('https://ejemplo.org/mas-info'));
  await botonEnlace.click();
  await expect(editor.getByRole('link')).toHaveAttribute('href', 'https://ejemplo.org/mas-info');
  // El cursor ya queda colapsado justo después del enlace (alternarEnlace,
  // editor-markdown.tsx) — "End" es un no-op acá, se deja por claridad.
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');

  // H-90/D127: un enlace javascript: se rechaza en el ORIGEN — ni siquiera
  // se puede crear desde el editor (además de que markdown-seguro.tsx lo
  // rechazaría igual al renderizar, defensa en dos capas).
  const enlacesAntes = await editor.getByRole('link').count();
  page.once('dialog', (dialog) => dialog.accept('javascript:alert(1)'));
  await botonEnlace.click();
  await expect(editor.getByRole('link')).toHaveCount(enlacesAntes);

  // H-90/D127: nunca h1 — ni con la barra (no hay botón) ni escribiendo el
  // atajo de Markdown a mano.
  await expect(page.getByRole('button', { name: /^Título \(h1\)$/ })).toHaveCount(0);
  await page.keyboard.type('# Esto no debería ser un h1');
  await expect(editor.locator('h1')).toHaveCount(0);

  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByText('Palabra Profética creada.')).toBeVisible();

  const fila = page.getByRole('row', { name: new RegExp(titulo) });
  await fila.getByRole('button', { name: 'Marcar vigente' }).click();
  await expect(page.getByText(`"${titulo}" marcada vigente.`)).toBeVisible();

  // El round-trip completo — Markdown guardado, releído y renderizado por
  // markdown-seguro.tsx (sin tocar) en la página pública — confirma que
  // TipTap serializa Markdown de verdad, no HTML ni el JSON de ProseMirror.
  const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';
  await page.goto(`${webBaseUrl}/nosotros/palabra-profetica`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { level: 2, name: 'Un subtitulo' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Un subtitulo mas chico' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'negrita' })).toBeVisible();
  await expect(page.locator('em', { hasText: 'italica' })).toBeVisible();
  // `.filter({ hasText })`, no `getByRole(..., { name })`: "listitem" no es
  // un rol que compute nombre accesible a partir de su contenido (a
  // diferencia de heading/link/button) — el `name` de `getByRole` quedaba
  // vacío pese a que el texto estaba ahí (confirmado con
  // `getByRole('listitem').allTextContents()` mostrando "primero" mientras
  // la misma consulta con `{ name: 'primero' }` no encontraba nada).
  await expect(page.getByRole('listitem').filter({ hasText: 'primero' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'segundo' })).toBeVisible();
  await expect(page.locator('blockquote', { hasText: 'Una cita citada aparte del cuerpo.' })).toBeVisible();
  const enlacePublico = page.getByRole('link', { name: 'texto del enlace' });
  await expect(enlacePublico).toHaveAttribute('href', 'https://ejemplo.org/mas-info');
  await expect(enlacePublico).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText('# Esto no debería ser un h1')).toBeVisible(); // texto plano, no un h1.
  await expect(page.locator('h1')).toHaveCount(1); // el <h1> de la página misma — ninguno viene del texto guardado.
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);

  const resultados = await auditar(page);
  expect(resultados.violations).toEqual([]);
});
