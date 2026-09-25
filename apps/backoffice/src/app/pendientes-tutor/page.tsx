import { redirect } from 'next/navigation';
import { requerirPermiso } from '../../auth';
import { apiFetch, type Pagina, type PersonaPendienteTutor } from '@vida-sobrenatural/shared-types';
import { PendientesTutorCliente } from './pendientes-tutor-cliente';
import { TAMANIO_PAGINA } from './constantes';

type ColumnaOrden = 'nombre' | 'createdAt';

const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * H-29 (revisión manual, actualización 2026-09-20, D94/D102/D108): activar
 * y cerrar el caso (H-70) pasan del alert/prompt/confirm nativo del
 * navegador al sistema de diseño. H-60/H-43 (ronda 7): Server Component —
 * el primer GET /personas/pendientes-tutor pasa al servidor.
 *
 * Cierre de H-101 (antes de la spec 004, D-paginado): "Cargar más" queda
 * reemplazado por páginas numeradas, `pagina` (1-based, lo que ve la
 * persona) viaja en la URL igual que `q`/`orden`/`dir` — ya no hay ninguna
 * isla de cliente que traiga datos (ver el comentario de
 * pendientes-tutor-cliente.tsx). `skip` (lo que espera la API) sale de acá:
 * `(pagina - 1) * TAMANIO_PAGINA`.
 *
 * `?pagina=` inválido (ausente, "0", negativo, no numérico) o más allá de
 * la última página real (un link viejo, o esta misma página quedándose sin
 * casos después de Activar/Cerrar — ver pendientes-tutor-cliente.tsx) no
 * da un 404: cae en la página válida más cercana (1, o la última), y la
 * URL se corrige con un redirect real — no solo el contenido — para que un
 * F5 después siga mostrando lo mismo y un link compartido apunte a algo
 * que existe. "Más amable que un 404", decisión explícita, no un default
 * accidental.
 *
 * H-88 (D126): `q` filtra en la API (`buscar`), no en memoria — esta cola
 * pagina de verdad (a diferencia de Sedes/Libros/Palabra Profética), así
 * que la pantalla solo ve una página a la vez y filtrar acá no alcanzaría.
 * `orden`/`dir` viajan igual, por el mismo motivo — ordenar la página ya
 * cargada (en memoria) daría un orden roto en cuanto hubiera una segunda
 * página. Default `createdAt` (el orden de siempre, "cola") si no hay nada
 * explícito en la URL. Cambiar `q` o el orden vuelve a la página 1 —
 * resuelto en pendientes-tutor-cliente.tsx (onOrdenar, useControlesTablaUrl
 * con `clavesAReiniciarConBusqueda`), no acá: si no, buscar algo con 3
 * resultados estando en la página 4 mostraría vacío en vez de reiniciar.
 */
export default async function PendientesTutorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string; dir?: string; pagina?: string }>;
}) {
  // H-132: antes solo pedía sesión — cualquier Persona logueada entraba por
  // URL a una lista de menores con sus datos de contacto.
  const session = await requerirPermiso('pendientes_tutor.ver');
  const { q, orden: ordenParam, dir, pagina: paginaParam } = await searchParams;
  const buscar = (q ?? '').trim();
  const ordenColumna: ColumnaOrden = ordenParam === 'nombre' ? 'nombre' : 'createdAt';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';

  const paginaEsTextoValido = paginaParam === undefined || PAGINA_VALIDA.test(paginaParam);
  const paginaSolicitada = paginaParam !== undefined && PAGINA_VALIDA.test(paginaParam) ? Number.parseInt(paginaParam, 10) : 1;

  const skip = (paginaSolicitada - 1) * TAMANIO_PAGINA;
  const pagina = await apiFetch<Pagina<PersonaPendienteTutor>>(
    `/personas/pendientes-tutor?skip=${skip}&take=${TAMANIO_PAGINA}&orden=${ordenColumna}&dir=${ordenDireccion}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`,
    { headers: { Authorization: `Bearer ${session.apiToken}` } },
  );

  const totalPaginas = Math.max(1, Math.ceil(pagina.total / TAMANIO_PAGINA));
  const necesitaCorregirUrl = (paginaParam !== undefined && !paginaEsTextoValido) || paginaSolicitada > totalPaginas;

  if (necesitaCorregirUrl) {
    const paginaFinal = Math.min(paginaSolicitada, totalPaginas);
    const params = new URLSearchParams();
    if (buscar) params.set('q', buscar);
    if (ordenParam) params.set('orden', ordenParam);
    if (dir) params.set('dir', dir);
    if (paginaFinal > 1) params.set('pagina', String(paginaFinal));
    const query = params.toString();
    redirect(query ? `/pendientes-tutor?${query}` : '/pendientes-tutor');
  }

  return (
    <PendientesTutorCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      apiToken={session.apiToken}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
    />
  );
}
