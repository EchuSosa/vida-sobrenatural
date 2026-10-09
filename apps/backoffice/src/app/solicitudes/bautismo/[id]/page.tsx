import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type EventoDeBautismoResumen, type SolicitudBautismoDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { DetalleBautismoCliente } from './detalle-bautismo-cliente';

/**
 * spec 010, T029 y T037 (FR-007 a FR-011, FR-012, FR-015): el detalle de una
 * Solicitud de Bautismo en la bandeja. Con `solicitudes.aprobar` (Admin):
 * "Aceptar" (con fecha opcional) y "Rechazar"; ya aceptada, asignar a un
 * Evento de bautismo o quitarla de su fecha. El Pastor lo ve sin acciones.
 */
export default async function DetalleBautismoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let solicitud: SolicitudBautismoDetalle;
  try {
    solicitud = await apiFetch<SolicitudBautismoDetalle>(`/bautismo/solicitudes/${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const puedeResolver = tienePermisoSesion(session, 'solicitudes.aprobar');
  const necesitaFechas = puedeResolver && (solicitud.estado === 'pendiente' || (solicitud.estado === 'aprobada' && !solicitud.evento));
  const eventos = necesitaFechas ? await apiFetch<EventoDeBautismoResumen[]>('/bautismo/eventos', { headers, cache: 'no-store' }) : [];
  return (
    <DetalleBautismoCliente
      solicitud={solicitud}
      eventos={eventos}
      apiToken={session.apiToken}
      puedeResolver={puedeResolver}
      puedeCrearEventos={tienePermisoSesion(session, 'eventos.gestionar')}
    />
  );
}
