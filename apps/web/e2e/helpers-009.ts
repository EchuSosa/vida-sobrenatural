import type { Page } from '@playwright/test';
import { loguearseComoTest } from './helpers';
import { api, sesionDe, tokenDe } from './helpers-006';

/**
 * spec 009 — helpers de e2e propios (IMPLEMENTACION §2.10). Las Personas
 * `e2e-ministerio-…` las siembra `apps/api/scripts/sembrar-e2e/009-ministerios.ts`.
 */
export const EMAILS_009 = {
  apta: 'e2e-ministerio-apta@example.com',
  aptaCelular: 'e2e-ministerio-apta-celular@example.com',
  noApta: 'e2e-ministerio-no-apta@example.com',
  miembro: 'e2e-ministerio-miembro@example.com',
} as const;

export const MINISTERIOS_009 = {
  bienvenida: 'e2e-Bienvenida',
  adoracion: 'e2e-Adoración',
  pausado: 'e2e-Pausado',
} as const;

type Estado = { estado: string; pendiente?: { postulacionId: string } | null; membresia?: { postulacionId: string } };

/**
 * Deja a una Persona apta sin postulación pendiente ni membresía (los
 * proyectos de Playwright y los reintentos comparten las filas sembradas):
 * retira la pendiente y, si es miembro, la da de baja como e2e-admin.
 */
export async function prepararSinPostulacion(baseURL: string, email: string): Promise<void> {
  const token = await tokenDe(baseURL, email);
  let estado = (await api(token, 'GET', '/ministerios/me')) as Estado;
  if (estado.pendiente) estado = (await api(token, 'POST', `/postulaciones/me/${estado.pendiente.postulacionId}/retirar`)) as Estado;
  if (estado.estado === 'miembro' && estado.membresia) {
    const admin = await tokenDe(baseURL, 'e2e-admin@example.com');
    await api(admin, 'POST', `/postulaciones/${estado.membresia.postulacionId}/dar-de-baja`, {});
  }
}

/** Postula por API (como la propia Persona) y devuelve el id de la Postulación. */
export async function postularComo(baseURL: string, email: string, ministerioNombre: string, celulaNombre?: string): Promise<string> {
  const token = await tokenDe(baseURL, email);
  const ministerios = (await api(token, 'GET', '/ministerios/me/disponibles')) as Array<{ id: string; nombre: string; celulas: Array<{ id: string; nombre: string }> }>;
  const m = ministerios.find((x) => x.nombre === ministerioNombre);
  if (!m) throw new Error(`No está el Ministerio ${ministerioNombre}`);
  const celulaId = celulaNombre ? m.celulas.find((c) => c.nombre === celulaNombre)?.id : null;
  const estado = (await api(token, 'POST', `/ministerios/${m.id}/postulaciones/me`, { celulaId })) as Estado;
  return estado.pendiente!.postulacionId;
}

export { sesionDe };

/**
 * Las Personas sembradas se comparten entre el modo claro y el oscuro (y entre
 * proyectos): `usarTemaOscuro` deja guardado `oscuro`, así que el claro tiene
 * que volver a guardarlo explícitamente antes de entrar.
 */
export async function entrarConTema(page: Page, baseURL: string, email: string, tema: 'claro' | 'oscuro'): Promise<void> {
  const token = await tokenDe(baseURL, email);
  await api(token, 'PATCH', '/personas/me/preferencias', { temaPreferido: tema });
  if (tema === 'oscuro') await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
  await loguearseComoTest(page, email);
}
