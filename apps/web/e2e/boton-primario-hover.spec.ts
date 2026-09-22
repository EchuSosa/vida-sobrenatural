import { test, expect, auditar } from './helpers';

/**
 * H-56 (revisión manual, D118): el hover de un botón primario apareció
 * como una falla de otro e2e (Sedes) con el cursor parado encima —
 * hover:bg-primary/80 acerca el botón sólido al fondo y el texto blanco
 * cae por debajo de 4.5:1 (5.80:1 → 3.93:1 en claro; 6.48:1 → 4.59:1 en
 * oscuro, que pasaba raspando). El arreglo cambia de tono
 * (--primary-hover) en vez de opacidad — packages/ui/src/components/ui/
 * button.tsx. Este test deja auditado el estado CON el cursor encima, no
 * solo el de reposo, para que una regresión futura no dependa de que otro
 * test la encuentre por accidente.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`modo ${colorScheme}`, () => {
    test.use({ colorScheme });

    test('un botón primario en :hover sigue cumpliendo contraste AA', async ({ page }) => {
      await page.goto('/');
      const boton = page.getByRole('link', { name: 'Ver primeros pasos' });
      await expect(boton).toBeVisible();
      await boton.hover();

      const resultados = await auditar(page);
      const violacionesContraste = resultados.violations.filter((v) => v.id === 'color-contrast');
      expect(violacionesContraste).toEqual([]);
    });
  });
}
