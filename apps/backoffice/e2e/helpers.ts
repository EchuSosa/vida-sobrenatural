import { request as playwrightRequest, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../../scripts/e2e-fallas-en-consola';

/**
 * Helpers compartidos por los e2e de H-29/H-30 (H-34, revisión manual ronda 3).
 *
 * H-100/H-01: `test`/`expect` NO vienen de '@playwright/test' directo —
 * vienen de scripts/e2e-fallas-en-consola.ts (reexportado acá), que hace
 * fallar el test ante un console.error del navegador o una excepción sin
 * atrapar. Cada spec de esta carpeta importa `test`/`expect` de este
 * archivo, no de '@playwright/test'.
 */
export { test, expect };

const WEB_BASE_URL = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/**
 * Login vía test-login como e2e-admin (globalSetup la siembra): `admin` a
 * secas (T073/H-138) — lo que un test prueba con esta sesión, lo prueba del
 * rol Admin, no de una suma de roles.
 */
export async function loguearseComoAdminE2E(page: Page) {
  await loguearseComoE2E(page, 'e2e-admin@example.com');
}

/**
 * specs/003-contenido-institucional (Historias 3/4, D64): Pastor lee, no
 * edita — Persona sembrada por apps/api/scripts/sembrar-e2e-admin.ts junto
 * con la de Admin.
 */
export async function loguearseComoPastorE2E(page: Page) {
  await loguearseComoE2E(page, 'e2e-pastor@example.com');
}

/**
 * La Persona con `discipulador` a secas. El nombre viene de cuando se usaba
 * como "un rol que no es ni Admin ni Pastor" (FR-030) — sigue sirviendo para
 * eso, y es además el Discipulador de e2e (T073).
 */
export async function loguearseComoOtroRolE2E(page: Page) {
  await loguearseComoE2E(page, 'e2e-otro-rol@example.com');
}

/** T073: la Persona con `lider_curso` a secas. */
export async function loguearseComoLiderCursoE2E(page: Page) {
  await loguearseComoE2E(page, 'e2e-lider-curso@example.com');
}

/**
 * H-134: una sesión con `rol = []` — una cuenta que no existe como Persona
 * (el test-login, igual que Google, deja pasar cualquier email verificado y
 * `buscarPersonaPorEmail` devuelve null). Email único por llamada, así nunca
 * choca con una Persona sembrada.
 */
export async function loguearseSinPersonaE2E(page: Page) {
  await loguearseComoE2E(page, `e2e-sin-persona-${Date.now()}@example.com`);
}

async function loguearseComoE2E(page: Page, email: string) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken },
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
  return new AxeBuilder({ page }).options({ rules });
}

/**
 * H-76 (revisión manual ronda 8): H-21 (el toast, apps/web) y H-73 (el
 * panel de Sede, acá) fueron el mismo falso positivo dos veces — un
 * diálogo, panel o toast que entra con una transición de opacidad,
 * auditado a mitad de esa transición, mide un contraste que nunca se ve en
 * pantalla quieta. Antes cada test agregaba su propia espera puntual
 * (`toHaveCSS('opacity', '1')`) sobre el elemento que sabía que estaba
 * animándose; acá la espera es genérica — `document.getAnimations()` cubre
 * transiciones y animations CSS por igual, sin que el test tenga que saber
 * cuál elemento se está moviendo — así que cubre casos que todavía no se
 * encontraron a mano. Reemplaza a `crearAxeBuilder(page)....analyze()` en
 * todos los usos.
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

async function obtenerApiTokenAdmin(page: Page): Promise<string> {
  const sessionResponse = await page.request.get('/api/auth/session');
  const session = await sessionResponse.json();
  return session.apiToken;
}

/**
 * T029 (H-131, corrección en e336a48): recorre un panel modal con el teclado
 * y devuelve QUÉ control recibió el foco en cada tecla, para afirmar la
 * secuencia — no "el foco está adentro".
 *
 * Por qué así: la trampa de Base UI mueve el foco desde su guarda en el
 * próximo frame (`requestAnimationFrame`), y Playwright aprieta más rápido
 * que eso. El `expect.poll` de abajo espera SÓLO a que el foco deje la
 * guarda — es sincronización, no aserción: no mira si el foco quedó adentro
 * ni dónde. Lo que se afirma después es la secuencia completa, que el poll
 * no garantiza: con una trampa rota el foco se asienta afuera, el poll pasa
 * igual y la secuencia no coincide.
 *
 * La lista esperada sale del DOM del panel (controles tabulables, en orden
 * de documento), no de la mecánica del foco. Afuera del panel se registra
 * como `afuera: <elemento>`.
 */
export async function recorrerFocoDelPanel(page: Page, panel: Locator, tecla: 'Tab' | 'Shift+Tab', vueltas = 2) {
  const controles = await panel.evaluate((dialogo) => {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const tabulables = [...dialogo.querySelectorAll<HTMLElement>(selector)].filter(
      (el) => el.tabIndex >= 0 && el.getClientRects().length > 0,
    );
    tabulables.forEach((el, i) => el.setAttribute('data-foco-e2e', String(i)));
    return tabulables.map((el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim());
  });

  const dondeEstaElFoco = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      const indice = el?.getAttribute('data-foco-e2e');
      if (indice != null) return Number(indice);
      return `afuera: ${el?.tagName.toLowerCase()} "${(el?.getAttribute('aria-label') || el?.textContent || '').trim().slice(0, 30)}"`;
    });
  const enUnaGuarda = () => page.evaluate(() => !!document.activeElement?.hasAttribute('data-base-ui-focus-guard'));

  // Una tecla más que las vueltas completas: termina un paso después de
  // donde empezó, así que el cierre del ciclo también queda afirmado.
  const teclas = vueltas * controles.length + 1;
  const inicial = await dondeEstaElFoco();
  const secuencia: Array<number | string> = [];
  for (let i = 0; i < teclas; i++) {
    await page.keyboard.press(tecla);
    await expect.poll(enUnaGuarda, { message: 'el foco quedó en la guarda de Base UI' }).toBe(false);
    secuencia.push(await dondeEstaElFoco());
  }
  return { controles, inicial, secuencia };
}

/** La secuencia que tiene que dar recorrerFocoDelPanel: los controles del panel ciclando desde `inicial`. */
export function secuenciaCiclica(inicial: number, cantidad: number, tecla: 'Tab' | 'Shift+Tab', teclas: number) {
  const paso = tecla === 'Tab' ? 1 : -1;
  return Array.from({ length: teclas }, (_, i) => (((inicial + paso * (i + 1)) % cantidad) + cantidad) % cantidad);
}

/**
 * Afirma que el foco cicla por los controles del panel, en orden con Tab y
 * en orden inverso con Shift+Tab, dando más de una vuelta.
 */
export async function verificarQueElFocoCiclaEnElPanel(page: Page, panel: Locator) {
  for (const tecla of ['Tab', 'Shift+Tab'] as const) {
    const { controles, inicial, secuencia } = await recorrerFocoDelPanel(page, panel, tecla);
    expect(controles.length, `el panel tiene que tener al menos dos controles para que ciclar signifique algo: ${controles.join(' | ')}`).toBeGreaterThanOrEqual(2);
    expect(typeof inicial, `al empezar el foco no estaba en un control del panel: ${inicial}`).toBe('number');
    expect(secuencia, `${tecla} — controles del panel: ${controles.map((c, i) => `${i}=${c}`).join(' | ')}`).toEqual(
      secuenciaCiclica(inicial as number, controles.length, tecla, secuencia.length),
    );
  }
}

/**
 * H-40 (revisión manual, revisión de código): el e2e de "única Sede activa"
 * se salteaba según cuántas Sedes tuviera la base — un test que se saltea
 * según datos de ambiente no existe. Deja exactamente una Sede activa
 * (desactivando las demás por API, sin pasar por el formulario) y devuelve
 * los ids que había que reactivar, para restaurar el estado real al
 * terminar — este es un ambiente compartido con pruebas manuales, no una
 * base descartable.
 */
export async function asegurarUnaSolaSedeActiva(page: Page): Promise<string[]> {
  const apiToken = await obtenerApiTokenAdmin(page);
  const sedes: { id: string }[] = await (await page.request.get(`${API_BASE_URL}/sedes`)).json();
  const [, ...resto] = sedes;

  for (const sede of resto) {
    await page.request.patch(`${API_BASE_URL}/sedes/${sede.id}`, {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { activo: false },
    });
  }
  return resto.map((sede) => sede.id);
}

/** Revierte asegurarUnaSolaSedeActiva — reactiva las Sedes que se desactivaron para el test. */
export async function reactivarSedes(page: Page, ids: string[]) {
  if (ids.length === 0) return;
  const apiToken = await obtenerApiTokenAdmin(page);
  for (const id of ids) {
    await page.request.patch(`${API_BASE_URL}/sedes/${id}`, {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: { activo: true },
    });
  }
}

/**
 * Crea, vía `apps/web` (que sí tiene el flujo de registro completo), un
 * menor real en estado `pendiente_tutor` — insumo de los e2e de H-29. Usa un
 * `APIRequestContext` propio, apuntado a `apps/web`, independiente de la
 * `page` del test (que navega `apps/backoffice`).
 */
export async function crearMenorPendienteTutor(email: string, nombre = 'E2E', apellido = 'Menor') {
  const ctx = await playwrightRequest.newContext({ baseURL: WEB_BASE_URL });
  try {
    const csrfResponse = await ctx.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });

    const sessionResponse = await ctx.get('/api/auth/session');
    const session = await sessionResponse.json();

    const sedes = await (await ctx.get(`${API_BASE_URL}/sedes`)).json();
    const sedeId = sedes[0]?.id;
    if (!sedeId) throw new Error('crearMenorPendienteTutor: no hay ninguna Sede — corré db:seed primero.');

    const response = await ctx.post(`${API_BASE_URL}/personas`, {
      headers: { Authorization: `Bearer ${session.apiToken}`, 'Content-Type': 'application/json' },
      data: {
        apellido,
        nombre,
        genero: 'femenino',
        fechaNacimiento: '2012-01-01',
        telefono: '+54 9 221 9000001',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        tiempoCongregacion: 'menos_6_meses',
        consentimientoDatos: false,
      },
    });
    if (!response.ok()) {
      throw new Error(`crearMenorPendienteTutor: POST /personas respondió ${response.status()}: ${await response.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/**
 * Crea, vía `apps/web`, una Persona activa real — usada como "tutor ya
 * registrado" en el camino de vínculo del e2e de H-29.
 */
export async function crearPersonaActiva(email: string, apellido: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: WEB_BASE_URL });
  try {
    const csrfResponse = await ctx.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });

    const sessionResponse = await ctx.get('/api/auth/session');
    const session = await sessionResponse.json();

    const sedes = await (await ctx.get(`${API_BASE_URL}/sedes`)).json();
    const sedeId = sedes[0]?.id;
    if (!sedeId) throw new Error('crearPersonaActiva: no hay ninguna Sede — corré db:seed primero.');

    const response = await ctx.post(`${API_BASE_URL}/personas`, {
      headers: { Authorization: `Bearer ${session.apiToken}`, 'Content-Type': 'application/json' },
      data: {
        apellido,
        nombre: 'E2E',
        genero: 'femenino',
        fechaNacimiento: '1990-01-01',
        telefono: '+54 9 221 9000002',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        tiempoCongregacion: 'menos_6_meses',
        consentimientoDatos: true,
      },
    });
    if (!response.ok()) {
      throw new Error(`crearPersonaActiva: POST /personas respondió ${response.status()}: ${await response.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}
