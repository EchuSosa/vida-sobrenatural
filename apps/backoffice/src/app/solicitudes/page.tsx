import { redirect } from 'next/navigation';
import { apiFetch, type Pagina, type SolicitudResumen } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { SolicitudesCliente } from './solicitudes-cliente';
import { FILTROS_ESTADO, ORDENES, TAMANIO_PAGINA, estadosDelFiltro, type FiltroEstado, type OrdenBandeja } from './constantes';

const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * specs/004, Historia 3 (T027): la bandeja genérica de Solicitudes (FR-025),
 * con el patrón de listado paginado de H-101 (pendientes-tutor): página,
 * búsqueda, estado y orden en la URL, resueltos por la API. Sin filtro por
 * tipo: hay uno solo conectado. El Pastor la ve sin acciones (D64).
 */
export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; orden?: string; dir?: string; pagina?: string }>;
}) {
  const session = await requerirPermiso('solicitudes.ver');
  const { q, estado: estadoParam, orden: ordenParam, dir, pagina: paginaParam } = await searchParams;
  const buscar = (q ?? '').trim();
  const filtro: FiltroEstado = FILTROS_ESTADO.includes(estadoParam as FiltroEstado) ? (estadoParam as FiltroEstado) : 'abiertas';
  const orden: OrdenBandeja = ORDENES.includes(ordenParam as OrdenBandeja) ? (ordenParam as OrdenBandeja) : 'fecha';
  const direccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';

  const paginaEsTextoValido = paginaParam === undefined || PAGINA_VALIDA.test(paginaParam);
  const paginaSolicitada = paginaParam !== undefined && paginaEsTextoValido ? Number.parseInt(paginaParam, 10) : 1;
  const skip = (paginaSolicitada - 1) * TAMANIO_PAGINA;

  const params = new URLSearchParams({
    estado: estadosDelFiltro(filtro).join(','),
    orden,
    dir: direccion,
    skip: String(skip),
    take: String(TAMANIO_PAGINA),
  });
  if (buscar) params.set('buscar', buscar);
  const pagina = await apiFetch<Pagina<SolicitudResumen>>(`/solicitudes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });

  // H-101: una página inválida o fuera de rango cae en la válida más cercana, con redirect real.
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / TAMANIO_PAGINA));
  if (!paginaEsTextoValido || paginaSolicitada > totalPaginas) {
    const corregidos = new URLSearchParams();
    if (buscar) corregidos.set('q', buscar);
    if (estadoParam) corregidos.set('estado', estadoParam);
    if (ordenParam) corregidos.set('orden', ordenParam);
    if (dir) corregidos.set('dir', dir);
    const paginaFinal = Math.min(paginaSolicitada, totalPaginas);
    if (paginaFinal > 1) corregidos.set('pagina', String(paginaFinal));
    const query = corregidos.toString();
    redirect(query ? `/solicitudes?${query}` : '/solicitudes');
  }

  return (
    <SolicitudesCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      filtro={filtro}
      orden={{ columna: orden, direccion }}
      apiToken={session.apiToken}
      puedeCrearEnNombre={tienePermisoSesion(session, 'solicitudes.crear_en_nombre')}
    />
  );
}
