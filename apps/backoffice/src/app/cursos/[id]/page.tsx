import { notFound } from 'next/navigation';
import { ApiError, apiFetch, type CursoDetalle } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { CursoDetalleCliente } from './curso-detalle-cliente';

/** spec 013, Historia 6 (T074, FR-052–FR-055): un Curso — editar, inactivar, reactivar, eliminar. */
export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('catalogos.ver');
  const { id } = await params;
  let curso: CursoDetalle;
  try {
    curso = await apiFetch<CursoDetalle>(`/cursos/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return <CursoDetalleCliente curso={curso} apiToken={session.apiToken} puedeGestionar={tienePermisoSesion(session, 'cursos.gestionar')} />;
}
