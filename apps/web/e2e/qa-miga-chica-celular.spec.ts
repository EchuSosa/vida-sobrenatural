import { test, expect, loguearseComoTest } from './helpers';
import { EMAILS_017 } from './helpers-017';

/**
 * QA ronda 2, BUG-18: spec 017, SC-004 — la grilla de turnos tiene que tener 44 px de alto mínimo
 * en lo que se toca en el celular. Los enlaces de la miga de pan ("Mi ministerio", el nombre del
 * Ministerio) miden 20 px: con el dedo es fácil errar, y el público incluye gente mayor.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.fail('en celular, los enlaces de la miga de la grilla de turnos miden 44 px', async ({ page }) => {
  await loguearseComoTest(page, EMAILS_017.liderCelular);
  await page.goto('/mi-ministerio');
  await page.getByRole('link', { name: 'Armar los turnos' }).click();
  await page.waitForURL(/\/mi-ministerio\/[0-9a-f-]+\/turnos$/);
  const enlaces = page.getByRole('navigation', { name: 'Ruta' }).getByRole('link');
  await expect(enlaces.first()).toBeVisible();
  const alturas = await enlaces.evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().height)));
  expect(Math.min(...alturas)).toBeGreaterThanOrEqual(44);
});
