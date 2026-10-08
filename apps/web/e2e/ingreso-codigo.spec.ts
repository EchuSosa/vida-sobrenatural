import { type Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, loguearseComoTest, registrarPersonaDeTest } from './helpers';
import {
  activarMenor,
  completarRegistro,
  crearMenorPendienteTutor,
  crearPersonaActiva,
  entrarConCodigo,
  escribirCodigo,
  marcarInactiva,
  pedirCodigo,
  personaIdDeSesion,
} from './helpers-007';
import { esperarMensaje, leerCodigoDeMailpit } from '../../../scripts/e2e-mailpit';

/**
 * spec 007 (T026, T030, T031, T033, T040; quickstart.md, escenarios 1–9 y 12):
 * el ingreso con código por email en la web, por la pantalla real y con el
 * mail real en Mailpit. `axe` en claro y oscuro sobre `/ingresar` y
 * `/ingresar/codigo` (flujo crítico, Principio VI).
 */
/** El resumen de errores (H-50); `getByRole('alert')` a secas también encuentra el anunciador de rutas de Next. */
const resumen = (page: Page) => page.getByRole('alert').filter({ hasText: 'Revisá esto para seguir' });

const unico = (clave: string) => `e2e-codigo-${clave}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

test.describe('Historia 1: entrar con un código', () => {
  test('una Persona activa entra a /inicio con el código (escenario 1) @celular', async ({ page }) => {
    const email = unico('activa');
    await crearPersonaActiva(email);

    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test('código equivocado: mensaje en el campo y en el resumen, el email sigue a la vista (escenario 2)', async ({ page }) => {
    const email = unico('equivocado');
    await pedirCodigo(page, email);
    const codigo = await leerCodigoDeMailpit(email);
    const equivocado = codigo === '000000' ? '111111' : '000000';

    await escribirCodigo(page, equivocado);
    const mensaje = 'Ese código no coincide. Revisá el último mail que te mandamos, o pedí uno nuevo con «Enviarme otro código».';
    const alerta = resumen(page);
    await expect(alerta).toContainText(mensaje);
    await expect(alerta).toBeFocused();
    await expect(page.getByLabel('Código', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#error-codigo')).toHaveText(mensaje);
    await expect(page.getByText(`Te mandamos un código a ${email}.`)).toBeVisible();
    await expect(page).toHaveURL(/\/ingresar\/codigo$/);
  });

  test('al quinto intento el código deja de servir (escenario 3)', async ({ page }) => {
    const email = unico('intentos');
    await crearPersonaActiva(email);
    await pedirCodigo(page, email);
    const codigo = await leerCodigoDeMailpit(email);
    const equivocado = codigo === '000000' ? '111111' : '000000';

    for (let i = 0; i < 4; i++) {
      await escribirCodigo(page, equivocado);
      await expect(resumen(page)).toContainText('Ese código no coincide');
    }
    await escribirCodigo(page, equivocado);
    await expect(resumen(page)).toContainText('Probaste muchas veces con este código');
    await escribirCodigo(page, codigo);
    await expect(resumen(page)).toContainText('Este código ya no sirve');
    await expect(page).toHaveURL(/\/ingresar\/codigo$/);
  });

  test('"Enviarme otro código" reemplaza al anterior (escenario 4)', async ({ page }) => {
    const email = unico('reenvio');
    await crearPersonaActiva(email);
    await pedirCodigo(page, email);
    const primero = await leerCodigoDeMailpit(email, 1);

    await page.getByRole('button', { name: 'Enviarme otro código' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'te mandamos un código nuevo' })).toBeVisible();
    const segundo = await leerCodigoDeMailpit(email, 2);

    if (primero !== segundo) {
      await escribirCodigo(page, primero);
      await expect(resumen(page)).toContainText('Ese código no coincide');
    }
    await escribirCodigo(page, segundo);
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test('"Usar otro email" vuelve al primer paso', async ({ page }) => {
    await pedirCodigo(page, unico('otro-email'));
    await page.getByRole('button', { name: 'Usar otro email' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await expect(page.getByLabel('Tu email', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Sin la cookie del email, el paso del código no se puede abrir directo.
    await page.goto('/ingresar/codigo');
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test('email con formato inválido: error en el campo, sin mandar nada', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Tu email', { exact: true }).fill('rosa@');
    await page.getByRole('button', { name: 'Enviarme el código' }).click();
    await expect(resumen(page)).toContainText('Escribí un email completo, por ejemplo nombre@hotmail.com.');
    await expect(page.getByLabel('Tu email', { exact: true })).toHaveValue('rosa@');
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test('el menú público lleva a /ingresar, y /registro sin sesión también', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Ingresar', exact: true }).first().click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.waitForLoadState('networkidle');
    await page.goto('/registro');
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test('con sesión activa, /ingresar?destino= lleva al destino si es interno, y si no a /inicio', async ({ page }) => {
    const email = unico('destino');
    await crearPersonaActiva(email);
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/inicio$/);
    await page.waitForLoadState('networkidle');
    await page.goto('/ingresar?destino=%2Fperfil');
    await expect(page).toHaveURL(/\/perfil$/);
    await page.waitForLoadState('networkidle');
    await page.goto('/ingresar?destino=https%3A%2F%2Fevil.example.com');
    await expect(page).toHaveURL(/\/inicio$/);
  });
});

test.describe('Historia 2: registrarse con un email de cualquier proveedor', () => {
  test('un email nuevo ve la misma pantalla y entra al registro con el email cargado (escenario 5)', async ({ browser }) => {
    const nuevo = unico('nuevo');
    const registrado = unico('registrado');
    await crearPersonaActiva(registrado);

    const textoDe = async (email: string) => {
      const contexto = await browser.newContext();
      const pagina = await contexto.newPage();
      await pedirCodigo(pagina, email);
      const texto = (await pagina.getByRole('main').innerText()).replaceAll(email, '<email>');
      return { contexto, pagina, texto };
    };
    const a = await textoDe(registrado);
    const b = await textoDe(nuevo);
    expect(b.texto).toBe(a.texto);
    await a.contexto.close();

    const page = b.pagina;
    await escribirCodigo(page, await leerCodigoDeMailpit(nuevo));
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText(nuevo)).toBeVisible();
    await expect(page.getByLabel('Apellido')).toHaveValue('');
    await expect(page.getByLabel('Nombre')).toHaveValue('');
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveCount(0);

    await completarRegistro(page);
    await expect(page).toHaveURL(/\/registro\/listo/);
    const sesion = (await (await page.request.get('/api/auth/session')).json()) as { user: { estado: string; email: string } };
    expect(sesion.user).toMatchObject({ estado: 'activa', email: nuevo });
    await b.contexto.close();
  });

  test('con fecha de menor queda pendiente_tutor y ve la pantalla de espera (escenario 6)', async ({ page }) => {
    const email = unico('menor');
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/registro$/);
    await completarRegistro(page, '2013-08-01');
    await expect(page).toHaveURL(/\/pendiente-tutor/);
  });
});

test.describe('Historia 3: convivir con Google sin duplicar Personas', () => {
  test('mayúsculas y espacios: la misma Persona (escenario 7)', async ({ page }) => {
    const email = unico('mayus');
    const id = await crearPersonaActiva(email);
    await entrarConCodigo(page, `  ${email.toUpperCase()} `, email);
    await expect(page).toHaveURL(/\/inicio$/);
    expect(await personaIdDeSesion(page)).toBe(id);
  });

  test('una Persona que entró con Google entra con código a la misma Persona (escenario 8)', async ({ browser }) => {
    const email = unico('google');
    const conGoogle = await browser.newContext();
    const paginaGoogle = await conGoogle.newPage();
    await registrarPersonaDeTest(paginaGoogle, email);
    await paginaGoogle.goto('/inicio');
    const idGoogle = await personaIdDeSesion(paginaGoogle);
    expect(idGoogle).toBeTruthy();
    await conGoogle.close();

    const conCodigo = await browser.newContext();
    const page = await conCodigo.newPage();
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/inicio$/);
    expect(await personaIdDeSesion(page)).toBe(idGoogle);
    await conCodigo.close();
  });
});

test.describe('Historia 4: Personas cargadas por otros y estados', () => {
  test('un menor pre-cargado y activado entra sin pasar por el registro (escenario 9, D35)', async ({ page }) => {
    const email = unico('menor-activado');
    const id = await crearMenorPendienteTutor(email);
    await activarMenor(id);
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/inicio$/);
    expect(await personaIdDeSesion(page)).toBe(id);
  });

  test('pendiente_tutor con el código correcto llega a la pantalla de espera, sin sesión', async ({ page }) => {
    const email = unico('pendiente');
    await crearMenorPendienteTutor(email);
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(/\/pendiente-tutor/);
    expect(await (await page.request.get('/api/auth/session')).json()).toBeNull();
  });

  test('una Persona desactivada recibe el mismo trato que con Google', async ({ browser }) => {
    const email = unico('inactiva');
    const id = await crearMenorPendienteTutor(email);
    await marcarInactiva(id);

    const conGoogle = await browser.newContext();
    const paginaGoogle = await conGoogle.newPage();
    const csrf = (await (await paginaGoogle.request.get('/api/auth/csrf')).json()) as { csrfToken: string };
    const login = await paginaGoogle.request.post('/api/auth/callback/test-login', { form: { email, csrfToken: csrf.csrfToken, callbackUrl: '/ingresar' } });
    const destinoGoogle = new URL(login.url()).pathname;
    const sesionGoogle = await (await paginaGoogle.request.get('/api/auth/session')).json();
    await conGoogle.close();

    const conCodigo = await browser.newContext();
    const page = await conCodigo.newPage();
    await entrarConCodigo(page, email);
    await expect(page).toHaveURL(new RegExp(`${destinoGoogle.replace(/\//g, '\\/')}$`));
    expect(await (await page.request.get('/api/auth/session')).json()).toEqual(sesionGoogle);
    await conCodigo.close();
  });
});

test.describe('Historia 6: un mail claro y sin datos', () => {
  test('el mail tiene el código, los 15 minutos y "si no fuiste vos", sin nombre ni enlaces, igual para cualquier email (escenario 12)', async ({ browser }) => {
    const registrado = unico('mail-registrado');
    const nuevo = unico('mail-nuevo');
    await crearPersonaActiva(registrado);

    for (const email of [registrado, nuevo]) {
      const contexto = await browser.newContext();
      await pedirCodigo(await contexto.newPage(), email);
      await contexto.close();
    }
    const [a, b] = await Promise.all([esperarMensaje(registrado), esperarMensaje(nuevo)]);

    const codigo = /(\d{6})/.exec(a.Subject)![1];
    expect(a.Subject).toBe(`Tu código para entrar: ${codigo}`);
    for (const parte of [a.HTML, a.Text]) {
      expect(parte).toContain(codigo);
      expect(parte).toContain('Vale por 15 minutos');
      expect(parte).toContain('Si no fuiste vos, ignorá este mail');
      // crearPersonaActiva la llama "Sol Codigo007": nada de eso llega al mail.
      expect(parte).not.toContain('Sol');
      expect(parte).not.toContain('Codigo007');
      expect(parte).not.toMatch(/https?:\/\//);
    }
    expect(a.HTML).not.toMatch(/<a\s/);
    const sinCodigo = (s: string) => s.replace(/\d{6}/g, 'XXXXXX');
    expect(sinCodigo(b.HTML)).toBe(sinCodigo(a.HTML));
    expect(sinCodigo(b.Text)).toBe(sinCodigo(a.Text));
  });
});

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`axe en modo ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((oscuro) => window.localStorage.setItem('theme', oscuro ? 'dark' : 'light'), tema === 'oscuro');
    });

    test('/ingresar y /ingresar/codigo sin violaciones, también con errores a la vista', async ({ page }) => {
      await page.goto('/ingresar');
      await page.waitForLoadState('networkidle');
      await esperarTema(page, tema);
      expect((await auditar(page)).violations).toEqual([]);

      await page.getByRole('button', { name: 'Enviarme el código' }).click();
      await expect(resumen(page)).toBeVisible();
      expect((await auditar(page)).violations).toEqual([]);

      const email = unico(`axe-${tema}`);
      await pedirCodigo(page, email);
      await esperarTema(page, tema);
      expect((await auditar(page)).violations).toEqual([]);

      await escribirCodigo(page, '12');
      await expect(resumen(page)).toContainText('Escribí los 6 números');
      expect((await auditar(page)).violations).toEqual([]);
    });
  });
}

test('test-login no cambia: una sesión sin Persona sigue yendo al registro desde /ingresar', async ({ page }) => {
  const email = unico('test-login');
  await loguearseComoTest(page, email);
  await page.goto('/ingresar');
  await expect(page).toHaveURL(/\/registro$/);
});
