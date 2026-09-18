import { expect, type Page } from '@playwright/test';

/**
 * Helpers compartidos por los e2e de registro/sesión — extraídos acá para
 * no triplicar el mismo flujo (actualización 2026-09-18, revisión manual
 * H-19/H-15/H-16/H-11).
 */

export async function loguearseComoTest(
  page: Page,
  email: string,
  opciones?: { emailVerified?: 'true' | 'false' },
) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken, ...(opciones?.emailVerified ? { emailVerified: opciones.emailVerified } : {}) },
  });
}

/** Completa el formulario de registro por pasos (mayor de edad) de punta a punta. */
export async function registrarPersonaDeTest(page: Page, email: string) {
  await loguearseComoTest(page, email);
  await page.goto('/registro');

  await page.getByLabel('Apellido').fill('García');
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Género').selectOption('femenino');
  await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Código de país').selectOption('+54');
  await page.getByLabel('Número de teléfono').fill('92211234567');
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
  await expect(page).toHaveURL(/\/registro\/listo/);
}
