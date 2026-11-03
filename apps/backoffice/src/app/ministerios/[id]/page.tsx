import { notFound } from 'next/navigation';
import {
  ApiError,
  apiFetch,
  type DiasDeServicioDelMinisterio,
  type GrillaDeTurnos,
  type LiderMinisterioVista,
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
  const puedeVerTurnos = tienePermisoSesion(session, 'turnos.ver');
  const ruta = `/ministerios/${encodeURIComponent(id)}`;
  let datos: [MinisterioDetalleCatalogo, Pagina<MiembroMinisterio>, EliminadoEnPapelera[], LiderMinisterioVista[], DiasDeServicioDelMinisterio | null, GrillaDeTurnos | null];
  try {
    datos = await Promise.all([
      apiFetch<MinisterioDetalleCatalogo>(ruta, { headers, cache: 'no-store' }),
      apiFetch<Pagina<MiembroMinisterio>>(`${ruta}/miembros?skip=${(pagina - 1) * POR_PAGINA}&take=${POR_PAGINA}`, { headers, cache: 'no-store' }),
      puedeVerPapelera ? apiFetch<EliminadoEnPapelera[]>(`${ruta}/celulas/papelera`, { headers, cache: 'no-store' }) : Promise.resolve([]),
      // spec 016 (D244): los líderes vigentes, con la fecha.
      apiFetch<LiderMinisterioVista[]>(`${ruta}/lideres`, { headers, cache: 'no-store' }),
      // spec 017, US1 (D250, D251, D253): días de servicio y cupos — Admin y Pastor.
      puedeVerTurnos ? apiFetch<DiasDeServicioDelMinisterio>(`${ruta}/dias-de-servicio`, { headers, cache: 'no-store' }) : Promise.resolve(null),
      // spec 017, US2-8: la grilla de turnos (solo de un Ministerio activo: si no, la API da 404 y no se muestra).
      puedeVerTurnos
        ? apiFetch<GrillaDeTurnos>(`${ruta}/turnos`, { headers, cache: 'no-store' }).catch((e: unknown) => {
            if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') return null;
            throw e;
          })
        : Promise.resolve(null),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const [ministerio, miembros, papeleraCelulas, lideres, diasDeServicio, grillaTurnos] = datos;
  return (
    <MinisterioDetalleCliente
      ministerio={ministerio}
      miembros={miembros}
      pagina={pagina}
      porPagina={POR_PAGINA}
      papeleraCelulas={papeleraCelulas}
      lideres={lideres}
      diasDeServicio={diasDeServicio}
      grillaTurnos={grillaTurnos}
      puedeGestionarTurnos={tienePermisoSesion(session, 'turnos.gestionar')}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'ministerios.gestionar')}
      puedeVerPapelera={puedeVerPapelera}
      abrirAgregarArea={agregarArea === '1'}
    />
  );
}
