import { type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../../scripts/e2e-fallas-en-consola';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';

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
  // H-R10: en WebKit, Base UI les pone `role="button"` a las guardas de foco
  // invisibles de sus diálogos (utils/FocusGuard.js: así VoiceOver no se
  // escapa del foco atrapado) y axe las marca como botón sin nombre. Son de la
  // librería, invisibles y a propósito: se excluyen, el resto se audita igual.
  builder.exclude('[data-base-ui-focus-guard]');
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
  await completarFecha(campo(page, 'Fecha de nacimiento'), '1990-05-20');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Código de país').selectOption('+54');
  await page.getByLabel('Número de teléfono').fill('92211234567');
  await page.getByLabel('Dirección').fill('Calle 1 y 50');
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Estado civil').selectOption('soltero_a');
  await page.getByLabel('Profesión').selectOption('otro');
  await page.getByLabel('¿Cuál?').fill('Apicultora');
  await page.getByLabel('¿En qué año empezaste a venir a la iglesia?').selectOption('2020');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page).toHaveURL(/\/registro\/listo/);
}

/**
 * Merge de la 004 (hallazgo del lote A): con sesión, `SincronizarTema` (D95,
 * T078) aplica la preferencia GUARDADA de la Persona — `claro` por defecto —
 * y pisa lo que haya en localStorage o en `prefers-color-scheme`. Un spec que
 * "corre en oscuro" con una Persona registrada auditaba, en realidad, el
 * claro dos veces. Esto guarda `oscuro` (como haría desde Perfil), vuelve a
 * iniciar sesión para que la sesión lo traiga. Las páginas públicas no tienen
 * `SincronizarTema` (quedan estáticas, Historia 7) y leen localStorage: por
 * eso también se escribe ahí. Llamarlo después de registrar a la Persona;
 * `esperarTema` antes de auditar.
 */
export async function usarTemaOscuro(page: Page, email: string) {
  await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
  const { apiToken } = await (await page.request.get('/api/auth/session')).json();
  const api = process.env.API_BASE_URL ?? 'http://localhost:3334';
  const respuesta = await page.request.patch(`${api}/personas/me/preferencias`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: { temaPreferido: 'oscuro' },
  });
  expect(respuesta.ok(), await respuesta.text()).toBe(true);
  await loguearseComoTest(page, email);
}

/** La clase `dark` de `<html>` es la que manda: sin ella, axe mide el claro. */
export async function esperarTema(page: Page, tema: 'claro' | 'oscuro') {
  if (tema === 'oscuro') await expect(page.locator('html')).toHaveClass(/dark/);
  else await expect(page.locator('html')).not.toHaveClass(/dark/);
}

/**
 * Lote 0 global (spec 006, research #13; D150): ninguna pantalla de la web app
 * se desplaza de costado en un celular. Fija el ancho y compara el ancho del
 * documento con el de la ventana.
 */
export async function sinScrollHorizontal(page: Page, ancho = 375) {
  const alto = page.viewportSize()?.height ?? 800;
  await page.setViewportSize({ width: ancho, height: alto });
  const { documento, ventana } = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    ventana: window.innerWidth,
  }));
  expect(documento).toBeLessThanOrEqual(ventana);
}

/**
 * Mi camino, propuesta A (2026-10-10): las cards de las etapas se pliegan
 * (las bloqueadas, "Próximamente" y hechas arrancan plegadas). Abre la de
 * `nombre` si está plegada, con el botón de su título, y devuelve la región.
 */
export async function abrirEtapa(page: Page, nombre: string) {
  const region = page.getByRole('region', { name: nombre, exact: true });
  const boton = region.getByRole('heading', { level: 2 }).getByRole('button');
  if ((await boton.getAttribute('aria-expanded')) === 'false') await boton.click();
  await expect(boton).toHaveAttribute('aria-expanded', 'true');
  return region;
}
