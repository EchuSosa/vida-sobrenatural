import { apiFetch, type MiDisponibilidad } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { MiDisponibilidadCliente } from './mi-disponibilidad-cliente';

/**
 * specs/004, Historia 4 (T039): la agenda, el toggle, el máximo por Grupo y
 * los períodos del propio Discipulador (contracts/disponibilidad-api.md).
 * Server Component: el GET va acá (loading.tsx/error.tsx dan cargando y
 * error); lo interactivo vive en MiDisponibilidadCliente, que recibe cada
 * estado nuevo en la respuesta de su propia acción.
 */
export default async function MiDisponibilidadPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE.
  const session = await requerirPermiso('mi_disponibilidad.ver');
  const disponibilidad = await apiFetch<MiDisponibilidad>('/disponibilidad/me', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });
  return (
    <MiDisponibilidadCliente
      inicial={disponibilidad}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'mi_disponibilidad.gestionar')}
    />
  );
}
