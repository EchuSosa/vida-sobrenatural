import { test, expect, registrarPersonaDeTest, loguearseComoTest } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';
import { objetivosDe44, tamanoDeLetra, contenido, alto } from './helpers-ajustes-ux';

/**
 * ajustes-ux — los hallazgos de la revisión de UX de `apps/web` del
 * 2026-09-30 (specs/revision-manual/2026-09-30-ux-web.md) y D150/D151. Cada
 * test cita su hallazgo (#N). Los de celular llevan `@celular` y fijan el
 * ancho de un celular también en el proyecto de escritorio.
 */

const CELULAR = { width: 390, height: 844 };

test.describe('Inicio público', () => {
  test.use({ viewport: CELULAR });

  test('sin la tarjeta estática "Eventos" (la reemplaza Próximos eventos, FR-001 de la 011) y con descripciones en 16 px (#7, #8) @celular', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Próximos eventos de Vida Sobrenatural/ })).toHaveCount(0);
    const descripcion = page.getByText('Quiénes somos, en qué creemos y nuestro liderazgo.');
    await expect(descripcion).toBeVisible();
    expect(await tamanoDeLetra(descripcion)).toBeGreaterThanOrEqual(16);
    await objetivosDe44(contenido(page).getByRole('list').first());
  });
});

test.describe('Header, paneles y pie (transversal)', () => {
  test.use({ viewport: CELULAR });

  test('las acciones del header y el hamburguesa miden 44 px y van en 16 px (#1, D150) @celular', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header').first();
    await objetivosDe44(header);
    expect(await tamanoDeLetra(header.getByRole('link', { name: 'Ingresar' }))).toBeGreaterThanOrEqual(16);
  });

  test('el panel lateral: filas de 44 px o más, y Dar e Ingresar repetidos al final (#2, #4) @celular', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const panel = page.getByRole('navigation', { name: 'Principal (celular)' });
    await expect(panel).toBeVisible();
    await objetivosDe44(panel);
    await expect(panel.getByRole('link', { name: 'Dar' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Ingresar' })).toBeVisible();
    await panel.getByRole('link', { name: 'Dar' }).click();
    await expect(page).toHaveURL(/\/dar$/);
  });

  test('el pie: redes con su nombre visible y área de 44×44 (#3) @celular', async ({ page }) => {
    await page.goto('/');
    const pie = page.locator('footer');
    await expect(pie.getByRole('link', { name: 'Facebook' })).toHaveText('Facebook');
    await expect(pie.getByRole('link', { name: 'Instagram' })).toHaveText('Instagram');
    await objetivosDe44(pie);
  });
});

test.describe('Barra de la app', () => {
  test.use({ viewport: CELULAR });

  test('pestañas con etiquetas de 14 px y "Más" de 44 px con su panel de filas grandes (#5, #6, #2) @celular', async ({ page }) => {
    await registrarPersonaDeTest(page, `e2e-ux-barra-${Date.now()}@example.com`);
    await page.goto('/inicio');
    const barra = page.getByRole('navigation', { name: 'Principal' });
    expect(await tamanoDeLetra(barra.getByRole('link', { name: 'Mi camino' }).locator('span'))).toBeGreaterThanOrEqual(14);
    const mas = page.getByRole('button', { name: 'Más' });
    await objetivosDe44(page.locator('header').first());
    await mas.click();
    const panel = page.getByRole('navigation', { name: 'Secundario' });
    await expect(panel).toBeVisible();
    await objetivosDe44(panel);
  });
});

test.describe('Registro', () => {
  test.use({ viewport: CELULAR });

  test('errores que dicen qué hacer, campos de 44 px con etiqueta de 16 px, intro sin "autorizaste" (#27, #29, #30, #31) @celular', async ({ page }) => {
    await loguearseComoTest(page, `e2e-ux-reg-err-${Date.now()}@example.com`);
    await page.goto('/registro');
    await expect(page.getByText(/Entraste con tu cuenta/)).toBeVisible();
    await expect(page.getByText(/autorizaste/)).toHaveCount(0);

    const apellido = page.getByLabel('Apellido');
    await apellido.fill('');
    await page.getByLabel('Nombre').fill('');
    expect(await alto(apellido)).toBeGreaterThanOrEqual(44);
    expect(await tamanoDeLetra(page.locator('label[for="campo-apellido"]'))).toBeGreaterThanOrEqual(16);

    await page.getByRole('button', { name: 'Siguiente' }).click();
    const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos' });
    await expect(resumen.getByRole('link', { name: 'Escribí tu apellido.' })).toBeVisible();
    await expect(resumen.getByRole('link', { name: 'Escribí tu nombre.' })).toBeVisible();
    await expect(resumen.getByRole('link', { name: 'Elegí una opción en Género.' })).toBeVisible();
    await expect(page.getByText('Revisá este dato.')).toHaveCount(0);
  });

  test('botones apilados a todo el ancho con el principal arriba, ayudas en Teléfono y Dirección (#28, #32) @celular', async ({ page }) => {
    await loguearseComoTest(page, `e2e-ux-reg-bot-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill('García');
    await page.getByLabel('Nombre').fill('Ana');
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), '1958-05-20');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByLabel('Dirección')).toHaveAccessibleDescription(/no la compartimos/);
    await expect(page.getByLabel('Número de teléfono')).toHaveAccessibleDescription(/Discipulador/);

    const siguiente = await page.getByRole('button', { name: 'Siguiente' }).boundingBox();
    const atras = await page.getByRole('button', { name: 'Atrás' }).boundingBox();
    expect(siguiente && atras).toBeTruthy();
    expect(siguiente!.y).toBeLessThan(atras!.y);
    expect(siguiente!.width).toBeGreaterThan(CELULAR.width - 64);
  });

  test('resumen: "Editar" de 44 px y casilla de consentimiento grande; "¡Listo!" lleva a Mi camino (#34, #35, #36) @celular', async ({ page }) => {
    await loguearseComoTest(page, `e2e-ux-reg-listo-${Date.now()}@example.com`);
    await page.goto('/registro');
    await page.getByLabel('Apellido').fill('García');
    await page.getByLabel('Nombre').fill('Ana');
    await page.getByLabel('Género').selectOption('femenino');
    await completarFecha(campo(page, 'Fecha de nacimiento'), '1958-05-20');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Código de país').selectOption('+54');
    await page.getByLabel('Número de teléfono').fill('92211234567');
    await page.getByLabel('Dirección').fill('Calle 1 y 50');
    await page.getByLabel('Sede').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByLabel('Estado civil').selectOption('casado_a');
    await page.getByLabel('Profesión').selectOption('salud');
    await page.getByLabel('¿En qué año empezaste a venir a la iglesia?').selectOption('2020');
    await page.getByRole('button', { name: 'Siguiente' }).click();

    for (const editar of await page.getByRole('button', { name: /^Editar/ }).all()) {
      expect(await alto(editar)).toBeGreaterThanOrEqual(44);
    }
    const casilla = page.getByRole('checkbox');
    expect(await alto(casilla)).toBeGreaterThanOrEqual(20);
    await page.getByText('Doy mi consentimiento').click();
    await expect(casilla).toBeChecked();

    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page).toHaveURL(/\/registro\/listo/);
    await page.getByRole('link', { name: 'Ir a mi camino' }).click();
    await expect(page).toHaveURL(/\/mi-camino$/);
  });
});

test.describe('Mi camino — Vida Nueva', () => {
  test.use({ viewport: CELULAR });

  test('pedir sin tocar "Agregar franja" toma el horario elegido; el foco va al estado nuevo; "Quitar" con ícono y de 44 px (#40, #41, #42, #47) @celular', async ({ page }) => {
    await registrarPersonaDeTest(page, `e2e-ux-franjas-${Date.now()}@example.com`);
    await page.goto('/mi-camino/vida-nueva');
    const tarjeta = page.getByRole('region', { name: 'Vida Nueva' });

    // #41: "Agregar franja" solo y a todo el ancho del editor, debajo de Desde/Hasta.
    const agregar = await tarjeta.getByRole('button', { name: 'Agregar franja' }).boundingBox();
    const hasta = await tarjeta.getByRole('group', { name: 'Hasta' }).boundingBox();
    expect(agregar!.y).toBeGreaterThan(hasta!.y + hasta!.height - 1);

    await tarjeta.getByRole('button', { name: 'Agregar franja' }).click();
    const quitar = tarjeta.getByRole('button', { name: 'Quitar' });
    expect(await alto(quitar)).toBeGreaterThanOrEqual(44);
    await expect(quitar.locator('svg')).toHaveCount(1);
    await quitar.click();

    // #40: la lista quedó vacía, pero en los selectores sigue Martes 19 a 21.
    await tarjeta.getByRole('button', { name: 'Quiero empezar Vida Nueva' }).click();
    await expect(tarjeta.getByText('Estamos buscando a tu Discipulador')).toBeFocused();
    await expect(tarjeta.getByText('Martes 19:00 a 21:00')).toBeVisible();
  });
});

test.describe('Perfil', () => {
  test.use({ viewport: CELULAR });

  test('jerarquía, todo de 44 px, "Cerrar sesión" aparte y neutro, y el éxito queda en pantalla (#50, #51, #52, #54, D151) @celular', async ({ page }) => {
    await registrarPersonaDeTest(page, `e2e-ux-perfil-${Date.now()}@example.com`);
    await page.goto('/perfil');
    await expect(page.getByText(/^Entrás con /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis datos' })).toBeVisible();
    await objetivosDe44(contenido(page));

    const cuenta = page.getByRole('region', { name: 'Tu cuenta' });
    await cuenta.getByRole('button', { name: 'Cerrar sesión' }).click();
    const confirmar = page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cerrar sesión' });
    await expect(confirmar).not.toHaveClass(/bg-destructive/);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Volver' }).click();

    await page.getByLabel('Dirección').fill('Calle 7 n.º 1234');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Guardamos tus cambios.' })).toBeVisible();
  });
});

test.describe('Nosotros', () => {
  test.use({ viewport: CELULAR });

  test('índice compacto en celular, con chevrón en cada tarjeta (#9, #10) @celular', async ({ page }) => {
    await page.goto('/nosotros');
    const lista = contenido(page).getByRole('list').first();
    await expect(lista.getByRole('link')).toHaveCount(6);
    await expect(lista.locator('svg.lucide-chevron-right')).toHaveCount(6);
    const altoLista = await alto(lista);
    expect(altoLista).toBeLessThan(1000);
  });
});

test.describe('Primeros pasos', () => {
  test.use({ viewport: CELULAR });

  test('"Conocé los ministerios" de 44 px y la nota final en 16 px (#11, #12) @celular', async ({ page }) => {
    await page.goto('/primeros-pasos');
    await objetivosDe44(contenido(page));
    expect(await tamanoDeLetra(page.getByText(/^No hace falta que hagas nada de esto ya mismo/))).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Visitanos', () => {
  test.use({ viewport: CELULAR });

  test('"Cómo llegar" abre el mapa, sin "Elegí la Sede" si no hay nada que elegir, botones de 44 px (#15, #16, #17) @celular', async ({ page }) => {
    await page.goto('/visitanos');
    await expect(page.getByText(/Elegí la Sede/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Cómo llegar' }).first()).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\//);
    await objetivosDe44(contenido(page));
  });
});

test.describe('Dar', () => {
  test.use({ viewport: CELULAR });

  test('"Copiar" con texto visible y 44 px, también en CUIT y cuenta; etiquetas en 16 px (#18, #19, #20) @celular', async ({ page }) => {
    await page.goto('/dar');
    for (const dato of ['Alias', 'CBU', 'CUIT', 'Cuenta']) {
      await expect(page.getByRole('button', { name: `Copiar ${dato}` })).toHaveText('Copiar');
    }
    await objetivosDe44(contenido(page));
    expect(await tamanoDeLetra(page.getByText('Alias', { exact: true }))).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Ediciones VS', () => {
  test.use({ viewport: CELULAR });

  test('una columna en celular con la portada a la izquierda; redes con nombre y 44×44 (#22, #23) @celular', async ({ page }) => {
    await page.goto('/nosotros/ediciones-vs');
    const redes = page.getByRole('navigation', { name: /Facebook de Ediciones VS/ });
    await expect(redes.getByRole('link', { name: 'Facebook de Ediciones VS' })).toHaveText('Facebook');
    await objetivosDe44(redes);

    const libros = page.getByRole('list', { name: 'Catálogo' }).getByRole('listitem');
    if ((await libros.count()) > 0) {
      const primero = libros.first();
      const portada = await primero.locator(':scope > *').first().boundingBox();
      const titulo = await primero.locator(':scope > p').first().boundingBox();
      expect(titulo!.x).toBeGreaterThan(portada!.x + portada!.width - 1);
    }
  });
});
