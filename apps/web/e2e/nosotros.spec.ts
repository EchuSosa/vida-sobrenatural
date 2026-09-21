import { test, expect } from '@playwright/test';
import { auditar } from './helpers';

/**
 * Historia 1 (specs/003-contenido-institucional, H-31/H-32, D109): el
 * contenido institucional real de Nosotros (identidad, historia, visión,
 * misión, valores, sistema de trabajo, llamado, congregación local), más
 * los enlaces a sus dos subpáginas (D115). El scroll horizontal a 320/375px
 * ya lo cubre `axe-todas-las-rutas.spec.ts` (H-62) para toda ruta pública —
 * no se repite acá.
 */

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('Nosotros muestra el contenido institucional real, sin duplicar el sistema de trabajo', async ({
      page,
    }) => {
      await page.goto('/nosotros');

      for (const titulo of [
        'Quiénes somos',
        'Nuestra historia',
        'Visión',
        'Misión',
        'Nuestros valores',
        'Bienvenida → Discipulado → Red',
        'Nuestro llamado a servirle',
        'Nuestro desarrollo en una congregación local',
      ]) {
        await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      }

      // Identidad (FR-001).
      await expect(page.getByText('Cristianos:', { exact: false })).toBeVisible();
      await expect(page.getByText('Evangélicos:', { exact: false })).toBeVisible();
      await expect(page.getByText('Bautistas:', { exact: false })).toBeVisible();

      // Historia (fecha real, Acceptance Scenario 1).
      await expect(page.getByText('31 de octubre de 2010', { exact: false })).toBeVisible();

      // Los cuatro valores (FR-001).
      for (const valor of ['Calidad', 'Unidad', 'Generosidad', 'Fe']) {
        await expect(page.getByText(valor, { exact: true })).toBeVisible();
      }

      // El sistema de trabajo enlaza a Primeros pasos en vez de duplicar el
      // texto completo (Acceptance Scenario 3) — Primeros pasos ya tiene su
      // propia numeración de pasos, distinta de las tres etapas de acá.
      const enlacePrimerosPasos = page.getByRole('link', { name: /Ver cómo sigue el proceso en Primeros pasos/i });
      await expect(enlacePrimerosPasos).toBeVisible();

      // El llamado (Isaías 61 + referencia a Lucas 4).
      await expect(page.getByText('Isaías 61:1-4', { exact: false })).toBeVisible();
      await expect(page.getByText('Lucas 4:16-21', { exact: false })).toBeVisible();

      // Lo que ya existía sigue sin cambios (FR-002).
      await expect(page.getByRole('heading', { name: 'Somos Familia' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Liderazgo' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'En qué creemos' })).toBeVisible();
      await expect(page.getByText(/todavía no publicamos nuestra declaración de fe/i)).toBeVisible();

      const resultados = await auditar(page);
      expect(resultados.violations).toEqual([]);
    });

    test('Nosotros enlaza a Palabra Profética y Ediciones VS, sin agregarlas al menú principal', async ({
      page,
    }) => {
      await page.goto('/nosotros');

      const nav = page.getByRole('navigation', { name: 'Principal' });
      await expect(nav.getByRole('link', { name: 'Palabra Profética' })).toHaveCount(0);
      await expect(nav.getByRole('link', { name: 'Ediciones VS' })).toHaveCount(0);

      await page.getByRole('link', { name: 'Palabra Profética' }).click();
      await expect(page).toHaveURL(/\/nosotros\/palabra-profetica/);
      await page.goBack();

      await page.getByRole('link', { name: 'Ediciones VS' }).click();
      await expect(page).toHaveURL(/\/nosotros\/ediciones-vs/);
    });
  });
}
