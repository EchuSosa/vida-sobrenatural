import { apiFetch, FILTROS_EVENTOS, type EventoResumen, type FiltroEventos, type Pagina } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { EventosCliente } from './eventos-cliente';

const POR_PAGINA = 20;

/**
 * spec 011, T029 — listado de Eventos del backoffice (FR-009). Server
 * Component: filtro, tipo, búsqueda, orden y página viven en la URL y la API
 * pagina de verdad (H-42). `eventos.ver` para entrar (Admin y Pastor);
 * `eventos.gestionar` para crear (solo Admin). Cargando → loading.tsx; error
 * → error.tsx.
 */
export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; tipo?: string; q?: string; orden?: string; dir?: string; pagina?: string }>;
}) {
  const session = await requerirPermiso('eventos.ver');
  const params = await searchParams;
  const filtro: FiltroEventos = FILTROS_EVENTOS.includes(params.filtro as FiltroEventos) ? (params.filtro as FiltroEventos) : 'proximos';
  const tipo = params.tipo === 'general' || params.tipo === 'bautismo' ? params.tipo : '';
  const orden = params.orden === 'nombre' ? 'nombre' : 'inicio';
  const dir = params.dir === 'asc' || params.dir === 'desc' ? params.dir : undefined;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const q = (params.q ?? '').trim();

  const query = new URLSearchParams({ filtro, orden, skip: String((pagina - 1) * POR_PAGINA), take: String(POR_PAGINA) });
  if (tipo) query.set('tipo', tipo);
  if (dir) query.set('dir', dir);
  if (q) query.set('buscar', q);
  const resultado = await apiFetch<Pagina<EventoResumen>>(`/eventos?${query}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  return (
    <EventosCliente
      eventos={resultado.items}
      total={resultado.total}
      pagina={pagina}
      totalPaginas={Math.max(1, Math.ceil(resultado.total / POR_PAGINA))}
      filtro={filtro}
      tipo={tipo}
      orden={{ columna: orden === 'nombre' ? 'nombre' : 'fecha', direccion: dir ?? (orden === 'nombre' || filtro === 'proximos' ? 'asc' : 'desc') }}
      puedeGestionar={tienePermisoSesion(session, 'eventos.gestionar')}
      puedeAbrirPapelera={tienePermisoSesion(session, 'eventos.papelera.ver')}
    />
  );
}
