import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type DetalleEleccionAdmin } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { EleccionDetalleCliente } from './eleccion-detalle-cliente';

/**
 * spec 015 (D242): el detalle de una elección de ministerio en la bandeja.
 * Con `solicitudes.aprobar` (Admin): "Confirmar" y "No por ahora" por área,
 * y las notas de la charla. El Pastor (`solicitudes.ver`) la ve sin notas
 * (la API no se las manda, D240) ni acciones.
 */
export default async function EleccionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  let eleccion: DetalleEleccionAdmin;
  try {
    eleccion = await apiFetch<DetalleEleccionAdmin>(`/elecciones-ministerio/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return <EleccionDetalleCliente eleccion={eleccion} apiToken={session.apiToken} puedeResolver={tienePermisoSesion(session, 'solicitudes.aprobar')} />;
}
