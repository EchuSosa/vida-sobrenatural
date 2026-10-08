import { apiFetch, type CaminoDePersonaAdmin } from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../../auth';
import { EtapasPersonaCliente } from './etapas-persona-cliente';

/**
 * spec 006, T047 (FR-014, FR-015; Historia 2, escenarios 7–9): la sección
 * "Etapas" del Perfil de Persona (IMPLEMENTACION §2.6: las acciones nuevas
 * sobre una Persona van en su sección, no en `personas-cliente.tsx`). Muestra
 * las cuatro etapas con cómo se completó cada una; con
 * `completitud_manual.gestionar` (Admin), "Registrar como hecha" y "Anular".
 * El Pastor la ve en solo lectura. Carga y falla sola (la página la envuelve).
 */
export async function SeccionCamino({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const session = await auth();
  const camino = await apiFetch<CaminoDePersonaAdmin>(`/personas/${encodeURIComponent(personaId)}/camino`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const puedeGestionar = session ? tienePermisoSesion(session, 'completitud_manual.gestionar') : false;
  return <EtapasPersonaCliente personaId={personaId} camino={camino} apiToken={apiToken} puedeGestionar={puedeGestionar} />;
}
