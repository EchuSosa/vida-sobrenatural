import { request as playwrightRequest, type Page } from '@playwright/test';
import { test, expect, auditar, loguearseComoTest, registrarPersonaDeTest } from './helpers';

/**
 * specs/004, Historias 1 y 2 (T021, T035): Vida Nueva en Mi camino, de punta
 * a punta y con axe en los dos temas. Lo que arma el equipo (proponer,
 * rechazar) se hace por API con la sesión de e2e-admin, que siembra
 * sembrar-e2e-admin.ts; e2e-discipulador@ ya tiene agenda (martes 19–21) y la
 * disponibilidad prendida.
 */

const API = () => process.env.API_BASE_URL ?? 'http://localhost:3334';

/** El token de API de una sesión de `apps/web` iniciada con test-login, en un contexto propio (no toca la `page`). */
async function tokenDe(baseURL: string, email: string): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL });
  try {
    const { csrfToken } = await (await ctx.get('/api/auth/csrf')).json();
    await ctx.post('/api/auth/callback/test-login', { form: { email, csrfToken } });
    const session = await (await ctx.get('/api/auth/session')).json();
    return session.apiToken as string;
  } finally {
    await ctx.dispose();
  }
}

async function api(token: string, metodo: 'GET' | 'POST' | 'PATCH', ruta: string, data?: unknown) {
  const ctx = await playwrightRequest.newContext();
  try {
    const response = await ctx.fetch(`${API()}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data,
    });
    const cuerpo = await response.text();
    if (!response.ok()) throw new Error(`${metodo} ${ruta} respondió ${response.status()}: ${cuerpo}`);
    return cuerpo ? JSON.parse(cuerpo) : undefined;
  } finally {
    await ctx.dispose();
  }
}

/** Fecha `YYYY-MM-DD` de hace `anios` años menos un día (cumplidos). */
function nacidoHace(anios: number): string {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

/**
 * Un menor de 12 con acceso a la app (FR-044): se registra por API (queda
 * `pendiente_tutor`) y e2e-admin lo activa con los datos del tutor, como en
 * el backoffice. Después la `page` inicia sesión como él.
 */
async function registrarMenorActivo(page: Page, baseURL: string, email: string) {
  const token = await tokenDe(baseURL, email);
  const sedes: Array<{ id: string }> = await (await page.request.get(`${API()}/sedes`)).json();
  const persona = await api(token, 'POST', '/personas', {
    apellido: 'Menor',
    nombre: 'Lucía',
    genero: 'femenino',
    fechaNacimiento: nacidoHace(10),
    telefono: '+5492219000003',
    direccion: 'Calle 1 y 50',
    sedeId: sedes[0].id,
    estadoCivil: 'soltero_a',
    profesion: 'estudiante',
    tiempoCongregacion: 'menos_6_meses',
    consentimientoDatos: false,
  });
  const admin = await tokenDe(baseURL, 'e2e-admin@example.com');
  await api(admin, 'PATCH', `/personas/${persona.id}/activar`, { tutorNombre: 'Mamá', tutorApellido: 'Menor', tutorTelefono: '+5492219000004' });
  await loguearseComoTest(page, email);
}

/**
 * La tarjeta de Vida Nueva. Las búsquedas de texto van adentro de ella: al
 * recargar, Next conserva una copia oculta del render anterior y un
 * `getByText` suelto encuentra dos.
 */
function tarjeta(page: Page) {
  return page.getByRole('region', { name: 'Vida Nueva' });
}

/**
 * D95/T078: `SincronizarTema` aplica la preferencia GUARDADA de la Persona
 * (`claro` por defecto) apenas hay sesión, y pisa lo que haya en
 * localStorage. Para auditar el oscuro de verdad, la Persona del test guarda
 * `oscuro` (como haría desde Perfil) y vuelve a iniciar sesión.
 */
async function usarTema(page: Page, baseURL: string, email: string, tema: 'claro' | 'oscuro') {
  if (tema === 'claro') return;
  await api(await tokenDe(baseURL, email), 'PATCH', '/personas/me/preferencias', { temaPreferido: 'oscuro' });
  await loguearseComoTest(page, email);
}

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  if (tema === 'oscuro') await expect(page.locator('html')).toHaveClass(/dark/);
  else await expect(page.locator('html')).not.toHaveClass(/dark/);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('un menor de 12 no ve el botón de pedir y sí el texto del tutor (FR-044)', async ({ page, baseURL }) => {
      const email = `e2e-mi-camino-menor-${tema}-${Date.now()}@example.com`;
      await registrarMenorActivo(page, baseURL!, email);
      await usarTema(page, baseURL!, email, tema);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');

      await expect(tarjeta(page).getByText('Este pedido lo hace tu mamá, tu papá o tu tutor')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toHaveCount(0);
      await sinViolaciones(page, tema);
    });

    test('pedir Vida Nueva: sin franjas da el error por campo; con una, pasa a "buscando", se edita y se retira', async ({ page, baseURL }) => {
      const email = `e2e-mi-camino-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      await usarTema(page, baseURL!, email, tema);
      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await sinViolaciones(page, tema);

      // Sin franjas: error debajo del campo y en el resumen, con foco (H-50).
      const pedir = page.getByRole('button', { name: 'Quiero empezar Vida Nueva' });
      await pedir.click();
      const resumen = page.getByRole('alert').filter({ hasText: 'Revisá esto antes de seguir:' });
      await expect(resumen).toBeFocused();
      await expect(page.locator('#campo-franjas-error')).toHaveText('Agregá al menos un día y horario con "Agregar franja".');
      await sinViolaciones(page, tema);

      // Con una franja (martes 19 a 21, el default del editor): pasa a buscando sin recargar.
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await expect(resumen).toHaveCount(0);
      await pedir.click();
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();
      await expect(tarjeta(page).getByText('Martes 19:00 a 21:00')).toBeVisible();
      await sinViolaciones(page, tema);

      await page.reload();
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();

      // Editar los horarios: cambia a sábado 10 a 13.
      await page.getByRole('button', { name: 'Editar horarios' }).click();
      await page.getByRole('button', { name: 'Quitar' }).click();
      await page.getByLabel('Día').selectOption({ label: 'Sábado' });
      await page.getByLabel('Desde').fill('10:00');
      await page.getByLabel('Hasta').fill('13:00');
      await page.getByRole('button', { name: 'Agregar franja' }).click();
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Guardar horarios' }).click();
      await expect(tarjeta(page).getByText('Sábado 10:00 a 13:00')).toBeVisible();
      await expect(tarjeta(page).getByText('Martes 19:00 a 21:00')).toHaveCount(0);

      // Retirar, con confirmación, y volver a poder pedir.
      await page.getByRole('button', { name: 'Retirar el pedido' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('¿Retirar tu pedido de Vida Nueva?');
      await sinViolaciones(page, tema);
      await page.getByRole('button', { name: 'Sí, retirar el pedido' }).click();
      await expect(tarjeta(page).getByText('Retiraste tu pedido anterior.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toBeVisible();
    });

    test('con la Solicitud propuesta ve lo mismo que pendiente, sin el nombre del Discipulador; rechazada, ve el estado y puede volver a pedir (T035)', async ({
      page,
      baseURL,
    }) => {
      const email = `e2e-mi-camino-propuesta-${tema}-${Date.now()}@example.com`;
      await registrarPersonaDeTest(page, email);
      await usarTema(page, baseURL!, email, tema);
      const persona = await tokenDe(baseURL!, email);
      const { id: solicitudId } = await api(persona, 'POST', '/discipulado/solicitudes/me', {
        franjas: [{ diaSemana: 2, inicio: 18 * 60, fin: 20 * 60 }],
      });

      const admin = await tokenDe(baseURL!, 'e2e-admin@example.com');
      const cruce = await api(admin, 'GET', `/discipulado/solicitudes/${solicitudId}/cruce`);
      const propuesto = [...cruce.franjas.flatMap((f: { coinciden: unknown[] }) => f.coinciden), ...cruce.noCoinciden][0] as {
        id: string;
        nombre: string;
        apellido: string;
      };
      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/proponer`, { discipuladorId: propuesto.id });

      await page.goto('/mi-camino');
      await page.waitForLoadState('networkidle');
      await expect(tarjeta(page).getByText('Estamos buscando a tu Discipulador')).toBeVisible();
      await expect(page.getByText(propuesto.apellido)).toHaveCount(0);
      await sinViolaciones(page, tema);

      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/retirar-propuesta`);
      await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/rechazar`);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(tarjeta(page).getByText('Esta vez tu pedido no pudo avanzar.', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quiero empezar Vida Nueva' })).toBeVisible();
      await sinViolaciones(page, tema);
    });

    // TODO(merge): aceptar la propuesta y cargar un Encuentro son del lote B
    // (POST /discipulado/propuestas/:id/aceptar, POST …/encuentros). Con esos
    // endpoints mergeados, este caso se completa: ve el nombre y el teléfono
    // de su Discipulador y NO el texto de una nota (FR-027, FR-029).
    test.fixme('aceptada: ve a su Discipulador con su teléfono y no ve las notas de los Encuentros (T035)', async () => {});
  });
}
