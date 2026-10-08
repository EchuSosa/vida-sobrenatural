import { apiFetch, type CursoEnPapelera } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { PapeleraCursosCliente } from './papelera-cliente';

/** spec 013, Historia 6 (T074, FR-055): los Cursos eliminados, para recuperarlos. */
export default async function PapeleraCursosPage() {
  const session = await requerirPermiso('cursos.papelera.ver');
  const cursos = await apiFetch<CursoEnPapelera[]>('/cursos/papelera', { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  return <PapeleraCursosCliente cursos={cursos} apiToken={session.apiToken} puedeGestionar={tienePermisoSesion(session, 'cursos.gestionar')} />;
}
