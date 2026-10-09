import type { Page } from '@playwright/test';
import { test, expect, auditar, esperarTema, loguearseComoTest, sinScrollHorizontal } from './helpers';
import { registrarMenorActivo, usarTema } from './helpers-006';
import { crearPersonaActiva } from './helpers-011';
import { crearEventoDeBautismo, estadoBautismo, habilitarBautismo, pedirYAceptar } from './helpers-010';

/**
 * spec 010, T022 y T044 (Historias 1 y 4; SC-001, SC-004, SC-007, FR-019,
 * FR-020, FR-020a, FR-032): la card de Bautismo de Mi camino en celular
 * (`@celular`) y escritorio, con axe en claro y oscuro. Lo del Admin
 * (habilitar, aceptar, asignar fecha) va por la API (helpers-010).
 *
 * Lo que NO cubre: el `error.tsx` (la llamada a `/bautismo/me` la hace el
 * servidor de Next; Playwright no la intercepta), igual que la 006.
 */

const EMAIL_CONFIRMANDO = 'e2e-bautismo-confirmando@example.com'; // sembrar-e2e/010-bautismo.ts

function card(page: Page) {
  return page.getByRole('region', { name: 'Bautismo', exact: true });
}

async function sinViolaciones(page: Page, tema: 'claro' | 'oscuro') {
  await esperarTema(page, tema);
  const { violations } = await auditar(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function abrirMiCamino(page: Page) {
  await page.goto('/mi-camino');
  await page.waitForLoadState('networkidle');
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' });

    test('sin Vida Nueva: explica la regla y enlaza a Vida Nueva; habilitada: pide en dos toques, ve "Recibimos tu pedido" y lo retira @celular', async ({ page, baseURL }) => {
      const BASE = baseURL!;
      const email = `e2e-bautismo-pide-${tema}-${Date.now()}@example.com`;
      await crearPersonaActiva(BASE, email, 'Rocío');
      await loguearseComoTest(page, email);
      await usarTema(page, email, tema);
      await abrirMiCamino(page);

      // FR-002: no_habilitada — texto + enlace a Vida Nueva, sin botón de pedir.
      await expect(card(page)).toContainText('Lo vas a poder pedir cuando empieces Vida Nueva');
      await expect(card(page).getByRole('link', { name: 'Ver Vida Nueva' })).toBeVisible();
      await expect(card(page).getByRole('button', { name: 'Quiero bautizarme' })).toHaveCount(0);
      await expect(card(page).getByText('Todavía no se habilita', { exact: true })).toBeVisible();
      await sinViolaciones(page, tema);

      // FR-021 (por API) → puede_pedir. El encabezado lo dice también (no "Todavía no se habilita").
      await habilitarBautismo(BASE, email);
      await abrirMiCamino(page);
      const pedir = card(page).getByRole('button', { name: 'Quiero bautizarme' });
      await expect(pedir).toBeVisible();
      await expect(card(page).getByText('La podés empezar', { exact: true })).toBeVisible();
      await expect(card(page).getByText('Todavía no se habilita', { exact: true })).toHaveCount(0);
      expect((await pedir.boundingBox())!.height).toBeGreaterThanOrEqual(44); // D150
      await sinScrollHorizontal(page);

      // H-50: sin talle (D229) y con 501 caracteres → mensaje bajo cada campo y resumen arriba.
      await pedir.click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('¿Querés pedir tu bautismo?');
      const talle = dialogo.getByLabel('¿Qué talle de remera usás?');
      await expect(talle).toBeVisible();
      // D150. Con `poll`: el diálogo entra con una animación de escala, y medir a mitad de camino da ~42 px.
      await expect.poll(async () => (await talle.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await dialogo.getByLabel('¿Querés contarnos algo? (opcional)').fill('a'.repeat(501));
      await dialogo.getByRole('button', { name: 'Sí, pedir mi bautismo' }).click();
      await expect(dialogo.getByText('Revisá esto antes de seguir:')).toBeVisible();
      await expect(dialogo.getByRole('link', { name: 'Elegí un talle de remera de la lista.' })).toBeVisible();
      await expect(talle).toHaveAttribute('aria-invalid', 'true');
      await expect(dialogo.getByLabel('¿Querés contarnos algo? (opcional)')).toHaveAttribute('aria-invalid', 'true');
      await sinViolaciones(page, tema);

      // SC-001: corrige y confirma (doble clic = un solo pedido, H-57); la card cambia sin recargar.
      await talle.selectOption('L');
      await expect(talle).not.toHaveAttribute('aria-invalid', 'true');
      await dialogo.getByLabel('¿Querés contarnos algo? (opcional)').fill('Me gustaría con mi hermana');
      await dialogo.getByRole('button', { name: 'Sí, pedir mi bautismo' }).dblclick();
      await expect(card(page)).toContainText('Recibimos tu pedido');
      expect((await estadoBautismo(BASE, email)).estado).toBe('en_revision');

      // Recargar mantiene el estado y no ofrece pedir otra vez; el encabezado dice "En revisión".
      await abrirMiCamino(page);
      await expect(card(page)).toContainText('Recibimos tu pedido');
      await expect(card(page).getByText('En revisión', { exact: true })).toBeVisible();
      await expect(card(page).getByRole('button', { name: 'Quiero bautizarme' })).toHaveCount(0);
      await sinViolaciones(page, tema);

      // FR-020: retirar con diálogo neutro (D151).
      await card(page).getByRole('button', { name: 'Retirar el pedido' }).click();
      const retirar = page.getByRole('alertdialog');
      await expect(retirar).toContainText('¿Retirar tu pedido de bautismo?');
      await sinViolaciones(page, tema);
      await retirar.getByRole('button', { name: 'Sí, retirar el pedido' }).click();
      await expect(card(page)).toContainText('Retiraste tu pedido anterior');
      await expect(card(page).getByRole('button', { name: 'Quiero bautizarme' })).toBeVisible();
    });

    test('con fecha: muestra día, hora, lugar y enlace al Evento; "No puedo ese día" la devuelve a esperar fecha @celular', async ({ page, baseURL }) => {
      const BASE = baseURL!;
      const email = `e2e-bautismo-fecha-${tema}-${Date.now()}@example.com`;
      await crearPersonaActiva(BASE, email, 'Tomás');
      const evento = await crearEventoDeBautismo(BASE);
      await pedirYAceptar(BASE, email, evento.id);
      await loguearseComoTest(page, email);
      await usarTema(page, email, tema);
      await abrirMiCamino(page);

      await expect(card(page)).toContainText('Ya tenés fecha para tu bautismo');
      // El encabezado refleja la fecha y, con la etapa en marcha, no ofrece "Ya lo hice".
      await expect(card(page).getByText('Ya tenés fecha', { exact: true })).toBeVisible();
      await expect(card(page).getByRole('button', { name: 'Ya lo hice' })).toHaveCount(0);
      await expect(card(page)).toContainText('Club Universitario, calle 4 y 51');
      await expect(card(page).getByRole('link', { name: `Ver ${evento.nombre}` })).toHaveAttribute('href', `/eventos/${evento.slug}`);
      await sinViolaciones(page, tema);
      await sinScrollHorizontal(page);

      await card(page).getByRole('button', { name: 'No puedo ese día' }).click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toContainText('¿No podés ese día?');
      await sinViolaciones(page, tema);
      await dialogo.getByRole('button', { name: 'Sí, no puedo ese día' }).click();
      await expect(card(page)).toContainText('¡Aceptamos tu pedido!');
      expect((await estadoBautismo(BASE, email)).estado).toBe('esperando_fecha');
    });
  });
}

test('menor de 12: "lo pide tu mamá, papá o tutor", sin botón de pedir @celular', async ({ page, baseURL }) => {
  await registrarMenorActivo(page, baseURL!, `e2e-bautismo-menor-${Date.now()}@example.com`);
  await abrirMiCamino(page);
  await expect(card(page)).toContainText('Lo pide tu mamá, papá o tutor');
  await expect(card(page).getByRole('button', { name: 'Quiero bautizarme' })).toHaveCount(0);
  await sinViolaciones(page, 'claro');
});

test('Evento ya pasado sin confirmar: "Estamos confirmando tu bautismo", sin retirar @celular', async ({ page }) => {
  await loguearseComoTest(page, EMAIL_CONFIRMANDO);
  await usarTema(page, EMAIL_CONFIRMANDO, 'claro');
  await abrirMiCamino(page);
  await expect(card(page)).toContainText('Estamos confirmando tu bautismo');
  await expect(card(page).getByRole('button', { name: 'Retirar el pedido' })).toHaveCount(0);
  await sinViolaciones(page, 'claro');
});

test('una Solicitud creada en su nombre se ve igual que una propia', async ({ page, baseURL }) => {
  const BASE = baseURL!;
  const email = `e2e-bautismo-en-nombre-${Date.now()}@example.com`;
  await crearPersonaActiva(BASE, email, 'Delfina');
  await pedirYAceptar(BASE, email);
  await loguearseComoTest(page, email);
  await usarTema(page, email, 'claro');
  await abrirMiCamino(page);
  await expect(card(page)).toContainText('¡Aceptamos tu pedido!');
  await expect(card(page)).toContainText('Te avisamos cuando tengamos la próxima fecha');
});
