import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { apiFetch, type Libro, type Pagina } from '@vida-sobrenatural/shared-types';
import { LibrosCliente } from './libros-cliente';

type Filtro = 'activas' | 'todas';
// 'orden' = el orden manual (H-89, drag/mover) que ya devuelve la API por
// default — no es una columna que el Admin elija, es la ausencia de
// override. Las demás sí son columnas reales (H-88).
type ColumnaOrden = 'orden' | 'titulo' | 'autor' | 'anio' | 'estado';

/**
 * Historia 4 (specs/003-contenido-institucional, FR-018): mismo patrón que
 * sedes/page.tsx — Server Component, filtro activas/todas por query param.
 * FR-030: entrar pide `libros.ver` y editar/eliminar/reordenar/portada
 * piden `libros.gestionar` — los dos resueltos contra el catálogo (D132,
 * specs/005 T034), nunca un `rol.includes` a mano. Sin `libros.ver`, 404
 * (requerirPermiso), tanto desde el menú como por URL directa.
 *
 * H-88/H-89: orden en la URL. Por default (`orden` ausente o `orden=orden`)
 * se respeta el orden manual que ya trae la API (`orderBy: {orden: 'asc'}`,
 * libro.service.ts) — el mismo que ve la web pública (FR-016) y el único
 * que se puede reordenar (mover arriba/abajo, arrastrar). Elegir una
 * columna (título/autor/año) la reemplaza por ese criterio alfabético/
 * numérico — dejar de estar en ese orden natural es, a propósito, lo que
 * también oculta mover/arrastrar en LibrosCliente: reordenar un listado que
 * ya no está en su posición real no tendría sentido.
 */
export default async function LibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; orden?: string; dir?: string; q?: string }>;
}) {
  const session = await requerirPermiso('libros.ver');

  const { estado, orden: ordenParam, dir, q } = await searchParams;
  const filtro: Filtro = estado === 'todas' ? 'todas' : 'activas';
  const ordenColumna: ColumnaOrden =
    ordenParam === 'titulo' || ordenParam === 'autor' || ordenParam === 'anio' || ordenParam === 'estado'
      ? ordenParam
      : 'orden';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  const pagina = await apiFetch<Pagina<Libro>>(`/libros?estado=${filtro}&take=200`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  const itemsFiltrados = busqueda
    ? pagina.items.filter(
        (libro) => libro.titulo.toLocaleLowerCase('es').includes(busqueda) || libro.autor.toLocaleLowerCase('es').includes(busqueda),
      )
    : pagina.items;

  // El natural (orden manual) ya llega ordenado de la API — nada que hacer
  // más que filtrar (el filtrado preserva ese orden relativo, H-88).
  const libros =
    ordenColumna === 'orden'
      ? itemsFiltrados
      : [...itemsFiltrados].sort((a, b) => {
          const cmp =
            ordenColumna === 'anio'
              ? a.anio - b.anio
              : ordenColumna === 'estado'
                ? Number(a.activo) - Number(b.activo)
                : a[ordenColumna].localeCompare(b[ordenColumna], 'es');
          return ordenDireccion === 'asc' ? cmp : -cmp;
        });

  return (
    <LibrosCliente
      libros={libros}
      filtro={filtro}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'libros.gestionar')}
      // T071: el enlace a /libros/papelera, con el permiso de ABRIRLA — ver LibrosCliente.
      puedeAbrirPapelera={tienePermisoSesion(session, 'libros.papelera.ver')}
    />
  );
}
