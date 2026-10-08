import { test, expect } from './helpers';

/**
 * H-15 (specs/001-fase-bienvenida, revisión manual 2026-09-18): /registro/listo
 * no debe poder verse sin haberse registrado — ver también el caso de
 * "otra pestaña, misma sesión, sin el flag de recién completado" dentro de
 * registro-bienvenida.spec.ts.
 */

test('entrar a /registro/listo sin sesión lleva al ingreso (vía /registro), sin mostrar la confirmación', async ({
  page,
}) => {
  await page.goto('/registro/listo');
  // spec 007 (T024): /registro sin sesión redirige a /ingresar.
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByText('¡Listo, ya sos parte!')).toHaveCount(0);
});
