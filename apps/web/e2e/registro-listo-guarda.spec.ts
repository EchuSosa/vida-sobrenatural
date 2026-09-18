import { test, expect } from '@playwright/test';

/**
 * H-15 (specs/001-fase-bienvenida, revisión manual 2026-09-18): /registro/listo
 * no debe poder verse sin haberse registrado — ver también el caso de
 * "otra pestaña, misma sesión, sin el flag de recién completado" dentro de
 * registro-bienvenida.spec.ts.
 */

test('entrar a /registro/listo sin sesión redirige a /registro, sin mostrar la confirmación', async ({
  page,
}) => {
  await page.goto('/registro/listo');
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByText('¡Listo, ya sos parte!')).toHaveCount(0);
});
