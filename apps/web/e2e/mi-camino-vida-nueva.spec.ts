import type { Page } from '@playwright/test';
import { test, expect, auditar, registrarPersonaDeTest, usarTemaOscuro, esperarTema } from './helpers';
import { api, registrarMenorActivo, tokenDe } from './helpers-006';
import { campo, elegirHora } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * specs/004, Historias 1 y 2 (T021, T035): Vida Nueva en Mi camino, de punta
 * a punta y con axe en los dos temas. Lo que arma el equipo (proponer,
 * rechazar) se hace por API con la sesión de e2e-admin, que siembra
 * sembrar-e2e-admin.ts; e2e-discipulador@ ya tiene agenda (martes 19–21) y la
 * disponibilidad prendida.
 *
 * spec 006 (T027): Vida Nueva pasó de `/mi-camino` a `/mi-camino/vida-nueva`;
 * lo que se afirma no cambia.
 */

/**
 * La tarjeta de Vida Nueva. Las búsquedas de texto van adentro de ella: al
 * recargar, Next conserva una copia oculta del render anterior y un
 * `getByText` suelto encuentra dos.
 */
function tarjeta(page: Page) {
  return page.getByRole('region', { name: 'Vida Nueva' });
}

/** Con el tema verificado en `<html>` antes de auditar (ver `usarTemaOscuro` en helpers.ts). */
async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('un menor de 12 no ve el botón de pedir y sí el texto del tutor (FR-044)', async ({ page, baseURL }) => {
      const email = `e2e-mi-camino-menor-${tema}-${Date.now()}@example.com`;
      await registrarMenorActivo(page, baseURL!, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino/vida-nueva');
      await page.waitForLoadState('networkidle');

      await expect(tarjeta(page).getByText('Este pedido lo hace tu mamá, tu papá o tu tutor')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toHaveCount(0);
      await sinViolaciones(page, tema);
    });

    test('pedir Vida Nueva: sin franjas da el error por campo; con una, pasa a "buscando", se edita y se retira @webkit', async ({ page }) => {
      const email = `e2e-mi-camino-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      await page.goto('/mi-camino/vida-nueva');
      await page.waitForLoadState('networkidle');
      await sinViolaciones(page, tema);

      // Sin franjas y con un horario que no sirve en los selectores (fin antes
      // del inicio): error debajo del campo y en el resumen, con foco (H-50).
      // Con uno que sirve, se toma aunque no se haya tocado "Agregar franja"
      // (ajustes-ux #40, ver ajustes-ux.spec.ts).
      const pedir = page.getByRole('button', { name: 'Quiero empezar Vida Nueva' });
      await elegirHora(campo(page, 'Hasta'), '18:00');
      await pedir.click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' });
      await expect(resumen).toBeFocused();
      await expect(page.locator('#campo-franjas-error')).toHaveText(
        'Elegí un día y un horario en el que la hora de fin sea después de la de inicio, y tocá "Agregar franja".',
      );
      await sinViolaciones(page, tema);

      // Con una franja (martes 19 a 21, el default del editor): pasa a buscando sin recargar.
      await elegirHora(campo(page, 'Hasta'), '21:00');
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await expect(resumen).toHaveCount(0);
      // FR-017a (H-R7): la misma franja otra vez no se suma; el editor dice cómo seguir.
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await expect(page.getByText('Ese horario ya está en la lista. Elegí otro día u otras horas.')).toBeVisible();
      await pedir.click();
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();
      await expect(tarjeta(page).getByText('Martes 19:00 a 21:00')).toBeVisible();
      await sinViolaciones(page, tema);

      await page.reload();
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();

      // Editar los horarios: cambia a sábado 10 a 13.
      await page.getByRole('button', { name: 'Editar horarios' }).click();
      await page.getByRole('button', { name: 'Quitar' }).click();
      await page.getByLabel('Día', { exact: true }).selectOption({ label: 'Sábado' });
      await elegirHora(campo(page, 'Desde'), '10:00');
      await elegirHora(campo(page, 'Hasta'), '13:00');
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Guardar horarios' }).click();
      await expect(tarjeta(page).getByText('Sábado 10:00 a 13:00')).toBeVisible();
      await expect(tarjeta(page).getByText('Martes 19:00 a 21:00')).toHaveCount(0);

      // Retirar, con confirmación, y volver a poder pedir.
      await page.getByRole('button', { name: 'Retirar el pedido' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('¿Retirar tu pedido de Vida Nueva?');
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Sí, retirar el pedido' }).click();
      await expect(tarjeta(page).getByText('Retiraste tu pedido anterior.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toBeVisible();
    });

    test('con la Solicitud propuesta ve lo mismo que pendiente, sin el nombre del Discipulador; rechazada, ve el estado y puede volver a pedir (T035)', async ({
      page,
      baseURL,
    }) => {
      const email = `e2e-mi-camino-propuesta-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      const persona = await tokenDe(baseURL!, email);
      const { id: solicitudId } = await api(persona, 'POST', '/discipulado/solicitudes/me', {
        franjas: [{ diaSemana: 2, inicio: 18 * 60, fin: 20 * 60 }],
      });

      const admin = await tokenDe(baseURL!, 'e2e-admin@example.com');
      const cruce = await api(admin, 'GET', `/discipulado/solicitudes/${solicitudId}/cruce`);
      const propuesto = [...cruce.franjas.flatMap((f: { coinciden: unknown[] }) => f.coinciden), ...cruce.noCoinciden][0] as {
        id: string;
        nombre: string;
        apellido: string;
      };
      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/proponer`, { discipuladorId: propuesto.id });

      await page.goto('/mi-camino/vida-nueva');
      await page.waitForLoadState('networkidle');
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();
      await expect(page.getByText(propuesto.apellido)).toHaveCount(0);
      await sinViolaciones(page, tema);

      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/retirar-propuesta`);
      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/rechazar`);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(tarjeta(page).getByText('Esta vez tu pedido no pudo avanzar.', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toBeVisible();
      await sinViolaciones(page, tema);
    });

    test('aceptada: ve a su Discipulador con su teléfono y no ve las notas de los Encuentros (T035)', async ({ page, baseURL }) => {
      const email = `e2e-mi-camino-aceptada-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      if (tema === 'oscuro') await usarTemaOscuro(page, email);
      const persona = await tokenDe(baseURL!, email);
      const { id: solicitudId } = await api(persona, 'POST', '/discipulado/solicitudes/me', {
        franjas: [{ diaSemana: 2, inicio: 18 * 60, fin: 20 * 60 }],
      });

      // El equipo: el Admin la propone a e2e-discipulador@ (fixture con agenda
      // del martes), ella acepta y carga un Encuentro con una nota.
      const admin = await tokenDe(baseURL!, 'e2e-admin@example.com');
      const cruce = await api(admin, 'GET', `/discipulado/solicitudes/${solicitudId}/cruce`);
      const discipuladora = [...cruce.franjas.flatMap((f: { coinciden: unknown[] }) => f.coinciden), ...cruce.noCoinciden].find(
        (d: { apellido: string }) => d.apellido === 'Discipuladora',
      ) as { id: string; nombre: string; apellido: string };
      const { propuestaId } = await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/proponer`, { discipuladorId: discipuladora.id });
      const disc = await tokenDe(baseURL!, 'e2e-discipulador@example.com');
      const { grupoId } = await api(disc, 'POST', `/discipulado/propuestas/${propuestaId}/aceptar`);
      const nota = `Nota pastoral ${tema} ${Date.now()}`;
      const ayer = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
      await api(disc, 'POST', `/discipulado/mis-discipulados/${grupoId}/encuentros`, { fecha: ayer, capitulos: '1 y 2', notas: nota });

      await page.goto('/mi-camino/vida-nueva');
      await page.waitForLoadState('networkidle');
      await expect(tarjeta(page).getByText('Estás haciendo Vida Nueva')).toBeVisible();
      await expect(tarjeta(page).getByText(`Tu Discipulador es ${discipuladora.nombre} ${discipuladora.apellido}.`)).toBeVisible();
      await expect(tarjeta(page).getByText(/Su teléfono es \+54/)).toBeVisible();
      // ajustes-ux #46: escribirle o llamarlo, con botones de verdad.
      await expect(page.getByRole('link', { name: 'Escribirle por WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/54\d+$/);
      await expect(page.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', /^tel:\+54\d+$/);
      // FR-029: ni la nota ni los capítulos.
      await expect(page.getByText(nota)).toHaveCount(0);
      await expect(page.getByText('1 y 2')).toHaveCount(0);
      await sinViolaciones(page, tema);
    });
  });
}
