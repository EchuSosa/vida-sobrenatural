import { apiFetch, type EliminadoEnPapelera } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { PapeleraMinisteriosCliente } from './papelera-cliente';

/** spec 009, T043 (FR-030, D119, H-129): los Ministerios eliminados, con fecha y quién; "Restaurar". Solo Admin. */
export default async function PapeleraMinisteriosPage() {
  const session = await requerirPermiso('ministerios.papelera.ver');
  const eliminados = await apiFetch<EliminadoEnPapelera[]>('/ministerios/papelera', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  return <PapeleraMinisteriosCliente eliminados={eliminados} apiToken={session.apiToken} puedeRestaurar={tienePermisoSesion(session, 'ministerios.gestionar')} />;
}
