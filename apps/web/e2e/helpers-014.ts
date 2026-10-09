import { api, tokenDe } from './helpers-006';
import { entrarConTema } from './helpers-009';

/**
 * spec 014 — helpers de e2e propios (IMPLEMENTACION §2.10). Las Personas
 * `e2e-gex-…` y los Grupos `e2e-…` los siembra
 * `apps/api/scripts/sembrar-e2e/014-grupos-extension.ts`.
 */
export const EMAILS_014 = {
  buscadora: 'e2e-gex-buscadora@example.com',
  buscadoraCelular: 'e2e-gex-buscadora-celular@example.com',
  lider: 'e2e-gex-lider@example.com',
} as const;

export const GRUPOS_014 = {
  cerca: 'e2e-Mujeres del centro',
  lejos: 'e2e-Mujeres de City Bell',
  varones: 'e2e-Varones de Tolosa',
  completo: 'e2e-Grupo completo',
} as const;

type EstadoGex = { estado: 'sin_grupo' | 'pendiente' | 'integrante'; solicitudId?: string };

/**
 * Deja a una persona sin pedido ni grupo (los proyectos de Playwright y los
 * reintentos comparten las filas sembradas): retira el pendiente y, si es
 * integrante, la quita como e2e-admin.
 */
export async function prepararSinGrupo(baseURL: string, email: string): Promise<void> {
  const token = await tokenDe(baseURL, email);
  const estado = (await api(token, 'GET', '/grupos-extension/me')) as EstadoGex & { grupo?: { id: string } };
  if (estado.estado === 'pendiente') await api(token, 'POST', `/solicitudes-grupo-extension/me/${estado.solicitudId}/retirar`);
  if (estado.estado === 'integrante') {
    const admin = await tokenDe(baseURL, 'e2e-admin@example.com');
    await api(admin, 'POST', `/grupos-extension/${estado.grupo!.id}/integrantes/${estado.solicitudId}/quitar`);
  }
}

export { entrarConTema };
