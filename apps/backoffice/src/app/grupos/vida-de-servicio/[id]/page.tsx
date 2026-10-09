import { notFound } from 'next/navigation';
import { ApiError, apiFetch, type EdicionAdminDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { DetalleEdicionCliente } from './detalle-edicion-cliente';

/**
 * spec 008, T020 + T059 + T061 + T063 (FR-004 a FR-006, FR-033, FR-036,
 * FR-038): el detalle de una edición en el backoffice. Con `grupos.gestionar`
 * (Admin): cronograma, Líderes, inscripción, bajas y cierre. El Pastor
 * (`grupos.ver`) lo ve todo sin ningún control de gestión (D64).
 */
export default async function DetalleEdicionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('grupos.ver');
  const { id } = await params;
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let edicion: EdicionAdminDetalle;
  try {
    edicion = await apiFetch<EdicionAdminDetalle>(`/grupos/vida-de-servicio/${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'GRUPO_NO_ENCONTRADO') notFound();
    throw e;
  }
  const puedeGestionar = tienePermisoSesion(session, 'grupos.gestionar') && edicion.estado === 'en_curso';
  const lideres = puedeGestionar
    ? await apiFetch<Array<{ id: string; nombre: string; apellido: string }>>('/grupos/vida-de-servicio/lideres-disponibles', { headers, cache: 'no-store' })
    : [];
  return <DetalleEdicionCliente edicion={edicion} apiToken={session.apiToken} puedeGestionar={puedeGestionar} lideresDisponibles={lideres} />;
}
