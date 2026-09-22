import { notFound } from 'next/navigation';
import { auth } from '../../../auth';
import { apiFetch, ApiError, type Libro } from '@vida-sobrenatural/shared-types';
import { LibroDetalleCliente } from './libro-detalle-cliente';
import { BotonIngresarGoogle } from '../../../components/boton-ingresar-google';

/**
 * Historia 4: detalle + edición de un Libro + subida de portada. Mismo
 * patrón que sedes/[id]/page.tsx — Server Component, `notFound()` para un
 * id inexistente o eliminado (D119). FR-030: rol fuera de Admin/Pastor,
 * afuera también acá.
 */
export default async function LibroDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Libro</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  const rol = session.user.rol;
  if (!rol.includes('admin') && !rol.includes('pastor')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Libro</h1>
        <p className="text-muted-foreground">Necesitás el rol Admin o Pastor para ver esta sección.</p>
      </div>
    );
  }

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
      esAdmin={rol.includes('admin')}
      autoresSugeridos={autoresSugeridos}
    />
  );
}
