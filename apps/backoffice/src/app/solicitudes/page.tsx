import { redirect } from 'next/navigation';
import { apiFetch, PERMISO_EXTRA_POR_TIPO, type ConteoAbiertas, type Pagina, type SolicitudBandeja, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { SolicitudesCliente } from './solicitudes-cliente';
import { TAMANIO_PAGINA, leerVistaBandeja, parametrosApi, urlBandeja, type ParametrosBandeja } from './constantes';

const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * spec 013, Historia 1 (T024): la bandeja unificada de Solicitudes — todos los
 * tipos conectados en una tabla, por defecto lo abierto y lo que más espera
 * arriba (FR-001–FR-006). Generaliza la bandeja de Discipulado de la 004 con
 * el patrón de listado paginado de H-101: filtros, búsqueda, orden y página
 * en la URL, resueltos por la API. Los tipos conectados salen de
 * `conteo-abiertas` (FR-007: un tipo nuevo aparece sin tocar esta pantalla).
 * La bandeja no resuelve nada: cada fila lleva al detalle de su tipo. El
 * Pastor la ve igual (D64).
 */
export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosBandeja & { q?: string; pagina?: string }>;
}) {
  const session = await requerirPermiso('solicitudes.ver');
  const params = await searchParams;
  const buscar = (params.q ?? '').trim();
  const headers = { Authorization: `Bearer ${session.apiToken}` };

  const conteo = await apiFetch<ConteoAbiertas>('/solicitudes/conteo-abiertas', { headers, cache: 'no-store' });
  // D216: la API ya omite los tipos que esta sesión no puede ver; el filtro de tipo se arma igual con la misma regla.
  const conectados = (Object.keys(conteo) as TipoSolicitud[]).filter((tipo) => {
    const permiso = PERMISO_EXTRA_POR_TIPO[tipo];
    return permiso === undefined || tienePermisoSesion(session, permiso);
  });
  const { vista, corregida } = leerVistaBandeja(params, conectados);

  const paginaEsTextoValido = params.pagina === undefined || PAGINA_VALIDA.test(params.pagina);
  const paginaSolicitada = params.pagina !== undefined && paginaEsTextoValido ? Number.parseInt(params.pagina, 10) : 1;
  if (corregida) redirect(urlBandeja(vista, buscar, paginaSolicitada, conectados));

  const pagina = await apiFetch<Pagina<SolicitudBandeja>>(`/solicitudes?${parametrosApi(vista, buscar, (paginaSolicitada - 1) * TAMANIO_PAGINA)}`, {
    headers,
    cache: 'no-store',
  });

  // H-101: una página inválida o fuera de rango cae en la válida más cercana, con redirect real.
  const totalPaginas = Math.max(1, Math.ceil(pagina.total / TAMANIO_PAGINA));
  if (!paginaEsTextoValido || paginaSolicitada > totalPaginas) {
    redirect(urlBandeja(vista, buscar, Math.min(paginaSolicitada, totalPaginas), conectados));
  }

  return (
    <SolicitudesCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      vista={vista}
      conectados={conectados}
      apiToken={session.apiToken}
      puedeCrearEnNombre={tienePermisoSesion(session, 'solicitudes.crear_en_nombre')}
    />
  );
}
