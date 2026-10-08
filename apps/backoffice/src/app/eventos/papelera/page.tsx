import { apiFetch, type EventoResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { PapeleraEventosCliente } from './papelera-cliente';

/**
 * spec 011, T038 — papelera de Eventos (D119, FR-042), patrón de
 * `sedes/papelera`. Entrar pide `eventos.papelera.ver`; restaurar,
 * `eventos.gestionar`.
 */
export default async function PapeleraEventosPage() {
  const session = await requerirPermiso('eventos.papelera.ver');
  const eventos = await apiFetch<Pagina<EventoResumen>>('/eventos/papelera?take=100', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });
  return (
    <PapeleraEventosCliente eventos={eventos.items} apiToken={session.apiToken} puedeGestionar={tienePermisoSesion(session, 'eventos.gestionar')} />
  );
}
