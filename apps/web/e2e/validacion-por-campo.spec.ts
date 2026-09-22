import { test, expect, loguearseComoTest, registrarPersonaDeTest, auditar } from './helpers';

/**
 * H-50 (revisión manual ronda 4): errores de validación por campo — mensaje
 * debajo del campo, resumen arriba con enlaces a cada campo, foco movido al
 * resumen al enviar, y copia que dice cómo corregir (no solo "inválido").
 * Pieza compartida (`ResumenErrores`, `MensajeErrorCampo`,
 * `erroresPorCampo`, `mensajeDeCampo` — packages/ui y packages/shared-types,
 * Principio XI) — Sedes (apps/backoffice) tiene su propio caso en
 * apps/backoffice/e2e/sedes.spec.ts. Un teléfono de 3 dígitos pasa la
 * validación local (solo pide "no vacío") pero falla en el servidor
 * (TELEFONO_REGEX pide 5-15 dígitos después del código de país) — es la
 * forma más simple de disparar un 400 real de validación por campo.
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('Perfil: un teléfono demasiado corto muestra el error debajo del campo y un resumen arriba con foco', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // H-100: este test manda un teléfono inválido a propósito para
      // probar la validación del servidor — el 400 es lo esperado, no un
      // defecto; Chromium lo loguea solo como error de consola.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 400/);
      const email = `e2e-h50-perfil-${colorScheme}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      await page.goto('/perfil');
      await page.waitForLoadState('networkidle');

      const telefono = page.getByLabel('Número de teléfono');
      await telefono.fill('123');
      // H-72: salir del campo ahora revalida en el momento — sin este blur
      // explícito, el propio click en "Guardar cambios" dispara ese blur (el
      // teléfono todavía tiene el foco) y el mensaje que aparece corre el
      // resto del formulario antes de que el click llegue a destino. Un
      // blur previo es lo que haría alguien tabulando o clickeando en otro
      // lado primero.
      await telefono.blur();
      await expect(page.locator('#campo-telefono-error')).toBeVisible();
      await page.getByRole('button', { name: 'Guardar cambios' }).click();

      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeVisible();
      await expect(resumen).toBeFocused();
      await expect(
        resumen.getByRole('link', { name: 'Ingresá un teléfono con código de área, por ejemplo 221 555 1234.' }),
      ).toBeVisible();
      // El mismo mensaje aparece dos veces: en el resumen y debajo del campo.
      await expect(page.getByText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.')).toHaveCount(
        2,
      );

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('H-72: en Perfil, el error de un campo se limpia al escribir y vuelve al salir si sigue mal, sin reenviar', async ({
      page,
    }) => {
      const email = `e2e-h72-perfil-${colorScheme}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      await page.goto('/perfil');
      await page.waitForLoadState('networkidle');

      const telefono = page.getByLabel('Número de teléfono');
      const errorTelefono = page.locator('#campo-telefono-error');

      // Formato inválido + salir del campo: aparece el error, sin haber enviado.
      await telefono.fill('123');
      await telefono.blur();
      await expect(errorTelefono).toBeVisible();
      await expect(errorTelefono).toHaveText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.');

      // Escribir de nuevo lo limpia al toque, antes de volver a salir del campo.
      await telefono.fill('1234');
      await expect(errorTelefono).toBeHidden();

      // Corregido y fuera del campo: se queda limpio (no "vuelve" porque ahora es válido).
      await telefono.fill('92211230000');
      await telefono.blur();
      await expect(errorTelefono).toBeHidden();

      await expect(page.getByText('Guardamos tus cambios.')).toBeHidden();
    });

    test('Registro: un teléfono inválido cargado en el paso 2 se señala aunque el error llegue recién al enviar en el paso 4', async ({
      page,
      permitirErrorDeConsola,
    }) => {
      // H-100: este test manda un teléfono inválido a propósito (ver el
      // comentario de más abajo sobre "12") para probar la validación del
      // servidor en el paso 4 — el 400 es lo esperado, no un defecto.
      permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 400/);
      const email = `e2e-h50-registro-${colorScheme}-${Date.now()}@example.com`;
      await loguearseComoTest(page, email);
      await page.goto('/registro');

      await page.getByLabel('Apellido').fill('García');
      await page.getByLabel('Nombre').fill('Ana');
      await page.getByLabel('Género').selectOption('femenino');
      await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
      await page.getByRole('button', { name: 'Siguiente' }).click();

      await page.getByLabel('Código de país').selectOption('+54');
      // "12" y no "123": el registro manda "código + espacio + número" y con
      // "123" el backtracking de TELEFONO_REGEX (país de 1 a 4 dígitos)
      // encuentra una forma de leer "+54 123" como válido igual — con "12"
      // no alcanza ninguna combinación, y sigue siendo "no vacío" para la
      // validación local del paso 2 (pasoValido).
      await page.getByLabel('Número de teléfono').fill('12');
      await page.getByLabel('Dirección').fill('Calle 1 y 50');
      await page.getByLabel('Sede').selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Siguiente' }).click();

      await page.getByLabel('Estado civil').selectOption('soltero_a');
      await page.getByLabel('Profesión').selectOption('otro');
      await page.getByLabel('¿Cuál?').fill('Apicultora');
      await page.getByLabel('Tiempo congregándote').selectOption('menos_6_meses');
      await page.getByRole('button', { name: 'Siguiente' }).click();

      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Registrarme' }).click();

      // El campo con error (telefono) es del paso 2 — el envío pasa desde
      // el paso 4, así que tiene que volver ahí para que el campo señalado
      // exista en la pantalla.
      await expect(page.getByRole('heading', { name: 'Contacto' })).toBeVisible();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá estos campos:' });
      await expect(resumen).toBeVisible();
      await expect(resumen).toBeFocused();
      await expect(page.getByLabel('Número de teléfono')).toHaveValue('12');
      await expect(page.getByText('Ingresá un teléfono con código de área, por ejemplo 221 555 1234.')).toHaveCount(
        2,
      );

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });
  });
}
