import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type PostulacionDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { PostulacionDetalleCliente } from './postulacion-detalle-cliente';

/**
 * spec 009, T028 (FR-016, FR-017, FR-019, FR-021, FR-023): el detalle de una
 * Postulación en la bandeja. Con `solicitudes.aprobar` (Admin): "Aprobar"
 * (principal) y "Rechazar". El Pastor (`solicitudes.ver`) la ve sin acciones
 * ni motivos internos (la API ya no se los manda).
 */
export default async function PostulacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  let postulacion: PostulacionDetalle;
  try {
    postulacion = await apiFetch<PostulacionDetalle>(`/postulaciones/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return (
    <PostulacionDetalleCliente
      postulacion={postulacion}
      apiToken={session.apiToken}
      puedeResolver={tienePermisoSesion(session, 'solicitudes.aprobar')}
    />
  );
}
