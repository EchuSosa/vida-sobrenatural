import type { Locator, Page } from '@playwright/test';
import { expect } from './helpers';

/**
 * ajustes-ux (revisión de UX del 2026-09-30, D150): mediciones de celular
 * que repiten varias pantallas.
 */

/** Todo lo tocable visible dentro de `ambito` mide al menos 44 px de alto (y de ancho, si es solo ícono). */
export async function objetivosDe44(ambito: Locator) {
  const chicos = await ambito.evaluate((raiz) =>
    [...raiz.querySelectorAll<HTMLElement>('button, a[href], select, input:not([type="hidden"]):not([type="checkbox"])')]
      .filter((el) => el.getClientRects().length > 0 && !el.closest('nav[aria-label="Ruta"]') && !el.closest('p'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        const nombre = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
        return { el: `${el.tagName.toLowerCase()} "${nombre}"`, h: r.height, w: r.width };
      })
      .filter((r) => r.h < 44 || r.w < 44)
      .map((r) => `${r.el}: ${Math.round(r.w)}×${Math.round(r.h)}`),
  );
  expect(chicos).toEqual([]);
}

/** Tamaño de letra calculado, en px. */
export async function tamanoDeLetra(elemento: Locator) {
  return elemento.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}

/** Alto calculado, en px. */
export async function alto(elemento: Locator) {
  return elemento.evaluate((el) => el.getBoundingClientRect().height);
}

export function contenido(page: Page) {
  return page.locator('#contenido');
}
