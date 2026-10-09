import { apiFetch, type GrupoExtensionResumen } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { GruposExtensionCliente } from './grupos-extension-cliente';

/**
 * spec 014 (D221): Backoffice › Grupos de extensión. Server Component:
 * `loading.tsx`/`error.tsx` dan cargando y error; el filtro activos/todos va en
 * la URL. El Pastor ve sin acciones (D142).
 */
export default async function GruposExtensionPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const session = await requerirPermiso('grupos_extension.ver');
  const { estado } = await searchParams;
  const filtro = estado === 'todos' ? 'todos' : 'activos';
  const grupos = await apiFetch<GrupoExtensionResumen[]>(`/grupos-extension?estado=${filtro}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  return <GruposExtensionCliente grupos={grupos} filtro={filtro} puedeGestionar={tienePermisoSesion(session, 'grupos_extension.gestionar')} />;
}
