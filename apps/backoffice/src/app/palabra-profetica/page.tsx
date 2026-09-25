import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { apiFetch, type PalabraProfetica, type Pagina } from '@vida-sobrenatural/shared-types';
import { PalabraProfeticaCliente } from './palabra-profetica-cliente';

type ColumnaOrden = 'anio' | 'titulo' | 'estado' | 'createdAt';

/** El default de cada columna cuando no hay `dir` explícito en la URL — igual que hoy trae la API (createdAt desc, la más nueva primero). */
function direccionDefaultDe(columna: ColumnaOrden): 'asc' | 'desc' {
  return columna === 'createdAt' ? 'desc' : 'asc';
}

/**
 * Historia 3 (specs/003-contenido-institucional, D64): Server Component —
 * GET /palabra-profetica (historial completo, paginado) pasa al servidor.
 * D129 (revisión manual): Admin y Pastor administran los dos. Entrar pide
 * `palabra_profetica.ver` y crear/editar/marcar vigente piden
 * `palabra_profetica.editar` — los dos contra el catálogo (D132, specs/005
 * T035); la API exige el mismo `palabra_profetica.editar` en las escrituras.
 *
 * H-88: orden en la URL. `createdAt` es la única columna con default
 * `desc` (la API ya ordena así, FR-013) — las demás arrancan `asc` cuando
 * se eligen por primera vez, mismo criterio que el resto de los listados.
 */
export default async function PalabraProfeticaPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; dir?: string; q?: string }>;
}) {
  // FR-030: sin `palabra_profetica.ver`, 404 — desde el menú o por URL
  // directa. El GET del historial es público en la API a propósito (la web
  // muestra la vigente), así que la barrera de la PANTALLA es esta.
  const session = await requerirPermiso('palabra_profetica.ver');

  const { orden: ordenParam, dir, q } = await searchParams;
  const ordenColumna: ColumnaOrden =
    ordenParam === 'anio' || ordenParam === 'titulo' || ordenParam === 'estado' ? ordenParam : 'createdAt';
  const ordenDireccion: 'asc' | 'desc' = dir === 'asc' ? 'asc' : dir === 'desc' ? 'desc' : direccionDefaultDe(ordenColumna);
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  const pagina = await apiFetch<Pagina<PalabraProfetica>>('/palabra-profetica?take=100', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  const itemsFiltrados = busqueda ? pagina.items.filter((p) => p.titulo.toLocaleLowerCase('es').includes(busqueda)) : pagina.items;
  const historial = [...itemsFiltrados].sort((a, b) => {
    const cmp =
      ordenColumna === 'anio'
        ? a.anio - b.anio
        : ordenColumna === 'estado'
          ? Number(a.vigente) - Number(b.vigente)
          : ordenColumna === 'createdAt'
            ? a.createdAt.localeCompare(b.createdAt)
            : a.titulo.localeCompare(b.titulo, 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  // D129: nombrado por lo que significa (puede crear/editar/marcar vigente),
  // no por el rol — y resuelto contra el catálogo, así que quién puede lo
  // decide `palabra_profetica.editar` en un solo lugar para la API y acá.
  const puedeAdministrarPalabraProfetica = tienePermisoSesion(session, 'palabra_profetica.editar');

  return (
    <PalabraProfeticaCliente
      historial={historial}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
      puedeAdministrarPalabraProfetica={puedeAdministrarPalabraProfetica}
    />
  );
}
