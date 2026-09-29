import { redirect } from 'next/navigation';
import { apiFetch, type DiscipuladoResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../auth';
import { GruposCliente } from './grupos-cliente';
import { FILTROS_PENDIENTE, TAMANIO_PAGINA, type FiltroPendiente } from './constantes';

const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * specs/004, T047 (D134): la vista administrativa de los discipulados, para
 * Admin y Pastor, sin notas. Listado paginado de verdad (H-101): `estado`,
 * `pendiente`, `dir` y `pagina` viajan en la URL; `?pagina=` inválido o más
 * allá de la última cae en la página válida más cercana con un redirect
 * (mismo criterio que pendientes-tutor).
 */
export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pendiente?: string; dir?: string; pagina?: string }>;
}) {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE.
  const session = await requerirPermiso('grupos.ver');
  const { estado: estadoParam, pendiente: pendienteParam, dir: dirParam, pagina: paginaParam } = await searchParams;
  const estado = estadoParam === 'finalizado' ? 'finalizado' : 'en_curso';
  const pendiente = FILTROS_PENDIENTE.includes(pendienteParam as FiltroPendiente) ? (pendienteParam as FiltroPendiente) : null;
  const dir = dirParam === 'asc' ? 'asc' : 'desc';
  const paginaEsValida = paginaParam === undefined || PAGINA_VALIDA.test(paginaParam);
  const paginaSolicitada = paginaParam !== undefined && PAGINA_VALIDA.test(paginaParam) ? Number.parseInt(paginaParam, 10) : 1;

  const query = new URLSearchParams({ estado, dir, skip: String((paginaSolicitada - 1) * TAMANIO_PAGINA), take: String(TAMANIO_PAGINA) });
  if (pendiente) query.set('pendiente', pendiente);
  const pagina = await apiFetch<Pagina<DiscipuladoResumen>>(`/grupos/discipulados?${query.toString()}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / TAMANIO_PAGINA));
  if (!paginaEsValida || paginaSolicitada > totalPaginas) {
    const params = new URLSearchParams();
    if (estadoParam === 'finalizado') params.set('estado', 'finalizado');
    if (pendiente) params.set('pendiente', pendiente);
    if (dirParam === 'asc') params.set('dir', 'asc');
    const final = Math.min(paginaSolicitada, totalPaginas);
    if (final > 1) params.set('pagina', String(final));
    const q = params.toString();
    redirect(q ? `/grupos?${q}` : '/grupos');
  }

  return (
    <GruposCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      estado={estado}
      pendiente={pendiente}
      orden={{ columna: 'desde', direccion: dir }}
    />
  );
}
