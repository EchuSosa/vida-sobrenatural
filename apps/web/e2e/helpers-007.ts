import { type Page } from '@playwright/test';
import { mintApiToken } from '@vida-sobrenatural/shared-types/auth-server';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';
import { expect } from './helpers';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';
import { leerCodigoDeMailpit, mensajesPara, usarOrigenPropio } from '../../../scripts/e2e-mailpit';

/**
 * spec 007: piezas de los e2e del ingreso con código (§2.10 del mapa: helpers
 * propios en su archivo). El ingreso se hace por la pantalla real —
 * `/ingresar` → Mailpit → `/ingresar/codigo` —, no por `test-login`.
 */
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3334';

/** Paso email: escribe el email y pide el código; queda en `/ingresar/codigo`. */
export async function pedirCodigo(page: Page, email: string) {
  await usarOrigenPropio(page);
  await page.goto('/ingresar');
  await page.getByLabel('Tu email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  // Más margen que el de por defecto: el primer pedido de la corrida compila la acción en `next dev`.
  await expect(page).toHaveURL(/\/ingresar\/codigo$/, { timeout: 20_000 });
}

export async function escribirCodigo(page: Page, codigo: string) {
  await page.getByLabel('Código', { exact: true }).fill(codigo);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

/** Todo el ingreso con código; `emailEscrito` es lo que se tipea, `emailMailpit` a dónde llega. */
export async function entrarConCodigo(page: Page, emailEscrito: string, emailMailpit = emailEscrito.trim().toLowerCase()) {
  const antes = (await mensajesPara(emailMailpit)).length;
  await pedirCodigo(page, emailEscrito);
  const codigo = await leerCodigoDeMailpit(emailMailpit, antes + 1);
  await escribirCodigo(page, codigo);
}

export async function personaIdDeSesion(page: Page): Promise<string | null> {
  const sesion = (await (await page.request.get('/api/auth/session')).json()) as { user?: { personaId?: string | null } } | null;
  return sesion?.user?.personaId ?? null;
}

/** Los pasos 1 a 4 del registro, con la sesión ya iniciada (el email lo pone la sesión). */
export async function completarRegistro(page: Page, fechaNacimiento = '1958-05-20') {
  await page.getByLabel('Apellido').fill('Gómez');
  await page.getByLabel('Nombre').fill('Rosa');
  await page.getByLabel('Género').selectOption('femenino');
  await completarFecha(campo(page, 'Fecha de nacimiento'), fechaNacimiento);
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Código de país').selectOption('+54');
  await page.getByLabel('Número de teléfono').fill('92214567890');
  await page.getByLabel('Dirección').fill('Calle 7 y 50');
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Estado civil').selectOption('viudo_a');
  await page.getByLabel('Profesión').selectOption('otro');
  await page.getByLabel('¿Cuál?').fill('Costurera');
  await page.getByLabel('¿En qué año empezaste a venir a la iglesia?').selectOption('2020');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // Un menor no ve el consentimiento: lo da el tutor después (FR-013 de la 001).
  const consentimiento = page.getByRole('checkbox');
  if (await consentimiento.isVisible()) await consentimiento.check();
  await page.getByRole('button', { name: 'Registrarme' }).click();
}

async function tokenDeAdmin(): Promise<string> {
  const { NEXTAUTH_SECRET } = leerEnvE2e();
  process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;
  return mintApiToken({ email: 'e2e-admin-007@example.com', personaId: null, estado: 'activa', rol: ['miembro_registrado', 'admin'] });
}

/** Una Persona registrada como en el formulario, por la API (más rápido que recorrer los 4 pasos). */
async function crearPersonaPorApi(email: string, fechaNacimiento: string, estadoEsperado: 'activa' | 'pendiente_tutor'): Promise<string> {
  const { NEXTAUTH_SECRET } = leerEnvE2e();
  process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;
  const token = await mintApiToken({ email, personaId: null, estado: null, rol: [] });
  const sedes = (await (await fetch(`${API_BASE_URL}/sedes`)).json()) as { id: string }[];
  const respuesta = await fetch(`${API_BASE_URL}/personas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      apellido: 'Codigo007',
      nombre: 'Sol',
      genero: 'femenino',
      fechaNacimiento,
      telefono: '+5492211234567',
      direccion: 'Calle 1 y 50',
      sedeId: sedes[0]?.id,
      estadoCivil: 'soltero_a',
      profesion: 'otro',
      profesionDetalle: 'Estudiante',
      congregaDesde: 2020,
      consentimientoDatos: estadoEsperado === 'activa',
    }),
  });
  if (!respuesta.ok) throw new Error(`POST /personas respondió ${respuesta.status}: ${await respuesta.text()}`);
  const cuerpo = (await respuesta.json()) as { id: string; estado: string };
  expect(cuerpo.estado).toBe(estadoEsperado);
  return cuerpo.id;
}

export const crearPersonaActiva = (email: string) => crearPersonaPorApi(email, '1958-03-12', 'activa');
/** Un menor `pendiente_tutor`, sin sesión propia (como lo deja el registro). */
export const crearMenorPendienteTutor = (email: string) => crearPersonaPorApi(email, '2014-01-01', 'pendiente_tutor');

/** D35: el Admin activa al menor con los datos del tutor. */
export async function activarMenor(id: string): Promise<void> {
  const respuesta = await fetch(`${API_BASE_URL}/personas/${id}/activar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenDeAdmin()}` },
    body: JSON.stringify({ tutorNombre: 'Marta', tutorApellido: 'Tutora', tutorTelefono: '+5492215550000' }),
  });
  if (!respuesta.ok) throw new Error(`PATCH activar respondió ${respuesta.status}: ${await respuesta.text()}`);
}

/** FR-014 de la 001: el Admin cierra un caso pendiente_tutor (activo = false). */
export async function marcarInactiva(id: string): Promise<void> {
  const respuesta = await fetch(`${API_BASE_URL}/personas/${id}/marcar-inactiva`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await tokenDeAdmin()}` },
  });
  if (!respuesta.ok) throw new Error(`PATCH marcar-inactiva respondió ${respuesta.status}: ${await respuesta.text()}`);
}
