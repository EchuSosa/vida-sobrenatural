import { apiFetch, type MinisterioCatalogo } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { MinisteriosCliente } from './ministerios-cliente';

/**
 * spec 009, T041 (FR-026, FR-031, FR-033): el catálogo de Ministerios. Server
 * Component: `loading.tsx`/`error.tsx` dan cargando y error. Filtro activos /
 * todos y búsqueda por nombre en la URL (D117, D126); la búsqueda la hace la
 * API (nombre normalizado, sin tildes). El Pastor lo ve sin acciones (FR-023).
 */
export default async function MinisteriosPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const session = await requerirPermiso('ministerios.ver');
  const { estado, q } = await searchParams;
  const filtro = estado === 'todos' ? 'todos' : 'activos';
  const busqueda = (q ?? '').trim();
  const ministerios = await apiFetch<MinisterioCatalogo[]>(
    `/ministerios?estado=${filtro}${busqueda ? `&buscar=${encodeURIComponent(busqueda)}` : ''}`,
    { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' },
  );
  return (
    <MinisteriosCliente
      ministerios={ministerios}
      filtro={filtro}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'ministerios.gestionar')}
      puedeAbrirPapelera={tienePermisoSesion(session, 'ministerios.papelera.ver')}
    />
  );
}
