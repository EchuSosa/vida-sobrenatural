import type { Page } from '@playwright/test';
import { test, expect, apiComo, crearPersona, loguearseComoAdminE2E } from './helpers';
import { crearEdicionPorApi, crearPersonaApta } from './helpers-008';
import { EMAILS_009, MINISTERIOS_009, ministerioPorNombre, postularComo, prepararSinPostulacion } from './helpers-009';
import { prepararEleccionCharlada } from './helpers-015';
import { campo, completarFecha } from '../../../scripts/e2e-campos-fecha-hora';
import { CONSOLA_500, TEXTO_ERROR_INTERNO, apiCaida, contarPedidos, tresClics } from '../../../scripts/e2e-casos-infelices';

/**
 * Pasada de casos infelices del backoffice (Echu, 2026-11-01): qué ve el Admin cuando la API falla
 * al resolver algo, y que un toque repetido no haga dos veces lo mismo. Lo que se afirma: el
 * mensaje dice qué pasó (texto), nada quedó resuelto a medias y se puede volver a intentar.
 */

test('aprobar un pedido de Vida de Servicio: si la API falla, avisa y el pedido sigue pendiente', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const sufijo = `${Date.now()}`;
  const edicion = `e2e-infeliz-${sufijo}`;
  const grupoId = await crearEdicionPorApi({ nombre: edicion });
  const ana = await crearPersonaApta(`e2e-infeliz-vs-${sufijo}@example.com`, 'Ana', `Infeliz${sufijo}`);
  const { solicitudId } = await apiComo<{ solicitudId: string }>(ana.email, 'POST', '/vida-de-servicio/solicitudes/me', { grupoId });

  await loguearseComoAdminE2E(page);
  await page.goto(`/solicitudes/vida-de-servicio/${solicitudId}`);
  await apiCaida(page, 'POST', /\/vida-de-servicio\/solicitudes\/[^/]+\/aprobar$/);
  await page.getByRole('button', { name: 'Aprobar inscripción' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  const detalle = await apiComo<{ estado: string }>('e2e-admin@example.com', 'GET', `/vida-de-servicio/solicitudes/${solicitudId}`);
  expect(detalle.estado).toBe('pendiente');
});

test('aprobar una postulación: si la API falla, avisa y sigue pendiente', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await prepararSinPostulacion(EMAILS_009.postulante);
  try {
    const bienvenida = await ministerioPorNombre(MINISTERIOS_009.bienvenida);
    const id = await postularComo(EMAILS_009.postulante, bienvenida.id);
    await loguearseComoAdminE2E(page);
    await page.goto(`/solicitudes/postulacion/${id}`);
    await apiCaida(page, 'POST', /\/postulaciones\/[^/]+\/aprobar$/);
    await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, aprobar' }).click();
    await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
    await expect(page.getByText('Aprobada', { exact: true })).toHaveCount(0);
  } finally {
    await prepararSinPostulacion(EMAILS_009.postulante);
  }
});

test('confirmar un área de la elección: si la API falla, avisa y el área sigue sin resolver', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const eleccionId = await prepararEleccionCharlada();
  await loguearseComoAdminE2E(page);
  await page.goto(`/solicitudes/eleccion-ministerio/${eleccionId}`);
  await apiCaida(page, 'POST', /\/opciones\/[^/]+\/confirmar$/);
  await page.getByRole('button', { name: 'Confirmar e2e-Bienvenida · Seguridad' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, confirmar' }).click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  await expect(page.getByText('Confirmada: ya sirve ahí')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirmar e2e-Bienvenida · Seguridad' })).toBeEnabled();
});

async function completarAlta(page: Page, apellido: string) {
  await page.getByLabel('Apellido').fill(apellido);
  await page.getByLabel('Nombre', { exact: true }).fill('Rosa');
  await page.getByLabel('Género').selectOption('femenino');
  await completarFecha(campo(page, 'Fecha de nacimiento'), '1948-03-12');
  await page.getByLabel('Teléfono').fill(`221${String(Date.now()).slice(-7)}`);
  await page.getByLabel('Dirección').fill('Calle 7 1234');
  await page.getByLabel('Sede').selectOption({ index: 1 });
  await page.getByLabel('¿En qué año empezó a venir a la iglesia?').selectOption({ index: 5 });
  await page.getByLabel('Estado civil').selectOption('viudo_a');
  await page.getByLabel('Profesión u ocupación').selectOption('jubilado_a');
  await page.getByRole('checkbox').check();
}

test('alta de una persona: si la API falla, el aviso queda en la pantalla con los datos cargados; tres toques dan de alta una sola', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  const apellido = `Infeliz${Date.now()}`;
  await loguearseComoAdminE2E(page);
  await page.goto('/personas/nueva');
  await completarAlta(page, apellido);

  await apiCaida(page, 'POST', /\/personas\/alta$/);
  await page.getByRole('button', { name: 'Dar de alta' }).click();
  await expect(page.getByRole('alert').filter({ hasText: TEXTO_ERROR_INTERNO })).toBeVisible();
  await expect(page.getByLabel('Apellido')).toHaveValue(apellido);

  await page.unrouteAll({ behavior: 'wait' });
  const pedidos = contarPedidos(page, 'POST', /\/personas\/alta$/);
  await tresClics(page.getByRole('button', { name: 'Dar de alta' }));
  await expect(page.getByRole('heading', { name: `Listo: Rosa ${apellido} ya está cargada` })).toBeVisible();
  expect(pedidos.n).toBe(1);
});

test('editar una persona: tres toques en "Guardar cambios" mandan un solo pedido', async ({ page }) => {
  const sufijo = `${Date.now()}`;
  const persona = await crearPersona(`e2e-infeliz-editar-${sufijo}@example.com`, { nombre: 'Rosa', apellido: `Infeliz ${sufijo}`, telefono: '+54 9 221 555 0101' });
  await loguearseComoAdminE2E(page);
  await page.goto(`/personas/${persona.id}/editar`);
  await page.getByLabel('Dirección').fill('Calle 50 número 742');
  const pedidos = contarPedidos(page, 'PATCH', new RegExp(`/personas/${persona.id}$`));
  await tresClics(page.getByRole('button', { name: 'Guardar cambios' }));
  await expect(page).toHaveURL(new RegExp(`/personas/${persona.id}$`));
  expect(pedidos.n).toBe(1);
});

test('asignar un líder de ministerio: si la API falla, avisa y no queda asignado; tres toques asignan uno solo', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await loguearseComoAdminE2E(page);
  const mesa = await ministerioPorNombre(MINISTERIOS_009.mesa);
  await page.goto(`/ministerios/${mesa.id}`);
  const lideres = page.getByRole('region', { name: /^Líderes/ });
  await lideres.getByText('Asignar líder').click();
  await lideres.getByLabel('Buscar por nombre, apellido o email').fill('Nora E2E');
  await lideres.getByRole('button', { name: 'Buscar', exact: true }).click();
  const asignar = lideres.getByRole('button', { name: 'Asignar a Nora E2E Líder como líder' });

  await apiCaida(page, 'POST', /\/ministerios\/[^/]+\/lideres$/);
  await asignar.click();
  await expect(page.getByText(TEXTO_ERROR_INTERNO)).toBeVisible();
  await expect(lideres.getByRole('button', { name: 'Quitar: Nora E2E Líder' })).toHaveCount(0);

  await page.unrouteAll({ behavior: 'wait' });
  const pedidos = contarPedidos(page, 'POST', /\/ministerios\/[^/]+\/lideres$/);
  try {
    await tresClics(asignar);
    await expect(lideres.getByRole('button', { name: 'Quitar: Nora E2E Líder' })).toBeVisible();
    expect(pedidos.n).toBe(1);
  } finally {
    // Deja Mesa de entrada como estaba (sin Nora), para no cambiar lo que ven otros tests.
    const vigentes = await apiComo<Array<{ persona: { id: string; nombre: string } }>>('e2e-admin@example.com', 'GET', `/ministerios/${mesa.id}/lideres`);
    for (const l of vigentes.filter((x) => x.persona.nombre === 'Nora')) {
      await apiComo('e2e-admin@example.com', 'DELETE', `/ministerios/${mesa.id}/lideres/${l.persona.id}`);
    }
  }
});

test('crear una Sede: si la API falla, el aviso se anuncia (role=alert), es texto de la app y el modal queda abierto', async ({ page, permitirErrorDeConsola }) => {
  permitirErrorDeConsola(CONSOLA_500);
  await loguearseComoAdminE2E(page);
  await page.goto('/sedes');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Crear Sede' }).click();
  const modal = page.getByRole('dialog', { name: 'Crear Sede' });
  await modal.getByPlaceholder('Nombre').fill(`e2e-sede-infeliz-${Date.now()}`);
  await modal.getByPlaceholder('Dirección').fill('Calle 7 y 47, La Plata');
  await modal.getByPlaceholder('Horarios (ej. "Domingos 10:30 hs")').fill('Domingos 11 hs');
  await modal.getByLabel('Teléfono de contacto (opcional)').fill('92211230000');
  await apiCaida(page, 'POST', /\/sedes$/);
  await modal.getByRole('button', { name: 'Crear Sede' }).click();
  await expect(modal.getByRole('alert').filter({ hasText: TEXTO_ERROR_INTERNO })).toBeVisible();
  await expect(modal).toBeVisible();
});
