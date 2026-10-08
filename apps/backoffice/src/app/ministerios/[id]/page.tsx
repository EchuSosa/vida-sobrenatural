import { notFound } from 'next/navigation';
import {
  ApiError,
  apiFetch,
  type EliminadoEnPapelera,
  type MiembroMinisterio,
  type MinisterioDetalleCatalogo,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { MinisterioDetalleCliente } from './ministerio-detalle-cliente';

const POR_PAGINA = 20;

/**
 * spec 009, T042 + T054 (FR-026 a FR-030, FR-032, FR-025): el detalle de un
 * Ministerio — sus datos, sus áreas (con su papelera, solo Admin) y quiénes
 * sirven, paginado. Un eliminado o inexistente → `not-found.tsx`.
 */
export default async function MinisterioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string; agregarArea?: string }>;
}) {
  const session = await requerirPermiso('ministerios.ver');
  const [{ id }, { pagina: paginaParam, agregarArea }] = await Promise.all([params, searchParams]);
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  const puedeVerPapelera = tienePermisoSesion(session, 'ministerios.papelera.ver');
  const ruta = `/ministerios/${encodeURIComponent(id)}`;
  let datos: [MinisterioDetalleCatalogo, Pagina<MiembroMinisterio>, EliminadoEnPapelera[]];
  try {
    datos = await Promise.all([
      apiFetch<MinisterioDetalleCatalogo>(ruta, { headers, cache: 'no-store' }),
      apiFetch<Pagina<MiembroMinisterio>>(`${ruta}/miembros?skip=${(pagina - 1) * POR_PAGINA}&take=${POR_PAGINA}`, { headers, cache: 'no-store' }),
      puedeVerPapelera ? apiFetch<EliminadoEnPapelera[]>(`${ruta}/celulas/papelera`, { headers, cache: 'no-store' }) : Promise.resolve([]),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const [ministerio, miembros, papeleraCelulas] = datos;
  return (
    <MinisterioDetalleCliente
      ministerio={ministerio}
      miembros={miembros}
      pagina={pagina}
      porPagina={POR_PAGINA}
      papeleraCelulas={papeleraCelulas}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'ministerios.gestionar')}
      puedeVerPapelera={puedeVerPapelera}
      abrirAgregarArea={agregarArea === '1'}
    />
  );
}
