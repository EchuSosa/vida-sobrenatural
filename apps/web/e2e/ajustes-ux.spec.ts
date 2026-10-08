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
    expect(await tamanoDeLetra(page.locator('label', { has: apellido }))).toBeGreaterThanOrEqual(16);

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
