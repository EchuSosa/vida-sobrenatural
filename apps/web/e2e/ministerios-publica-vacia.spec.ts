import { test, expect, auditar } from './helpers';
import { api, tokenDe } from './helpers-006';
import { EMAIL_ADMIN } from './helpers-008';

/**
 * Auditoría de tests del 2026-10-13 (docs/24, hallazgo 3): el estado vacío de la página pública de
 * Ministerios había quedado sin test (se borró en 232ecb5 porque los seeds ya cargan Ministerios).
 * Principio VIII: los cuatro estados se prueban. Con `workers: 1` ningún otro test corre mientras
 * los Ministerios están pausados; igual se restauran en `finally`.
 */
test('pública: sin Ministerios activos muestra el estado vacío, no un error ni una lista en blanco', async ({ page, baseURL }) => {
  const admin = await tokenDe(baseURL!, EMAIL_ADMIN);
  const activos = ((await api(admin, 'GET', '/ministerios?estado=activos')) as Array<{ id: string; nombre: string; activo: boolean }>).filter((m) => m.activo);
  try {
    // Pausar uno con miembros pide confirmar con el nombre (D177).
    for (const m of activos) await api(admin, 'PATCH', `/ministerios/${m.id}`, { activo: false, confirmacionNombre: m.nombre });
    const respuesta = await page.goto('/ministerios');
    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole('main')).toContainText('Todavía no publicamos los Ministerios acá');
    // Sin Ministerios no hay bloque "Sumarte": la salida es la miga de pan a Primeros pasos.
    await expect(page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Primeros pasos' })).toBeVisible();
    expect((await auditar(page)).violations).toEqual([]);
  } finally {
    for (const m of activos) await api(admin, 'PATCH', `/ministerios/${m.id}`, { activo: true });
  }
});
