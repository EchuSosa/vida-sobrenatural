import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type DeclaracionDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { DeclaracionDetalleCliente } from './declaracion-detalle-cliente';

/**
 * spec 006, T046 (FR-013): el detalle de un "Ya lo hice" en la bandeja. Con
 * `historial.resolver` (Admin): "Confirmar" (principal) y "No confirmar" con
 * motivo opcional. El Pastor (`solicitudes.ver`) lo ve sin acciones.
 */
export default async function DeclaracionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  let declaracion: DeclaracionDetalle;
  try {
    declaracion = await apiFetch<DeclaracionDetalle>(`/historial/declaraciones/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return (
    <DeclaracionDetalleCliente
      declaracion={declaracion}
      apiToken={session.apiToken}
      puedeResolver={tienePermisoSesion(session, 'historial.resolver')}
    />
  );
}
