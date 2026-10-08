import { mintApiToken } from '@vida-sobrenatural/shared-types/auth-server';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';
import { test, expect, loguearseComoTest, registrarPersonaDeTest } from './helpers';

/**
 * H-85 (reabre H-64): el único botón de ingreso de toda la web
 * (`signIn('google', { callbackUrl: '/ingresar' })`, dentro del formulario
 * de registro) volvía a `/registro` — cualquiera que ingresara, activa o
 * no, caía ahí. `/ingresar` resuelve el destino en el servidor según el
 * estado real de la Persona, antes de tocar `/registro` para nada que no
 * sea el caso que sí corresponde ahí (sin Persona todavía).
 *
 * Los tres estados posibles de `session.user.estado` — no hay un cuarto:
 * ver `packages/shared-types/src/auth-server.ts` (`'activa' |
 * 'pendiente_tutor' | null`). Este archivo prueba los tres ANTES que nada
 * más dependa de `/ingresar` — es la única red dado que no hay forma de
 * probarlo a mano.
 */

// H-78: mintApiToken() (misma pieza que usa auth.ts) necesita
// NEXTAUTH_SECRET — el de la base de e2e (apps/api/.env.e2e), no el de
// desarrollo. El runner de Playwright es un proceso Node aparte de las
// apps que arrancan los `webServer` de playwright.config.ts, así que no
// lo hereda de ahí — se lee de la misma pieza compartida que ya lo hace
// para armar esos `webServer` (Principio XI, nada de parsear un .env
// distinto acá).
function nextauthSecret(): string {
  const { NEXTAUTH_SECRET } = leerEnvE2e();
  if (!NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET no encontrado en apps/api/.env.e2e');
  process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;
  return NEXTAUTH_SECRET;
}

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3334';

/**
 * Crea una Persona pendiente_tutor directo contra la API (mismo shape que
 * el formulario de registro manda para un menor) — evita depender de un
 * segundo login en el mismo contexto del navegador para refrescar la
 * sesión (structuralmente distinto del caso "activa": ver
 * formulario-registro.tsx, el envío de un menor no llama a `update()`
 * porque no hay sesión propia que refrescar todavía en ese momento).
 */
async function crearPersonaPendienteTutor(email: string): Promise<void> {
  nextauthSecret();
  const token = await mintApiToken({ email, personaId: null, estado: null, rol: [] });

  const sedesRes = await fetch(`${API_BASE_URL}/sedes`);
  const sedes = (await sedesRes.json()) as { id: string }[];
  const sedeId = sedes[0]?.id;
  if (!sedeId) throw new Error('No hay ninguna Sede activa para crear la Persona de prueba.');

  const respuesta = await fetch(`${API_BASE_URL}/personas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      apellido: 'García',
      nombre: 'Sol',
      genero: 'femenino',
      fechaNacimiento: '2015-01-01',
      telefono: '+54 92211234567',
      direccion: 'Calle 1 y 50',
      sedeId,
      estadoCivil: 'soltero_a',
      profesion: 'otro',
      profesionDetalle: 'Estudiante',
      congregaDesde: 2020,
      consentimientoDatos: false,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`POST /personas respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
  const cuerpo = (await respuesta.json()) as { estado: string };
  if (cuerpo.estado !== 'pendiente_tutor') {
    throw new Error(`Se esperaba estado pendiente_tutor, la API devolvió: ${cuerpo.estado}`);
  }
}

test('activa: el ingreso cae en /inicio, no en /registro', async ({ page }) => {
  const email = `e2e-ingresar-activa-${Date.now()}@example.com`;
  await registrarPersonaDeTest(page, email);

  await page.goto('/ingresar');
  await expect(page).toHaveURL(/\/inicio$/);
  // El síntoma original de H-85: nunca debería pasar por /registro/el aviso.
  await expect(page.getByText('Ya estás registrada', { exact: false })).toHaveCount(0);
});

/**
 * pendiente_tutor es distinto de los otros dos casos: el callback `signIn`
 * de auth.ts la intercepta ANTES de que exista sesión (mismo mecanismo que
 * FR-017 usa para email-no-verificado, ver email-no-verificado.spec.ts —
 * "no deja sesión activa" es el comportamiento correcto, no un accidente:
 * FR-008 dice explícitamente que una Persona pendiente_tutor "no debe
 * poder iniciar sesión"). Por eso `/ingresar` nunca llega a leer
 * `estado === 'pendiente_tutor'` de una sesión real por este camino — su
 * rama para ese estado es una red para un caso distinto (una sesión que
 * ERA activa y pasa a pendiente_tutor después, vía `update()`), no el
 * camino principal. Lo que sí hay que probar acá es la garantía real:
 * intentar ingresar con `pendiente_tutor` termina en /pendiente-tutor,
 * sin sesión — verificado igual que FR-017, por la URL final del propio
 * POST de login (no por session.user.estado, que nunca llega a setearse).
 */
test('pendiente_tutor: el ingreso termina en /pendiente-tutor, sin sesión (FR-008)', async ({ page }) => {
  const email = `e2e-ingresar-pendiente-tutor-${Date.now()}@example.com`;
  await crearPersonaPendienteTutor(email);

  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json();
  const loginResp = await page.request.post('/api/auth/callback/test-login', {
    form: { email, csrfToken, callbackUrl: '/ingresar' },
  });
  expect(loginResp.url()).toContain('/pendiente-tutor');

  const sesion = await (await page.request.get('/api/auth/session')).json();
  expect(sesion).toBeNull();
});

test('sin Persona todavía: el ingreso cae en /registro, para completarlo', async ({ page }) => {
  const email = `e2e-ingresar-sin-registro-${Date.now()}@example.com`;
  await loguearseComoTest(page, email);

  await page.goto('/ingresar');
  await expect(page).toHaveURL(/\/registro$/);
  // Este es el único de los tres casos que sí tiene que llegar al
  // formulario — verificado por su contenido, no solo por la URL.
  await expect(page.getByLabel('Apellido')).toBeVisible();
});
