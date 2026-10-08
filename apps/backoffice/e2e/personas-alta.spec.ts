import type { Page } from '@playwright/test';
import type { Pagina, PersonaListado } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, auditar, loguearseComoAdminE2E, loguearseComoPastorE2E } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

/**
 * spec 006, T074 (Historia 5, escenarios 1–9; FR-031 a FR-039; SC-007): el
 * alta de una Persona adulta por el Admin desde Personas, con axe en claro y
 * oscuro, en escritorio y `@celular`. Las Personas sin email llevan apellido
 * `e2e-…` para que las borre limpiar-e2e.
 */

async function sinViolaciones(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function completar(page: Page, o: { apellido: string; nombre: string; telefono: string; fecha?: string; email?: string }) {
  await page.getByLabel('Apellido').fill(o.apellido);
  await page.getByLabel('Nombre', { exact: true }).fill(o.nombre);
  await page.getByLabel('Género').selectOption('femenino');
  await completarFecha(campo(page, 'Fecha de nacimiento'), o.fecha ?? '1948-03-12');
  await page.getByLabel('Teléfono').fill(o.telefono);
  await page.getByLabel('Dirección').fill('Calle 7 1234');
  if (o.email) await page.getByLabel('Email (opcional)').fill(o.email);
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByLabel('¿En qué año empezó a venir a la iglesia?').selectOption({ index: 5 });
  await page.getByLabel('Estado civil').selectOption('viudo_a');
  await page.getByLabel('Profesión u ocupación').selectOption('jubilado_a');
  await page.getByRole('checkbox').check();
}

async function buscar(apellido: string): Promise<PersonaListado[]> {
  const pagina = await apiComo<Pagina<PersonaListado>>('e2e-admin@example.com', 'GET', `/personas?skip=0&take=20&buscar=${encodeURIComponent(apellido)}`);
  return pagina.items;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.beforeEach(async ({ page, permitirErrorDeConsola }) => {
      // Los rechazos que el test provoca a propósito (400 por campos, 409 por email o duplicado).
      permitirErrorDeConsola(/the server responded with a status of (400|409)/);
      if (colorScheme === 'dark') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      await loguearseComoAdminE2E(page);
    });

    test('envío vacío: errores por campo, resumen con enlaces y foco; sin email: éxito con qué sigue e insignia en Personas; "Agregar email" @celular', async ({ page }) => {
      const apellido = `e2e-alta-${colorScheme}-${Date.now()}`;
      await page.goto('/personas');
      await page.waitForLoadState('networkidle');
      await page.getByRole('link', { name: 'Dar de alta una persona' }).click();
      await expect(page).toHaveURL(/\/personas\/nueva$/);
      await expect(page.getByRole('heading', { name: 'Dar de alta una persona', level: 1 })).toBeVisible();
      await sinViolaciones(page);

      await page.getByRole('button', { name: 'Dar de alta' }).click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá esto antes de guardar:' });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole('link', { name: 'Escribí el apellido.' })).toBeVisible();
      await expect(page.locator('#campo-apellido-error')).toHaveText('Escribí el apellido.');
      await expect(page.locator('#campo-consentimiento-error')).toContainText('consentimiento');
      await sinViolaciones(page);

      await completar(page, { apellido, nombre: 'Rosa', telefono: `221${String(Date.now()).slice(-7)}` });
      await expect(resumen).toHaveCount(0);
      // Doble toque: una sola Persona (H-57).
      await page.getByRole('button', { name: 'Dar de alta' }).dblclick();
      await expect(page.getByRole('heading', { name: `Listo: Rosa ${apellido} ya está cargada` })).toBeVisible();
      await expect(page.getByRole('status')).toContainText('Sin acceso a la app');
      await expect(page.getByRole('status')).toContainText('pedir Vida Nueva en su nombre');
      await sinViolaciones(page);
      expect(await buscar(apellido)).toHaveLength(1);

      // En Personas: la insignia y "Agregar email".
      await page.waitForLoadState('networkidle');
      await page.goto(`/personas?q=${apellido}`);
      const fila = page.getByRole('row').filter({ hasText: apellido });
      await expect(fila.getByText('Sin acceso a la app')).toBeVisible();
      await sinViolaciones(page);
      await fila.getByRole('button', { name: `Agregar email a Rosa ${apellido}` }).click();
      const panel = page.getByRole('dialog');
      await panel.getByLabel('Email').fill('no-es-un-email');
      await panel.getByRole('button', { name: 'Guardar email' }).click();
      await expect(panel.locator('#campo-email-error')).toBeVisible();
      await panel.getByLabel('Email').fill(`${apellido}@example.com`);
      await sinViolaciones(page);
      await panel.getByRole('button', { name: 'Guardar email' }).click();
      await expect(page.getByText(`Listo: Rosa ${apellido} ya puede entrar a la app con ese email.`)).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: apellido }).getByText('Sin acceso a la app')).toHaveCount(0);
    });

    test('mismo teléfono escrito distinto: aviso de posible duplicado con la existente, y "Es otra persona, crear igual" sin recargar datos', async ({ page }) => {
      const apellido = `e2e-dup-${colorScheme}-${Date.now()}`;
      const numero = `221${String(Date.now()).slice(-7)}`;
      await page.goto('/personas/nueva');
      await completar(page, { apellido, nombre: 'Primera', telefono: numero });
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.getByRole('heading', { name: /ya está cargada/ })).toBeVisible();

      await page.getByRole('button', { name: 'Dar de alta otra persona' }).click();
      // El mismo número con el 9 de celular adelante.
      await completar(page, { apellido, nombre: 'Segunda', telefono: `9${numero}`, fecha: '1960-06-06' });
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      const aviso = page.getByRole('region', { name: 'Puede que esta persona ya esté cargada' });
      await expect(aviso).toBeVisible();
      await expect(aviso).toContainText(`Primera ${apellido}`);
      await expect(aviso).toContainText('Coincide en: el teléfono');
      await sinViolaciones(page);
      await aviso.getByRole('button', { name: 'Es otra persona, crear igual' }).click();
      await expect(page.getByRole('heading', { name: `Listo: Segunda ${apellido} ya está cargada` })).toBeVisible();
      expect(await buscar(apellido)).toHaveLength(2);
    });

    test('D215: un DNI ya cargado bloquea debajo del campo, dice quién lo tiene y lleva a esa Persona', async ({ page }) => {
      const apellido = `e2e-dni-${colorScheme}-${Date.now()}`;
      const dni = `${colorScheme === 'light' ? 3 : 4}${String(Date.now()).slice(-7)}`;
      const conPuntos = `${dni.slice(0, 2)}.${dni.slice(2, 5)}.${dni.slice(5)}`;
      await page.goto('/personas/nueva');
      await expect(page.getByText('Solo números, sin puntos.')).toBeVisible();
      await completar(page, { apellido, nombre: 'Primera', telefono: `221${String(Date.now()).slice(-7)}` });
      await page.getByLabel('DNI (opcional)').fill(conPuntos);
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.getByRole('heading', { name: `Listo: Primera ${apellido} ya está cargada` })).toBeVisible();

      await page.getByRole('button', { name: 'Dar de alta otra persona' }).click();
      // Otra persona en todo lo demás: sin el DNI no habría ningún aviso.
      await completar(page, { apellido: `${apellido}-b`, nombre: 'Segunda', telefono: `11${String(Date.now()).slice(-8)}`, fecha: '1970-01-01' });
      await page.getByLabel('DNI (opcional)').fill('12.34');
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('#campo-dni-error')).toHaveText('El DNI tiene que tener 7 u 8 números. Escribilo solo con números, sin puntos.');

      await page.getByLabel('DNI (opcional)').fill(dni);
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('#campo-dni-error')).toContainText(`Ya hay una Persona con este DNI: Primera ${apellido}.`);
      await expect(page.getByLabel('DNI (opcional)')).toHaveAttribute('aria-invalid', 'true');
      // No hay "crear igual": el DNI no se repite.
      await expect(page.getByRole('button', { name: 'Es otra persona, crear igual' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /ya está cargada/ })).toHaveCount(0);
      await sinViolaciones(page);
      expect(await buscar(`${apellido}-b`)).toHaveLength(0);

      await page.getByRole('link', { name: `Ver a Primera ${apellido}` }).click();
      await expect(page.getByRole('row').filter({ hasText: apellido })).toBeVisible();
    });

    test('un email ya usado se rechaza debajo del campo', async ({ page }) => {
      const apellido = `e2e-mail-${colorScheme}-${Date.now()}`;
      await page.goto('/personas/nueva');
      await completar(page, { apellido, nombre: 'Rosa', telefono: `221${String(Date.now()).slice(-7)}`, email: 'e2e-admin@example.com' });
      await page.getByRole('button', { name: 'Dar de alta' }).click();
      await expect(page.locator('#campo-email-error')).toBeVisible();
      await expect(page.getByRole('heading', { name: /ya está cargada/ })).toHaveCount(0);
    });
  });
}

test('el Pastor no ve "Dar de alta una persona" ni "Agregar email", y /personas/nueva no existe para él', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(/Failed to load resource: the server responded with a status of 404/);
  await loguearseComoPastorE2E(page);
  await page.goto('/personas');
  await expect(page.getByRole('heading', { name: 'Personas', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dar de alta una persona' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Agregar email/ })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.goto('/personas/nueva');
  await expect(page.getByRole('heading', { name: 'No encontramos esta sección' })).toBeVisible();
});
