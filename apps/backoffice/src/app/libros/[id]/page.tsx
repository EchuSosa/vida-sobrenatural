import { notFound } from 'next/navigation';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { apiFetch, ApiError, type Libro } from '@vida-sobrenatural/shared-types';
import { LibroDetalleCliente } from './libro-detalle-cliente';

/**
 * Historia 4: detalle + edición de un Libro + subida de portada. Mismo
 * patrón que sedes/[id]/page.tsx — Server Component, `notFound()` para un
 * id inexistente o eliminado (D119). FR-030: entrar pide `libros.ver`
 * (404 si no); editar y la portada piden `libros.gestionar` — los dos
 * contra el catálogo (D132, specs/005 T034).
 */
export default async function LibroDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('libros.ver');

  const { id } = await params;
  let libro: Libro;
  try {
    libro = await apiFetch<Libro>(`/libros/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') {
      notFound();
    }
    throw e;
  }

  // H-91/H-60: se busca en el servidor, no acá adentro — esta pantalla no
  // tiene (como sí libros-cliente.tsx) el listado completo ya cargado del
  // que derivar las sugerencias.
  const autoresSugeridos = await apiFetch<string[]>('/libros/autores');

  return (
    <LibroDetalleCliente
      libro={libro}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'libros.gestionar')}
      autoresSugeridos={autoresSugeridos}
    />
  );
}
