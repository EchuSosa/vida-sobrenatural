import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { apiFetch, type EdicionAdminResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { tienePermisoSesion } from '../../../auth';
import { EdicionesCliente } from './ediciones-cliente';

const TAMANIO_PAGINA = 20;
const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * spec 008, T019 + T067 (FR-038, FR-039): el listado de ediciones de Vida de
 * Servicio (`/grupos?curso=vida_de_servicio`), paginado de verdad con
 * `estado`, `pendiente` y `pagina` en la URL (H-101). El Admin además ve
 * "Crear una edición"; el Pastor, solo lectura (D64).
 */
export async function ListadoEdiciones({ session, searchParams }: { session: Session; searchParams: { estado?: string; pendiente?: string; pagina?: string } }) {
  const estado = searchParams.estado === 'finalizado' ? 'finalizado' : 'en_curso';
  const pendiente = searchParams.pendiente === 'finalizacion' || searchParams.pendiente === 'baja' ? searchParams.pendiente : null;
  const paginaEsValida = searchParams.pagina === undefined || PAGINA_VALIDA.test(searchParams.pagina);
  const paginaSolicitada = searchParams.pagina && PAGINA_VALIDA.test(searchParams.pagina) ? Number.parseInt(searchParams.pagina, 10) : 1;
  const headers = { Authorization: `Bearer ${session.apiToken}` };

  const query = new URLSearchParams({ estado, skip: String((paginaSolicitada - 1) * TAMANIO_PAGINA), take: String(TAMANIO_PAGINA) });
  if (pendiente) query.set('pendiente', pendiente);
  const puedeGestionar = tienePermisoSesion(session, 'grupos.gestionar');
  const [pagina, sedes, lideres] = await Promise.all([
    apiFetch<Pagina<EdicionAdminResumen>>(`/grupos/vida-de-servicio?${query.toString()}`, { headers, cache: 'no-store' }),
    puedeGestionar ? apiFetch<Array<{ id: string; nombre: string; activo: boolean }>>('/sedes', { headers, cache: 'no-store' }) : Promise.resolve([]),
    puedeGestionar ? apiFetch<Array<{ id: string; nombre: string; apellido: string }>>('/grupos/vida-de-servicio/lideres-disponibles', { headers, cache: 'no-store' }) : Promise.resolve([]),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / TAMANIO_PAGINA));
  if (!paginaEsValida || paginaSolicitada > totalPaginas) {
    const params = new URLSearchParams({ curso: 'vida_de_servicio' });
    if (estado === 'finalizado') params.set('estado', 'finalizado');
    if (pendiente) params.set('pendiente', pendiente);
    const final = Math.min(paginaSolicitada, totalPaginas);
    if (final > 1) params.set('pagina', String(final));
    redirect(`/grupos?${params.toString()}`);
  }

  return (
    <EdicionesCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      estado={estado}
      pendiente={pendiente}
      puedeGestionar={puedeGestionar}
      sedes={sedes.filter((s) => s.activo !== false)}
      lideres={lideres}
      apiToken={session.apiToken}
    />
  );
}
