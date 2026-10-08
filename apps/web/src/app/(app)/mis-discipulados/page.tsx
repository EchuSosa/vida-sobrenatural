import { apiFetch } from '@vida-sobrenatural/shared-types';
import type { MisDiscipuladosRespuesta } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { MisDiscipuladosCliente } from './mis-discipulados-cliente';
import { SelectorMiCamino } from '../mi-camino/selector-mi-camino';

/**
 * specs/004, T037e/T046 (D134, FR-037, FR-046, FR-047): el escritorio del
 * Discipulador, diseñado a 360 px primero. Server Component: el GET va en el
 * servidor; "cargando" es loading.tsx y "error" es error.tsx.
 */
export default async function MisDiscipuladosPage() {
  // spec 006 (FR-024): sin el permiso, vuelve a Mi camino sin ver datos.
  const session = await requerirPermiso('mis_discipulados.ver');
  const datos = await apiFetch<MisDiscipuladosRespuesta>('/discipulado/mis-discipulados', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  return (
    <MisDiscipuladosCliente
      datos={datos}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'mis_discipulados.gestionar')}
      puedeCrearEnNombre={tienePermisoSesion(session, 'solicitudes.crear_en_nombre')}
      selector={<SelectorMiCamino actual="/mis-discipulados" />}
    />
  );
}
