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
 * specs/004 (T009): los Discipuladores de la 004. `1` femenino con agenda
 * (martes y sábado), `2` masculino con agenda (martes), `'sin-agenda'` sin
 * franjas ni disponibilidad (para el estado vacío de FR-047). Los siembra
 * sembrar-e2e-admin.ts.
 */
export async function loguearseComoDiscipuladorE2E(page: Page, cual: 1 | 2 | 'sin-agenda' = 1) {
  const email =
    cual === 1
      ? 'e2e-discipulador@example.com'
      : cual === 2
        ? 'e2e-discipulador-2@example.com'
        : 'e2e-discipulador-sin-agenda@example.com';
  await loguearseComoE2E(page, email);
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
  // H-R10: en WebKit, Base UI les pone `role="button"` a las guardas de foco
  // invisibles de sus diálogos (utils/FocusGuard.js: así VoiceOver no se
  // escapa del foco atrapado) y axe las marca como botón sin nombre. Son de la
  // librería, invisibles y a propósito: se excluyen, el resto se audita igual.
  return new AxeBuilder({ page }).options({ rules }).exclude('[data-base-ui-focus-guard]');
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
 * como `afuera: <elemento>`; un control del panel que no estaba al contar,
 * como `adentro, no contado: <elemento>`. Por eso el panel tiene que estar
 * quieto antes de recorrerlo: si agrega controles al perder el foco un campo,
 * el test tiene que dejarlo en un estado que no los agregue.
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
      // Un control que apareció después de contar (p. ej. el resumen de
      // errores) está adentro pero no en la lista: no es una fuga.
      const donde = el?.closest('[role="dialog"]') ? 'adentro, no contado' : 'afuera';
      return `${donde}: ${el?.tagName.toLowerCase()} "${(el?.getAttribute('aria-label') || el?.textContent || '').trim().slice(0, 30)}"`;
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
        congregaDesde: 2020,
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
        congregaDesde: 2020,
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

// ─── specs/004: datos del discipulado armados por la API (T009) ────────────
//
// Reemplazan a discipulado-datos.ts (lote B) y discipulado-en-la-base.cjs
// (lote D), que escribían directo en la base porque los endpoints de proponer
// y aceptar estaban en otro lote. Por la API, los datos pasan por las mismas
// reglas que en la app (FR-006, FR-045, el orden de bloqueo): un e2e no puede
// armar un estado que la app no permitiría.

export const MARTES_19_A_21 = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };
export const EMAIL_DISCIPULADOR_1 = 'e2e-discipulador@example.com';
export const EMAIL_DISCIPULADOR_2 = 'e2e-discipulador-2@example.com';
export const EMAIL_ADMIN = 'e2e-admin@example.com';

type Franja = { diaSemana: number; inicio: number; fin: number };

/**
 * El token de API de una Persona, por el test-login de `apps/web` (el mismo
 * camino que `crearPersonaActiva`). Una sesión nueva cada vez: el token se
 * resuelve al entrar, así que una Persona recién registrada o con un rol
 * recién otorgado necesita entrar de nuevo para que su token lo traiga.
 */
async function sesionDe(email: string): Promise<{ apiToken: string; personaId: string | null }> {
  const ctx = await playwrightRequest.newContext({ baseURL: WEB_BASE_URL });
  try {
    const { csrfToken } = await (await ctx.get('/api/auth/csrf')).json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });
    const session = await (await ctx.get('/api/auth/session')).json();
    return { apiToken: session.apiToken, personaId: session.user?.personaId ?? null };
  } finally {
    await ctx.dispose();
  }
}

/** Una llamada a la API como `email`. Falla ruidoso si la API no responde 2xx. */
async function apiComo<T>(email: string, metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', ruta: string, datos?: unknown): Promise<T> {
  const { apiToken } = await sesionDe(email);
  const ctx = await playwrightRequest.newContext();
  try {
    const respuesta = await ctx.fetch(`${API_BASE_URL}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      data: datos,
    });
    if (!respuesta.ok()) {
      throw new Error(`${metodo} ${ruta} como ${email} respondió ${respuesta.status()}: ${await respuesta.text()}`);
    }
    const texto = await respuesta.text();
    return (texto ? JSON.parse(texto) : undefined) as T;
  } finally {
    await ctx.dispose();
  }
}

async function idDe(email: string): Promise<string> {
  const { personaId } = await sesionDe(email);
  if (!personaId) throw new Error(`helpers: ${email} no es una Persona registrada`);
  return personaId;
}

export interface OpcionesPersona {
  nombre: string;
  apellido: string;
  genero?: 'femenino' | 'masculino';
  telefono?: string;
  direccion?: string;
}

export interface PersonaDeTest {
  id: string;
  email: string;
}

/** Una Persona adulta activa, registrada por el flujo real (`POST /personas`), con email `e2e-…` (la borra limpiar-e2e). */
export async function crearPersona(email: string, o: OpcionesPersona): Promise<PersonaDeTest> {
  const ctx = await playwrightRequest.newContext();
  const sedes = await (await ctx.get(`${API_BASE_URL}/sedes`)).json();
  await ctx.dispose();
  await apiComo(email, 'POST', '/personas', {
    nombre: o.nombre,
    apellido: o.apellido,
    genero: o.genero ?? 'femenino',
    fechaNacimiento: '1990-05-20',
    telefono: o.telefono ?? '+54 9 221 555 0101',
    direccion: o.direccion ?? 'Calle 7 número 1234',
    sedeId: sedes[0].id,
    estadoCivil: 'soltero_a',
    profesion: 'estudiante',
    congregaDesde: 2020,
    consentimientoDatos: true,
  });
  return { id: await idDe(email), email };
}

/**
 * Que el Discipulador aparezca en el cruce (FR-006): disponibilidad prendida,
 * al menos una franja (la del martes) y ningún período de no disponibilidad.
 * Idempotente: no toca lo que ya está bien.
 */
export async function asegurarDisponible(emailDiscipulador: string): Promise<void> {
  const actual = await apiComo<{ disponible: boolean; franjas: unknown[]; bloqueos: Array<{ id: string }> }>(emailDiscipulador, 'GET', '/disponibilidad/me');
  if (actual.franjas.length === 0) await apiComo(emailDiscipulador, 'POST', '/disponibilidad/me/franjas', MARTES_19_A_21);
  for (const b of actual.bloqueos) await apiComo(emailDiscipulador, 'DELETE', `/disponibilidad/me/bloqueos/${b.id}`);
  if (!actual.disponible) await apiComo(emailDiscipulador, 'PUT', '/disponibilidad/me', { disponible: true });
}

/** Cuántas Personas acepta por Grupo el Discipulador (FR-045), por la pantalla de su disponibilidad. */
export async function fijarMaximoPorGrupo(emailDiscipulador: string, maximo: number): Promise<void> {
  await apiComo(emailDiscipulador, 'PUT', '/disponibilidad/me', { maxPersonasPorGrupo: maximo });
}

/** La Persona pide Vida Nueva sola, desde Mi camino (FR-001). Devuelve el id de la Solicitud. */
export async function pedirVidaNuevaComo(email: string, franjas: Franja[] = [MARTES_19_A_21]): Promise<string> {
  const { id } = await apiComo<{ id: string }>(email, 'POST', '/discipulado/solicitudes/me', { franjas });
  return id;
}

/** El Admin propone la Solicitud a un Discipulador (FR-036); opcionalmente, para sumarla a un Grupo en curso (FR-045). */
export async function proponer(solicitudId: string, emailDiscipulador: string, grupoDestinoId?: string): Promise<string> {
  await asegurarDisponible(emailDiscipulador);
  const discipuladorId = await idDe(emailDiscipulador);
  const { propuestaId } = await apiComo<{ propuestaId: string }>(EMAIL_ADMIN, 'POST', `/discipulado/solicitudes/${solicitudId}/proponer`, {
    discipuladorId,
    ...(grupoDestinoId ? { grupoDestinoId } : {}),
  });
  return propuestaId;
}

/** Proponer y que el Discipulador acepte (FR-037): recién ahí existen Grupo, Inscripción y Liderazgo. */
export async function proponerYAceptar(
  solicitudId: string,
  emailDiscipulador: string = EMAIL_DISCIPULADOR_1,
  grupoDestinoId?: string,
): Promise<{ propuestaId: string; grupoId: string }> {
  const propuestaId = await proponer(solicitudId, emailDiscipulador, grupoDestinoId);
  const { grupoId } = await apiComo<{ grupoId: string }>(emailDiscipulador, 'POST', `/discipulado/propuestas/${propuestaId}/aceptar`);
  return { propuestaId, grupoId };
}

/** Lo que deja proponer: Solicitud `propuesta` + Propuesta `nueva` pendiente. */
export async function crearPropuesta(persona: PersonaDeTest, emailDiscipulador: string = EMAIL_DISCIPULADOR_1) {
  const solicitudId = await pedirVidaNuevaComo(persona.email);
  const propuestaId = await proponer(solicitudId, emailDiscipulador);
  return { solicitudId, propuestaId };
}

/**
 * Un Grupo en curso de este Discipulador con estas Personas: la primera abre el
 * Grupo y las demás se suman a él (FR-045 — el Discipulador tiene que aceptar
 * esa cantidad, ver `fijarMaximoPorGrupo`). Las Inscripciones, en el orden de
 * `personas`.
 */
export async function crearGrupo(personas: PersonaDeTest[], emailDiscipulador: string = EMAIL_DISCIPULADOR_1) {
  let grupoId: string | undefined;
  for (const persona of personas) {
    const solicitudId = await pedirVidaNuevaComo(persona.email);
    ({ grupoId } = await proponerYAceptar(solicitudId, emailDiscipulador, grupoId));
  }
  const detalle = await detalleDeGrupo(grupoId!);
  const inscripciones = personas.map((p) => detalle.personas.find((x) => x.id === p.id)!.inscripcionId);
  return { grupoId: grupoId!, inscripciones };
}

/** Un Encuentro registrado por el Discipulador que lidera el Grupo, con todos presentes (FR-013a). */
export async function crearEncuentro(
  grupoId: string,
  datos: { fecha: string; capitulos: string; notas?: string },
  emailDiscipulador: string = EMAIL_DISCIPULADOR_1,
): Promise<string> {
  const { id } = await apiComo<{ id: string }>(emailDiscipulador, 'POST', `/discipulado/mis-discipulados/${grupoId}/encuentros`, datos);
  return id;
}

interface DetalleGrupoTest {
  estado: string;
  motivoCierre: string | null;
  personas: Array<{ id: string; inscripcionId: string; estadoInscripcion: string }>;
}

async function detalleDeGrupo(grupoId: string): Promise<DetalleGrupoTest> {
  return apiComo<DetalleGrupoTest>(EMAIL_ADMIN, 'GET', `/grupos/discipulados/${grupoId}`);
}

export async function estadoDeSolicitud(solicitudId: string): Promise<string> {
  return (await apiComo<{ estado: string }>(EMAIL_ADMIN, 'GET', `/discipulado/solicitudes/${solicitudId}`)).estado;
}

export async function estadoDeGrupo(grupoId: string): Promise<{ estado: string; motivoCierre: string | null }> {
  const { estado, motivoCierre } = await detalleDeGrupo(grupoId);
  return { estado, motivoCierre };
}

export async function estadoDeInscripcion(grupoId: string, inscripcionId: string): Promise<string> {
  return (await detalleDeGrupo(grupoId)).personas.find((p) => p.inscripcionId === inscripcionId)!.estadoInscripcion;
}

/**
 * T058 (FR-043, lote D): una Persona con un discipulado activo (Grupo con
 * `inscripta`) y una propuesta pendiente (la Solicitud de `pide`). Le otorga el
 * rol `discipulador` por el panel de roles (API del 005) y la deja disponible.
 */
export async function armarDiscipuladoYPropuesta(emails: { discipuladora: string; inscripta: string; pide: string }) {
  const discipuladoraId = await idDe(emails.discipuladora);
  await apiComo(EMAIL_ADMIN, 'POST', `/personas/${discipuladoraId}/roles`, { rol: 'discipulador' });
  const { grupoId } = await proponerYAceptar(await pedirVidaNuevaComo(emails.inscripta), emails.discipuladora);
  const solicitudId = await pedirVidaNuevaComo(emails.pide);
  await proponer(solicitudId, emails.discipuladora);
  return { grupoId, solicitudId };
}

/** Sin scroll horizontal (docs/15, H-62): el documento no es más ancho que la ventana. */
export async function sinScrollHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

/**
 * Cambiar de Persona a mitad de un test: sin borrar las cookies, el
 * test-login a veces deja la sesión anterior (se vio en la suite completa).
 */
export async function sinSesion(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * T030 (FR-007, caso 1): deja el cruce de una Solicitud sin ningún
 * Discipulador disponible, apagando la disponibilidad de cada uno con su
 * propia sesión (solo el Discipulador cambia la suya, FR-015). Devuelve la
 * función que los vuelve a prender: llamala al terminar, así los specs que
 * siguen encuentran la base como estaba.
 */
export async function dejarSinDisponibles(solicitudId: string): Promise<() => Promise<void>> {
  const cruce = await apiComo<{ franjas: Array<{ coinciden: Array<{ id: string }> }>; noCoinciden: Array<{ id: string }> }>(
    EMAIL_ADMIN,
    'GET',
    `/discipulado/solicitudes/${solicitudId}/cruce`,
  );
  const ids = new Set([...cruce.franjas.flatMap((f) => f.coinciden.map((d) => d.id)), ...cruce.noCoinciden.map((d) => d.id)]);
  const emails: string[] = [];
  for (let skip = 0; ids.size > emails.length; skip += 100) {
    const pagina = await apiComo<{ items: Array<{ id: string; email: string }> }>(EMAIL_ADMIN, 'GET', `/personas?skip=${skip}&take=100`);
    if (pagina.items.length === 0) break;
    for (const p of pagina.items) if (ids.has(p.id)) emails.push(p.email);
  }
  for (const email of emails) await apiComo(email, 'PUT', '/disponibilidad/me', { disponible: false });
  return async () => {
    for (const email of emails) await apiComo(email, 'PUT', '/disponibilidad/me', { disponible: true });
  };
}

/** El id de una Persona registrada, por su sesión. */
export async function idDePersona(email: string): Promise<string> {
  return idDe(email);
}

/** Los ids de todos los Discipuladores disponibles del cruce de una Solicitud (coincidan o no, D25). */
export async function idsEnElCruce(solicitudId: string): Promise<string[]> {
  const cruce = await apiComo<{ franjas: Array<{ coinciden: Array<{ id: string }> }>; noCoinciden: Array<{ id: string }> }>(
    EMAIL_ADMIN,
    'GET',
    `/discipulado/solicitudes/${solicitudId}/cruce`,
  );
  return [...new Set([...cruce.franjas.flatMap((f) => f.coinciden.map((d) => d.id)), ...cruce.noCoinciden.map((d) => d.id)])];
}

/** Lo que ve la Persona en Mi camino (`GET /discipulado/me`, FR-026 a FR-028). */
export async function estadoMiCamino(email: string): Promise<{ estado: string }> {
  return apiComo<{ estado: string }>(email, 'GET', '/discipulado/me');
}

/** Entrar como cualquier Persona por su email (test-login), no solo las sembradas. */
export async function loguearseComo(page: Page, email: string) {
  await loguearseComoE2E(page, email);
}

/**
 * specs/004, T061: un Discipulador nuevo, sin agenda y con la disponibilidad
 * apagada — para un flujo que la carga desde la pantalla sin tocar a los
 * sembrados (otros specs dependen de su agenda). El Admin le da el rol por la
 * API, como desde Personas (specs/005).
 */
export async function crearDiscipulador(email: string, o: OpcionesPersona): Promise<PersonaDeTest> {
  const persona = await crearPersona(email, o);
  await apiComo(EMAIL_ADMIN, 'POST', `/personas/${persona.id}/roles`, { rol: 'discipulador' });
  return persona;
}

/** Que el Discipulador deje de aparecer en el cruce de los demás specs (toggle apagado). */
export async function apagarDisponibilidad(emailDiscipulador: string): Promise<void> {
  await apiComo(emailDiscipulador, 'PUT', '/disponibilidad/me', { disponible: false });
}
