import type { Locator, Page } from '@playwright/test';

/**
 * Casos infelices (Echu, 2026-11-01; regla de `CLAUDE.md`: cada historia lleva al menos un e2e
 * del caso de error). `page.route` solo intercepta pedidos del NAVEGADOR: sirve para las acciones
 * de un componente cliente, no para las cargas de un Server Component.
 */

/** Lo que muestra cualquier pantalla con un 500 que trae `code: ERROR_INTERNO` (es.json `errors.ERROR_INTERNO`). */
export const TEXTO_ERROR_INTERNO = 'Ocurrió un error inesperado. Podés reintentar en unos segundos.';

/** El patrón de consola que deja un 500 simulado (para `permitirErrorDeConsola`). */
export const CONSOLA_500 = /the server responded with a status of 500/;
export const CONSOLA_400 = /the server responded with a status of 400/;

const problema = (status: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ type: 'about:blank', title: 'Error', status, code: 'ERROR_INTERNO', detail: 'x', requestId: 'req-e2e-infeliz', ...extra });

/**
 * La API responde 500 a `metodo` sobre las URLs que matchean `patron` (el resto, incluido el
 * preflight OPTIONS, pasa). Devuelve cuántas veces se intentó.
 */
export async function apiCaida(page: Page, metodo: string, patron: RegExp): Promise<{ intentos: number }> {
  const contador = { intentos: 0 };
  await page.route(patron, (ruta) => {
    if (ruta.request().method() !== metodo) return ruta.continue();
    contador.intentos++;
    return ruta.fulfill({ status: 500, contentType: 'application/problem+json', body: problema(500) });
  });
  return contador;
}

/** La API rechaza con 400 y errores por campo (`errors: [{campo, code}]`), como hace la validación real. */
export async function apiRechazaCampos(page: Page, metodo: string, patron: RegExp, errors: Array<{ campo: string; code: string }>) {
  await page.route(patron, (ruta) =>
    ruta.request().method() === metodo
      ? ruta.fulfill({ status: 400, contentType: 'application/problem+json', body: problema(400, { code: 'VALIDACION', errors }) })
      : ruta.continue(),
  );
}

/** Cuenta los pedidos `metodo` a URLs que matchean `patron` (desde ya). */
export function contarPedidos(page: Page, metodo: string, patron: RegExp): { n: number } {
  const contador = { n: 0 };
  page.on('request', (r) => {
    if (r.method() === metodo && patron.test(r.url())) contador.n++;
  });
  return contador;
}

/**
 * Tres clics sincrónicos en el mismo botón, sin el chequeo de Playwright entre uno y otro: la
 * carrera real que tiene que frenar `useEnvio` (molde: `envio-unico.spec.ts`).
 */
export async function tresClics(boton: Locator): Promise<void> {
  await boton.evaluate((el: HTMLElement) => {
    el.click();
    el.click();
    el.click();
  });
}
