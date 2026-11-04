import { test, expect, crearPersonaActiva, loguearseComoAdminE2E } from './helpers';

/**
 * QA ronda 2, BUG-11: el buscador de Personas no encuentra a nadie si se escribe el nombre y el
 * apellido juntos ("Valeria Domínguez"), solo con uno de los dos. Pasa también en Pendientes tutor
 * y al agregar a alguien a un grupo de extensión, que usan la misma búsqueda de la API.
 */
test('buscar a una Persona por "nombre apellido" la encuentra', async ({ page }) => {
  const apellido = `e2eQaBusca${Date.now()}`;
  await crearPersonaActiva(`e2e-qa-busca-${Date.now()}@example.com`, apellido);
  await loguearseComoAdminE2E(page);

  // Con el apellido solo, aparece.
  await page.goto(`/personas?q=${encodeURIComponent(apellido)}`);
  await expect(page.getByRole('link', { name: `${apellido}, E2E` })).toBeVisible();

  // Con "nombre apellido", como lo escribe cualquiera, también tiene que aparecer.
  await page.goto(`/personas?q=${encodeURIComponent(`E2E ${apellido}`)}`);
  await expect(page.getByRole('link', { name: `${apellido}, E2E` })).toBeVisible({ timeout: 5000 });
});
