import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { apiFetch, type CursoListado } from '@vida-sobrenatural/shared-types';
import { CursosCliente } from './cursos-cliente';

/**
 * spec 013, Historia 6 (T074, FR-051): el catálogo de Cursos. Pocos
 * registros (los fija el código): sin paginar ni buscar (`docs/15`). Filtro
 * Activos/Todos en la URL. El Pastor lo ve sin acciones (D64).
 */
export default async function CursosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const session = await requerirPermiso('catalogos.ver');
  const { estado } = await searchParams;
  const todos = estado === 'todos';
  const cursos = await apiFetch<CursoListado[]>(`/cursos${todos ? '?incluirInactivos=true' : ''}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  return (
    <CursosCliente
      cursos={cursos}
      todos={todos}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'cursos.gestionar')}
      vePapelera={tienePermisoSesion(session, 'cursos.papelera.ver')}
    />
  );
}
