import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type SolicitudVidaServicioDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { SolicitudVsDetalleCliente } from './solicitud-vs-detalle-cliente';

/**
 * spec 008, T032 (FR-015 a FR-018): el detalle de un pedido de Vida de
 * Servicio en la bandeja. Con `solicitudes.aprobar` (Admin): "Aprobar
 * inscripción" eligiendo edición (principal) y "Rechazar" con motivo
 * opcional. El Pastor (`solicitudes.ver`) lo ve sin acciones.
 */
export default async function SolicitudVsDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  let solicitud: SolicitudVidaServicioDetalle;
  try {
    solicitud = await apiFetch<SolicitudVidaServicioDetalle>(`/vida-de-servicio/solicitudes/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return (
    <SolicitudVsDetalleCliente
      solicitud={solicitud}
      apiToken={session.apiToken}
      puedeResolver={tienePermisoSesion(session, 'solicitudes.aprobar')}
      puedeVerGrupos={tienePermisoSesion(session, 'grupos.ver')}
    />
  );
}
