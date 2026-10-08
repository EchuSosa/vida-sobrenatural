import { redirect } from 'next/navigation';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { apiFetch, type Pagina, type PersonaListado } from '@vida-sobrenatural/shared-types';
import { PersonasCliente } from './personas-cliente';
import { TAMANIO_PAGINA } from './constantes';

type ColumnaOrden = 'apellido' | 'nombre';

const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * specs/005-roles-permisos-acceso, Historia 2 (T027): encontrar a una Persona
 * y ver sus roles de cargo; el Admin, además, otorgarlos o quitarlos
 * (personas-cliente.tsx). No es todavía la vista unificada de Flujo 9.
 *
 * Nace con el patrón de listado paginado (docs/15-guia-ux-ui.md, "Listados
 * paginados", H-101) — Personas es el listado que más va a crecer: página,
 * búsqueda y orden en la URL y resueltos por la API (GET /personas), nunca
 * en memoria. Mismo esquema que pendientes-tutor/page.tsx, incluido el
 * redirect de un `?pagina=` inválido o fuera de rango a la página válida
 * más cercana.
 *
 * `soloMayores=true` — FR-024, y es esta pantalla la que lo pide, no el
 * endpoint el que lo impone: es la COMODIDAD de no listar a alguien a quien
 * no se va a poder ascender. La GARANTÍA es FR-011, en la API
 * (RolesService.otorgarRol rechaza a un menor venga el pedido por donde
 * venga); sacar este parámetro no desprotege nada. La pantalla lo dice en
 * su descripción, para que no parezca que falta gente.
 */
export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string; dir?: string; pagina?: string }>;
}) {
  const session = await requerirPermiso('personas.ver');
  const { q, orden: ordenParam, dir, pagina: paginaParam } = await searchParams;
  const buscar = (q ?? '').trim();
  const ordenColumna: ColumnaOrden = ordenParam === 'nombre' ? 'nombre' : 'apellido';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';

  const paginaEsTextoValido = paginaParam === undefined || PAGINA_VALIDA.test(paginaParam);
  const paginaSolicitada = paginaParam !== undefined && PAGINA_VALIDA.test(paginaParam) ? Number.parseInt(paginaParam, 10) : 1;

  const skip = (paginaSolicitada - 1) * TAMANIO_PAGINA;
  const pagina = await apiFetch<Pagina<PersonaListado>>(
    `/personas?skip=${skip}&take=${TAMANIO_PAGINA}&orden=${ordenColumna}&dir=${ordenDireccion}&soloMayores=true${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`,
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
    redirect(query ? `/personas?${query}` : '/personas');
  }

  return (
    <PersonasCliente
      pagina={pagina}
      paginaActual={paginaSolicitada}
      totalPaginas={totalPaginas}
      apiToken={session.apiToken}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      // T028: qué mostrar se decide leyendo el catálogo (D132), nunca un
      // `rol.includes('admin')` — la API vuelve a chequear el mismo permiso.
      puedeGestionarRoles={tienePermisoSesion(session, 'personas.gestionar_roles')}
      puedeDarDeAlta={tienePermisoSesion(session, 'personas.alta')}
      puedeEditarEmail={tienePermisoSesion(session, 'personas.editar_email')}
    />
  );
}
