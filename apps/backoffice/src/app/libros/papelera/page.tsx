import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { apiFetch, type Libro, type Pagina } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';

type ColumnaOrden = 'titulo' | 'autor' | 'eliminadoEn';

/**
 * D119: papelera de Libros, del Admin. H-129/T034: entrar pide
 * `libros.papelera.ver` ANTES de pedir los datos (404 si no lo tiene), y
 * `GET /libros/papelera` exige el mismo permiso en la API (Principio V) —
 * antes la pantalla dejaba entrar al Pastor y la API devolvía la papelera
 * a cualquiera. Restaurar pide `libros.gestionar`. Cualquier otro error de
 * la API cae en error.tsx (reintentar). H-88: orden en la URL, en memoria
 * (D126) — mismo criterio que el resto de los listados chicos.
 */
export default async function PapeleraLibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; dir?: string; q?: string }>;
}) {
  const session = await requerirPermiso('libros.papelera.ver');

  const { orden: ordenParam, dir, q } = await searchParams;
  const ordenColumna: ColumnaOrden =
    ordenParam === 'autor' ? 'autor' : ordenParam === 'eliminadoEn' ? 'eliminadoEn' : 'titulo';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  const pagina = await apiFetch<Pagina<Libro>>('/libros/papelera?take=200', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  const itemsFiltrados = busqueda
    ? pagina.items.filter(
        (libro) => libro.titulo.toLocaleLowerCase('es').includes(busqueda) || libro.autor.toLocaleLowerCase('es').includes(busqueda),
      )
    : pagina.items;
  const librosOrdenados = [...itemsFiltrados].sort((a, b) => {
    const cmp =
      ordenColumna === 'eliminadoEn'
        ? (a.eliminadoEn ?? '').localeCompare(b.eliminadoEn ?? '')
        : a[ordenColumna].localeCompare(b[ordenColumna], 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  return (
    <PapeleraCliente
      libros={librosOrdenados}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'libros.gestionar')}
    />
  );
}
