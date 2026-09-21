import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

/**
 * H-53 (revisión manual, D118): fuerza landmark-unique, landmark-one-main y
 * region habilitadas — ya lo están por defecto en axe-core 4.13, pero
 * quedan explícitas acá para que un cambio de versión no las apague sin que
 * nadie lo note (los <main> anidados de H-51/H-52 pasaron desapercibidos
 * por otra razón — los scans anteriores corrían con un modal abierto
 * encima, que oculta el resto vía `inert` — pero esta explicitud es la
 * defensa concreta que pide D118 contra ese mismo tipo de agujero).
 * `reglasDeshabilitadas` reemplaza al `.disableRules()` encadenado: como
 * `AxeBuilder#options`/`#disableRules` se pisan entre sí (cada uno
 * reemplaza `this.option` entero, no lo mergea), hay que armar el objeto
 * de reglas completo en un solo `.options()`.
 */
export function crearAxeBuilder(page: Page, reglasDeshabilitadas: string[] = []) {
  const rules: Record<string, { enabled: boolean }> = {
    'landmark-unique': { enabled: true },
    'landmark-one-main': { enabled: true },
    region: { enabled: true },
  };
  for (const regla of reglasDeshabilitadas) {
    rules[regla] = { enabled: false };
  }
  return new AxeBuilder({ page }).options({ rules });
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
