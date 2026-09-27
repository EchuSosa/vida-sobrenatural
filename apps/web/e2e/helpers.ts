import { type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../../scripts/e2e-fallas-en-consola';

/**
 * Helpers compartidos por los e2e de registro/sesión — extraídos acá para
 * no triplicar el mismo flujo (actualización 2026-09-18, revisión manual
 * H-19/H-15/H-16/H-11).
 *
 * H-100/H-01: `test`/`expect` NO vienen de '@playwright/test' directo —
 * vienen de scripts/e2e-fallas-en-consola.ts (reexportado acá), que hace
 * fallar el test ante un console.error del navegador o una excepción sin
 * atrapar. Cada spec de esta carpeta importa `test`/`expect` de este
 * archivo, no de '@playwright/test'.
 */
export { test, expect };

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
  const builder = new AxeBuilder({ page }).options({ rules });
  for (const { iframe } of EMBEDS_DE_TERCEROS) {
    // [iframe, '*']: excluye cada elemento del documento de ADENTRO del
    // iframe, no el elemento <iframe> — ése es nuestro (su `title`, regla
    // frame-title) y se sigue auditando. NO `[iframe, 'html']`: axe 4.13 lo
    // acepta y no excluye nada (reproducido aislado: las mismas violaciones
    // que sin exclusión); `'*'` y `'body'` sí. Excluir el <iframe> entero
    // también funciona, pero deja de evaluar frame-title.
    //
    // Lo que axe sigue evaluando adentro, porque son reglas de documento que
    // ningún selector de contexto saca: html-lang-valid, landmark-one-main,
    // page-has-heading-one y bypass. Hoy pasan; si YouTube las rompe, el
    // informe lo va a mostrar con target [iframe, …].
    builder.exclude([iframe, '*']);
  }
  return builder;
}

/**
 * H-150: embeds de terceros en los que axe NO desciende — lista declarada,
 * una entrada por embed, con su motivo. No es "excluir todos los iframes":
 * eso dejaría de auditar en silencio un iframe propio el día que exista.
 *
 * Se excluye sólo lo que carga el tercero adentro del iframe. Nuestro markup
 * alrededor del video se sigue auditando: el botón "Ver el video" y la
 * miniatura (antes del clic; axe-todas-las-rutas los recorre así), y el
 * contenedor y el propio <iframe> (después del clic).
 */
const EMBEDS_DE_TERCEROS = [
  {
    iframe: 'iframe[src*="youtube-nocookie.com"]',
    motivo:
      'El reproductor de YouTube (components/video-youtube.tsx) inyecta su propio DOM, con violaciones que no ' +
      'son nuestras ni podemos arreglar (div con aria-label y sin role, aria-prohibited-attr). Auditarlo hacía ' +
      'depender el resultado de cuánto había inyectado YouTube en ese instante: palabra-profetica.spec.ts salía ' +
      'flaky con 48 violaciones (H-149, H-150).',
  },
] as const;

/**
 * H-76 (revisión manual ronda 8): H-21 (el toast) y H-73 (el panel de Sede,
 * apps/backoffice) fueron el mismo falso positivo dos veces — un diálogo,
 * panel o toast que entra con una transición de opacidad, auditado a mitad
 * de esa transición, mide un contraste que nunca se ve en pantalla quieta.
 * Antes cada test agregaba su propia espera puntual (`toHaveCSS('opacity',
 * '1')`) sobre el elemento que sabía que estaba animándose; acá la espera
 * es genérica — `document.getAnimations()` cubre transiciones y animations
 * CSS por igual, sin que el test tenga que saber cuál elemento se está
 * moviendo — así que cubre casos que todavía no se encontraron a mano.
 * Reemplaza a `crearAxeBuilder(page)....analyze()` en todos los usos.
 */
export async function auditar(page: Page, reglasDeshabilitadas: string[] = []) {
  await esperarAnimacionesAsentadas(page);
  return crearAxeBuilder(page, reglasDeshabilitadas).analyze();
}

async function esperarAnimacionesAsentadas(page: Page) {
  // Doble rAF: si la transición se disparó recién ahora (ej. un click que
  // acaba de abrir un diálogo), el navegador todavía no creó el objeto
  // Animation en el primer frame — `getAnimations()` daría una lista vacía
  // y la espera de abajo no esperaría nada.
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animacion) => animacion.finished.catch(() => {}))),
  );
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
