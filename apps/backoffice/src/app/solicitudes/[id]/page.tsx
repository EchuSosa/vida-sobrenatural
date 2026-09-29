import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type Cruce, type SolicitudDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { SolicitudDetalleCliente } from './solicitud-detalle-cliente';

/**
 * specs/004, Historia 3 (T027a): el detalle de una Solicitud. Con
 * `solicitudes.aprobar` (Admin), el cruce (si está pendiente), proponer,
 * rechazar, retirar la propuesta y el historial (FR-038). El Pastor
 * (`solicitudes.ver`) ve los datos y los horarios, sin acciones ni historial.
 */
export default async function SolicitudDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let solicitud: SolicitudDetalle;
  try {
    solicitud = await apiFetch<SolicitudDetalle>(`/discipulado/solicitudes/${id}`, { headers, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }

  const puedeAprobar = tienePermisoSesion(session, 'solicitudes.aprobar');
  const cruce =
    puedeAprobar && solicitud.estado === 'pendiente'
      ? await apiFetch<Cruce>(`/discipulado/solicitudes/${id}/cruce`, { headers, cache: 'no-store' })
      : null;

  return <SolicitudDetalleCliente solicitud={solicitud} cruce={cruce} apiToken={session.apiToken} puedeAprobar={puedeAprobar} />;
}
