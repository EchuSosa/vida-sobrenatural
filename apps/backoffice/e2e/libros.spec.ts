import { type Page } from '@playwright/test';
import sharp from 'sharp';
import {
  test,
  expect,
  loguearseComoAdminE2E,
  loguearseComoPastorE2E,
  loguearseComoOtroRolE2E,
  auditar,
} from './helpers';

/**
 * Historia 4 (specs/003-contenido-institucional, D64/D119/FR-020): mismo
 * patrón que sedes.spec.ts — tabla compartida, alta en modal, detalle
 * editable, portada (primer uso real de StorageService), papelera. A
 * diferencia de Sedes, eliminar un Libro siempre está permitido (FR-020,
 * sin la rama "bloqueada" de datos relacionados). Corre en modo claro y
 * oscuro (Constitución Principio VII).
 */

// H-94: los PNG de packages/ui/src/assets/marca/ son 1024×1024 como
// máximo — por debajo del mínimo de portada (800×1200, ver
// imagen-portada.service.ts) desde que ese mínimo existe. Se genera acá
// una imagen sintética válida (1000×1500, 2:3) en vez de usar un archivo
// de marca para algo que no es. `sharp` resuelve desde el devDependency
// de la raíz del monorepo (mismo criterio que scripts/generar-iconos-marca.mjs).
let portadaValidaCache: Buffer | undefined;
async function portadaValida(): Promise<Buffer> {
  portadaValidaCache ??= await sharp({
    create: { width: 1000, height: 1500, channels: 3, background: { r: 120, g: 90, b: 60 } },
  })
    .jpeg()
    .toBuffer();
  return portadaValidaCache;
}

async function crearLibroPorModal(page: Page, titulo: string, autor = 'Autor E2E') {
  await page.getByRole('button', { name: 'Crear Libro' }).click();
  const modal = page.getByRole('dialog', { name: 'Crear Libro' });
  await expect(modal).toBeVisible();
  await modal.getByLabel('Título').fill(titulo);
  await modal.getByLabel('Autor/a').fill(autor);
  await modal.getByLabel('Año').fill('2024');

  // H-92: la fila de Año/Orden desbordaba el modal (flex-1 sin min-w-0) —
  // el campo Orden quedaba cortado. Verificado acá: el campo entero cae
  // dentro del ancho del modal.
  const campoOrden = modal.getByLabel('Orden');
  const cajaModal = await modal.boundingBox();
  const cajaOrden = await campoOrden.boundingBox();
  expect(cajaModal).not.toBeNull();
  expect(cajaOrden).not.toBeNull();
  if (cajaModal && cajaOrden) {
    expect(cajaOrden.x + cajaOrden.width).toBeLessThanOrEqual(cajaModal.x + cajaModal.width + 1);
  }

  await modal.getByRole('button', { name: 'Crear Libro' }).click();
  await expect(page.getByText('Libro creado.')).toBeVisible();
  await expect(modal).toBeHidden();
}

function filaLibro(page: Page, titulo: string) {
  return page.getByRole('row', { name: new RegExp(titulo) });
}

async function abrirDetalleDesdeFila(page: Page, fila: ReturnType<typeof filaLibro>) {
  await fila.getByRole('button', { name: /^Acciones para/ }).click();
  await page.getByRole('menuitem', { name: 'Ver detalle' }).click();
  await page.waitForURL(/\/libros\/[^/]+$/);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('crear un Libro, subir portada con texto alternativo, y editarlo', async ({ page }) => {
      const titulo = `e2e-libro-${colorScheme}-${Date.now()}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');

      await crearLibroPorModal(page, titulo);

      const fila = filaLibro(page, titulo);
      await expect(fila).toBeVisible();
      await abrirDetalleDesdeFila(page, fila);

      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      await expect(page.getByText('Activo', { exact: true })).toBeVisible();
      // Sin portada real todavía — placeholder con aspecto de tapa (FR-027).
      await expect(page.getByRole('img', { name: `Portada de ${titulo}` })).toBeVisible();

      let resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'portada.png',
        mimeType: 'image/png',
        buffer: await portadaValida(),
      });
      await page.getByLabel('Texto alternativo').fill(`Tapa de ${titulo}`);
      await page.getByRole('button', { name: 'Subir portada', exact: true }).click();
      await expect(page.getByText('Portada guardada.')).toBeVisible();
      await expect(page.getByRole('img', { name: `Tapa de ${titulo}` })).toBeVisible();

      resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      // Reemplazar la portada.
      await page.getByLabel('Reemplazar portada (opcional)').setInputFiles({
        name: 'portada2.png',
        mimeType: 'image/png',
        buffer: await portadaValida(),
      });
      await page.getByLabel('Texto alternativo').fill(`Tapa reemplazada de ${titulo}`);
      await page.getByRole('button', { name: 'Reemplazar portada', exact: true }).click();
      await expect(page.getByText('Portada guardada.')).toBeVisible();

      // Quitarla — vuelve al placeholder (FR-027).
      await page.getByRole('button', { name: 'Quitar portada', exact: true }).click();
      await expect(page.getByText('Portada quitada.')).toBeVisible();
      await expect(page.getByRole('img', { name: `Portada de ${titulo}` })).toBeVisible();

      // Editar los datos del formulario.
      await page.getByLabel('Descripción (opcional)').fill('Descripción de prueba e2e.');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByText('Cambios guardados.')).toBeVisible();
    });

    test('un archivo de tipo inválido o demasiado pesado muestra el error antes de subir; sin texto alternativo no se puede subir', async ({
      page,
    }) => {
      const titulo = `e2e-libro-portada-invalida-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await crearLibroPorModal(page, titulo);
      await abrirDetalleDesdeFila(page, filaLibro(page, titulo));

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'archivo.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('no es una imagen'),
      });
      await expect(page.getByText('La portada tiene que ser un archivo JPG, PNG o WebP.')).toBeVisible();

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'grande.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(6 * 1024 * 1024, 1),
      });
      await expect(
        page.getByText('La portada pesa más del máximo permitido (5 MB)', { exact: false }),
      ).toBeVisible();

      // Un archivo válido sin texto alternativo no deja subir.
      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'portada.png',
        mimeType: 'image/png',
        buffer: await portadaValida(),
      });
      await page.getByRole('button', { name: 'Subir portada', exact: true }).click();
      await expect(page.getByText('Completá el texto alternativo de la portada antes de subirla.')).toBeVisible();
    });

    // H-94: a diferencia de tipo/tamaño (arriba), las dimensiones sólo se
    // pueden verificar decodificando la imagen — no hay chequeo previo del
    // lado del cliente, así que este caso sí llega al servidor.
    test('una imagen más chica que el mínimo de portada se rechaza al subirla, no se agranda en silencio (H-94)', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // H-100: este test sube a propósito una imagen más chica que el
      // mínimo para probar el rechazo del servidor — el 400 es lo
      // esperado, no un defecto; Chromium lo loguea solo como error de
      // consola.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 400/);
      const titulo = `e2e-libro-portada-chica-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await crearLibroPorModal(page, titulo);
      await abrirDetalleDesdeFila(page, filaLibro(page, titulo));

      const imagenChica = await sharp({
        create: { width: 200, height: 300, channels: 3, background: { r: 200, g: 50, b: 50 } },
      })
        .jpeg()
        .toBuffer();

      await page.getByLabel('Subir portada (opcional)').setInputFiles({
        name: 'chica.jpg',
        mimeType: 'image/jpeg',
        buffer: imagenChica,
      });
      await page.getByLabel('Texto alternativo').fill('Tapa chica');
      await page.getByRole('button', { name: 'Subir portada', exact: true }).click();
      await expect(
        page.getByText('La imagen es más chica que el mínimo para una portada', { exact: false }),
      ).toBeVisible();
      // Sigue en el placeholder — no quedó ninguna portada agrandada/borrosa.
      await expect(page.getByRole('img', { name: `Portada de ${titulo}` })).toBeVisible();
    });

    test('inactivar/reactivar y eliminar (siempre permitido) a la papelera, y restaurar', async ({ page }) => {
      const titulo = `e2e-libro-papelera-${colorScheme}-${Date.now()}`;
      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await crearLibroPorModal(page, titulo);
      await abrirDetalleDesdeFila(page, filaLibro(page, titulo));

      await page.getByRole('button', { name: 'Inactivar', exact: true }).click();
      await page
        .getByRole('alertdialog', { name: `¿Inactivar ${titulo}?` })
        .getByRole('button', { name: 'Sí, inactivar' })
        .click();
      await expect(page.getByText('Libro inactivado.')).toBeVisible();

      await page.getByRole('button', { name: 'Reactivar', exact: true }).click();
      await page
        .getByRole('alertdialog', { name: `¿Reactivar ${titulo}?` })
        .getByRole('button', { name: 'Sí, reactivar' })
        .click();
      await expect(page.getByText('Libro reactivado.')).toBeVisible();

      // FR-020: eliminar siempre permitido, sin bloqueo por datos relacionados.
      await page.getByRole('button', { name: 'Eliminar Libro' }).click();
      await page
        .getByRole('alertdialog', { name: `¿Eliminar ${titulo}?` })
        .getByRole('button', { name: 'Sí, eliminar' })
        .click();
      await expect(page.getByText('Libro eliminado.')).toBeVisible();
      await page.waitForURL(/\/libros$/);

      await page.goto('/libros/papelera');
      await page.waitForLoadState('networkidle');
      await expect(filaLibro(page, titulo)).toBeVisible();

      // H-95: miga de pan arriba del título, no "Volver a Libros" suelto.
      const migaLibros = page.getByRole('navigation', { name: 'Ruta' });
      await expect(migaLibros.getByRole('link', { name: 'Libros' })).toBeVisible();
      await expect(migaLibros.getByText('Papelera')).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await filaLibro(page, titulo).getByRole('button', { name: 'Restaurar' }).click();
      await expect(page.getByText(`${titulo} restaurado.`)).toBeVisible();
    });

    // H-91: el campo autor/a SUGIERE autores ya cargados mientras se
    // escribe — no obliga a elegir uno. Patrón ARIA de combobox (Base UI
    // `Autocomplete`): input con role="combobox", opciones con
    // role="option", navegables con flechas y Enter.
    test('el campo autor/a sugiere autores ya cargados, navegable por teclado, y sigue aceptando texto libre (H-91)', async ({
      page,
    }) => {
      const sufijo = `${colorScheme}-${Date.now()}`;
      const autorExistente = `Autora Sugerida ${sufijo}`;
      const autorLibre = `Autor Libre Nunca Cargado ${sufijo}`;
      const tituloBase = `e2e-libro-autocompletado-base-${sufijo}`;
      const tituloNuevo = `e2e-libro-autocompletado-nuevo-${sufijo}`;

      await loguearseComoAdminE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');

      // Primero un Libro con un autor conocido, para que exista como sugerencia del siguiente.
      await crearLibroPorModal(page, tituloBase, autorExistente);

      await page.getByRole('button', { name: 'Crear Libro' }).click();
      const modal = page.getByRole('dialog', { name: 'Crear Libro' });
      await expect(modal).toBeVisible();
      await modal.getByLabel('Título').fill(tituloNuevo);

      const campoAutor = modal.getByRole('combobox', { name: 'Autor/a' });
      await campoAutor.pressSequentially(autorExistente.slice(0, 8));
      const opcion = page.getByRole('option', { name: autorExistente });
      await expect(opcion).toBeVisible();

      // Teclado, no clic: flecha resalta, Enter elige — sin soltar el mouse.
      await campoAutor.press('ArrowDown');
      await expect(opcion).toHaveAttribute('data-highlighted', '');
      await campoAutor.press('Enter');
      await expect(campoAutor).toHaveValue(autorExistente);

      // Sigue siendo texto libre: un autor nuevo no pelea con el control —
      // "sin coincidencias" es informativo, nunca bloquea escribir.
      await campoAutor.fill('');
      await campoAutor.pressSequentially(autorLibre);
      await expect(page.getByText('Sin coincidencias', { exact: false })).toBeVisible();
      // Escape cierra la lista sin perder lo escrito (patrón ARIA de combobox).
      await campoAutor.press('Escape');
      await expect(campoAutor).toHaveAttribute('aria-expanded', 'false');
      await expect(campoAutor).toHaveValue(autorLibre);

      await modal.getByLabel('Año').fill('2024');

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);

      await modal.getByRole('button', { name: 'Crear Libro' }).click();
      // .last(): este test ya creó un Libro antes (tituloBase) — su propio
      // toast puede seguir visible cuando aparece el de este segundo.
      await expect(page.getByText('Libro creado.').last()).toBeVisible();
      await expect(modal).toBeHidden();

      const filaNueva = filaLibro(page, tituloNuevo);
      await expect(filaNueva).toBeVisible();
      await expect(filaNueva.getByText(autorLibre)).toBeVisible();
    });

    test('Pastor ve el listado y el detalle pero no puede editar nada (D64)', async ({ page }) => {
      await loguearseComoPastorE2E(page);
      await page.goto('/libros');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Libros' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear Libro' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Acciones para/ })).toHaveCount(0);

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('otro rol no encuentra la sección en el menú y el acceso directo por URL se lo niega (FR-030)', async ({
      page,
    }) => {
      await loguearseComoOtroRolE2E(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Libros' })).toHaveCount(0);

      await page.goto('/libros');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Necesitás el rol Admin o Pastor', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear Libro' })).toHaveCount(0);
    });
  });
}

// H-88: independiente del tema — el orden se refleja en la URL, así que
// sobrevive a un F5 (page.reload) y no depende de qué tema esté activo.
test('ordenar por una columna se refleja en la URL y sobrevive a un F5', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/libros');
  await page.waitForLoadState('networkidle');

  // Por default el listado está en su orden manual (H-89) — clickear "Año"
  // lo reemplaza por orden alfabético/numérico ascendente por esa columna.
  await page.getByRole('button', { name: 'Año' }).click();
  await page.waitForURL(/orden=anio/);

  const celdasAnio = page.locator('table tbody tr td:nth-child(4)');
  const aniosOrdenados = (await celdasAnio.allInnerTexts()).map(Number);
  expect(aniosOrdenados).toEqual([...aniosOrdenados].sort((a, b) => a - b));

  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain('orden=anio');
  const aniosTrasReload = (await celdasAnio.allInnerTexts()).map(Number);
  expect(aniosTrasReload).toEqual(aniosOrdenados);
});

// H-89: mover un Libro de posición, y que se refleje en la web pública.
// Independiente del tema, como el test de orden de arriba.
test('mover un Libro con "Mover arriba" cambia su posición y se ve en la web pública', async ({ page, request }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/libros');
  await page.waitForLoadState('networkidle');

  const celdasTitulo = page.locator('table tbody tr td:nth-child(2)');
  const ordenAntes = await celdasTitulo.allInnerTexts();
  expect(ordenAntes.length).toBeGreaterThanOrEqual(2);

  // El último sube un lugar — el botón "Mover arriba" de su fila.
  const ultimoTitulo = ordenAntes[ordenAntes.length - 1];
  const penultimoTitulo = ordenAntes[ordenAntes.length - 2];
  await page.getByRole('button', { name: `Mover ${ultimoTitulo} hacia arriba` }).click();

  // Región viva (H-89: "se anuncien a lectores de pantalla").
  await expect(page.getByText(`${ultimoTitulo}, posición ${ordenAntes.length - 1} de ${ordenAntes.length}.`)).toBeAttached();

  await expect(async () => {
    const ordenDespues = await celdasTitulo.allInnerTexts();
    expect(ordenDespues[ordenDespues.length - 1]).toBe(penultimoTitulo);
    expect(ordenDespues[ordenDespues.length - 2]).toBe(ultimoTitulo);
  }).toPass();

  // Se ve en la web pública — misma base (vidasobrenatural_e2e), su propia
  // instancia de apps/web (PLAYWRIGHT_WEB_BASE_URL, helpers.ts).
  const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';
  const publica = await request.get(`${webBaseUrl}/nosotros/ediciones-vs`);
  expect(publica.ok()).toBe(true);
  const html = await publica.text();
  // El penúltimo (ahora último) tiene que aparecer DESPUÉS del que subió,
  // en el HTML servido — orden real, no solo presencia de los dos.
  expect(html.indexOf(ultimoTitulo)).toBeGreaterThan(-1);
  expect(html.indexOf(penultimoTitulo)).toBeGreaterThan(html.indexOf(ultimoTitulo));

  // Restaura el orden original, para no dejar la base de e2e desordenada
  // para otros tests de esta misma suite.
  await page.getByRole('button', { name: `Mover ${ultimoTitulo} hacia abajo` }).click();
  await expect(async () => {
    const ordenRestaurado = await celdasTitulo.allInnerTexts();
    expect(ordenRestaurado).toEqual(ordenAntes);
  }).toPass();
});

// H-89 (paso 2): la alternativa por teclado de dnd-kit no es un detalle —
// es el requisito que no era negociable. Espacio levanta el asa enfocada,
// una flecha la mueve, Espacio la suelta (KeyboardSensor default).
test('arrastrar un Libro con el asa, por teclado (Espacio, flecha, Espacio), cambia su posición', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/libros');
  await page.waitForLoadState('networkidle');

  const celdasTitulo = page.locator('table tbody tr td:nth-child(2)');
  const ordenAntes = await celdasTitulo.allInnerTexts();
  expect(ordenAntes.length).toBeGreaterThanOrEqual(2);

  const primerTitulo = ordenAntes[0];
  const segundoTitulo = ordenAntes[1];
  const asa = page.getByRole('button', { name: `Arrastrar para reordenar ${primerTitulo}` });
  const liveRegion = page.locator('[id^="DndLiveRegion"]');
  await asa.focus();
  // dnd-kit mide/renderiza entre cada tecla (un frame real) — sin una
  // pausa entre teclas, la flecha puede llegar antes de que termine de
  // registrar el "levantar" y se pierde (verificado: sin esto, el drop
  // termina "sobre sí mismo", sin moverse).
  await page.keyboard.press('Space');
  // H-99: los anuncios en español, con el título real — no "Picked up
  // draggable item 3" (el default en inglés y genérico de dnd-kit). El de
  // "Levantaste" (onDragStart) es demasiado transitorio para verificar acá
  // — dnd-kit dispara su propio onDragOver casi en el mismo instante (al
  // levantar, el activo queda "sobre" su propia posición), así que la
  // región viva ya muestra ese segundo anuncio para cuando esta aserción
  // llega a leerla. Se verifica igual, indirectamente: si `onDragStart`
  // estuviera mal tipado o faltara, `Announcements` (dnd-kit) no
  // compilaría — y los otros tres momentos sí se verifican en tiempo real.
  await expect(liveRegion).toHaveText(`"${primerTitulo}" pasó a la posición 1 de ${ordenAntes.length}.`);
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown');
  await expect(liveRegion).toHaveText(`"${primerTitulo}" pasó a la posición 2 de ${ordenAntes.length}.`);
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
  await expect(liveRegion).toHaveText(`Soltaste "${primerTitulo}" en la posición 2 de ${ordenAntes.length}.`);

  await expect(async () => {
    const ordenDespues = await celdasTitulo.allInnerTexts();
    expect(ordenDespues[0]).toBe(segundoTitulo);
    expect(ordenDespues[1]).toBe(primerTitulo);
  }).toPass();

  // Restaura el orden original.
  await page.getByRole('button', { name: `Mover ${primerTitulo} hacia arriba` }).click();
  await expect(async () => {
    expect(await celdasTitulo.allInnerTexts()).toEqual(ordenAntes);
  }).toPass();
});

// H-99: cancelar (Escape) a mitad de un arrastre es el momento que más se
// olvida anunciar — y el que más importa: quien lo cancela tiene que
// enterarse de que el libro volvió a su lugar, no quedarse sin anuncio.
test('cancelar un arrastre con Escape anuncia que el libro volvió a su lugar, y no cambia el orden', async ({ page }) => {
  await loguearseComoAdminE2E(page);
  await page.goto('/libros');
  await page.waitForLoadState('networkidle');

  const celdasTitulo = page.locator('table tbody tr td:nth-child(2)');
  const ordenAntes = await celdasTitulo.allInnerTexts();
  expect(ordenAntes.length).toBeGreaterThanOrEqual(2);

  const primerTitulo = ordenAntes[0];
  const asa = page.getByRole('button', { name: `Arrastrar para reordenar ${primerTitulo}` });
  const liveRegion = page.locator('[id^="DndLiveRegion"]');
  await asa.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');

  await expect(liveRegion).toHaveText(`Cancelaste el arrastre — "${primerTitulo}" volvió a la posición 1 de ${ordenAntes.length}.`);
  // Sin persistir nada — ni un solo PATCH de por medio.
  expect(await celdasTitulo.allInnerTexts()).toEqual(ordenAntes);
});
