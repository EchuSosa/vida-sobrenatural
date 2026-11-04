import { test, expect, apiComo, crearPersona, loguearseComoAdminE2E, EMAIL_ADMIN } from './helpers';

/**
 * QA ronda 2, BUG-13: al crear un grupo de extensión "En la iglesia", el selector de Sede arranca
 * en la primera por orden alfabético, no en la de quien lo lidera. Siguiendo el manual (GEX-05) el
 * grupo de Hernán, de La Plata, queda en Buenos Aires, y en "Encontrá tu grupo" la tarjeta dice solo
 * "En la iglesia", sin decir cuál. El test crea una Sede `e2e-…`, que en el orden de la base va antes que La Plata.
 */
type Sede = { id: string; nombre: string };

test('"En la iglesia" propone la Sede de quien lidera el grupo', async ({ page }) => {
  test.slow();
  const sufijo = Date.now();
  const sedes = await apiComo<Sede[]>(EMAIL_ADMIN, 'GET', '/sedes');
  const laPlata = sedes.find((s) => s.nombre === 'La Plata')!;
  const otra = await apiComo<Sede>(EMAIL_ADMIN, 'POST', '/sedes', { nombre: `e2e-qa-sede-${sufijo}`, direccion: 'Calle 1 1234, CABA', horarios: 'Domingos 10 hs', contactoEmail: 'e2e-qa-sede@example.com' });
  try {
    const lider = await crearPersona(`e2e-qa-gex-sede-${sufijo}@example.com`, { nombre: 'Hernán', apellido: `Sede${sufijo}`, genero: 'masculino' });
    await apiComo(EMAIL_ADMIN, 'PATCH', `/personas/${lider.id}`, { sedeId: laPlata.id });

    await loguearseComoAdminE2E(page);
    await page.goto('/grupos-extension/nuevo');
    await page.getByLabel('Buscar por nombre, apellido o email').fill(`Sede${sufijo}`);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('button', { name: /Elegir/ }).first().click();
    await page.getByLabel('En la iglesia').check();
    await expect(page.getByRole('combobox', { name: 'Sede', exact: true })).toHaveValue(laPlata.id, { timeout: 3000 });
  } finally {
    await apiComo(EMAIL_ADMIN, 'PATCH', `/sedes/${otra.id}`, { activo: false });
  }
});
