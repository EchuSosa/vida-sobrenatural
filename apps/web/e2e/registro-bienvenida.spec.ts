import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loguearseComoTest } from './helpers';

/**
 * Único flujo E2E exigido por la Constitución (Principio VI): el registro
 * completo de Bienvenida (Historia 2). Usa el proveedor `test-login`
 * (habilitado solo con ALLOW_TEST_LOGIN=true) para autenticar sin depender de
 * un login real de Google — ver apps/web/src/auth.ts.
 *
 * Corre en modo claro y oscuro con @axe-core/playwright en cada paso —
 * Constitución Principio VII / specs/001-fase-bienvenida, Phase 8 (D94,
 * formulario por pasos con indicador de progreso — actualización 2026-09-17)
 * y Phase 9 (H-19/H-15/H-16, sesión y navegación — actualización 2026-09-18).
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('un Visitante mayor de edad se registra vía SSO, en un formulario de 4 pasos, y queda como Miembro registrado', async ({
      page,
    }) => {
      const email = `e2e-${colorScheme}-${Date.now()}@example.com`;
      await loguearseComoTest(page, email);

      await page.goto('/registro');
      await expect(page.getByRole('heading', { name: 'Completá tus datos' })).toBeVisible();
      await expect(page.getByText('Paso 1 de 4')).toBeVisible();

      let resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      // Paso 1 — Datos personales.
      await page.getByLabel('Apellido').fill('García');
      await page.getByLabel('Nombre').fill('Ana');
      await page.getByLabel('Género').selectOption('femenino');
      await page.getByLabel('Fecha de nacimiento').fill('1990-05-20');
      await page.getByRole('button', { name: 'Siguiente' }).click();

      // Paso 2 — Contacto.
      await expect(page.getByText('Paso 2 de 4')).toBeVisible();
      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByLabel('Código de país').selectOption('+54');
      await page.getByLabel('Número de teléfono').fill('92211234567');
      await page.getByLabel('Dirección').fill('Calle 1 y 50');
      await page.getByLabel('Sede').selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Siguiente' }).click();

      // Paso 3 — Sobre vos. "Otro" ejercita también el campo condicional de detalle.
      await expect(page.getByText('Paso 3 de 4')).toBeVisible();
      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByLabel('Estado civil').selectOption('soltero_a');
      await page.getByLabel('Profesión').selectOption('otro');
      await page.getByLabel('¿Cuál?').fill('Apicultora');
      await page.getByLabel('Tiempo congregándote').selectOption('menos_6_meses');
      await page.getByRole('button', { name: 'Siguiente' }).click();

      // Paso 4 — Resumen: verifica que lo cargado en los pasos anteriores no
      // se perdió al avanzar (D94), antes de tocar el checkbox y enviar.
      await expect(page.getByText('Paso 4 de 4')).toBeVisible();
      await expect(page.getByText('García', { exact: false })).toBeVisible();
      await expect(page.getByText('Apicultora', { exact: false })).toBeVisible();

      // Volver a un paso anterior con "Atrás" no debe perder lo cargado.
      await page.getByRole('button', { name: 'Atrás' }).click();
      await expect(page.getByText('Paso 3 de 4')).toBeVisible();
      await expect(page.getByLabel('Estado civil')).toHaveValue('soltero_a');
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page.getByText('Paso 4 de 4')).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Registrarme' }).click();

      // Éxito (Historia 2, FR-005 a FR-009) — sin mención a Vida Nueva/Vida de
      // Servicio/Ministerio en esta pantalla (FR-012). El menú público (H-19)
      // ya no muestra "Ingresar" — update() de NextAuth refrescó la sesión
      // antes de llegar acá, sin necesitar un login nuevo.
      await expect(page).toHaveURL(/\/registro\/listo/);
      await expect(page.getByRole('heading', { name: '¡Listo, ya sos parte!' })).toBeVisible();
      // Acotado al contenido propio de la pantalla (no al menú/pie, que desde
      // H-05 sí están presentes y legítimamente incluyen "Ministerios").
      const contenido = page.locator('main');
      for (const fase of ['Vida Nueva', 'Vida de Servicio', 'Ministerio']) {
        await expect(contenido.getByText(fase)).toHaveCount(0);
      }
      await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Ir a la app' })).toBeVisible();
      // H-05: /registro/listo conserva el menú y el pie de página, y ofrece
      // volver al Inicio.
      await expect(page.getByRole('link', { name: 'Ir a Inicio' })).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);

      // H-15: entrar de nuevo a /registro/listo en otra pestaña (sin el flag
      // de "recién completado" de esta) redirige a Inicio, no repite la
      // confirmación falsa.
      const otraPestana = await page.context().newPage();
      await otraPestana.goto('/registro/listo');
      await expect(otraPestana).toHaveURL('/');
      await otraPestana.close();

      // Volver a "loguearse" con el mismo email ya no debería pedir el formulario
      // de nuevo (Acceptance Scenario 3 de Historia 2). H-16: la redirección
      // avisa por qué, en vez de un salto silencioso.
      await loguearseComoTest(page, email);
      await page.goto('/registro');
      await expect(page).toHaveURL(/\/primeros-pasos/);
      await expect(page.getByText('Ya estás registrada, no hace falta completarlo de nuevo.')).toBeVisible();

      resultados = await new AxeBuilder({ page }).analyze();
      expect(resultados.violations).toEqual([]);
    });
  });
}
