import { notFound } from 'next/navigation';
import { auth } from '../../../auth';
import { apiFetch, ApiError, type Sede } from '@vida-sobrenatural/shared-types';
import { SedeDetalleCliente } from './sede-detalle-cliente';
import { BotonIngresarGoogle } from '../../../components/boton-ingresar-google';

/**
 * H-52 (revisión manual ronda 4): detalle + edición de una Sede. H-60/H-43
 * (ronda 7): Server Component — GET /sedes/:id pasa al servidor; `notFound()`
 * reemplaza el `noEncontrada` armado a mano (usa sedes/[id]/not-found.tsx,
 * con el mismo mensaje y el link "Volver a Sedes" que ya tenía esta
 * pantalla). De cliente queda SedeDetalleCliente: el formulario de edición
 * y Desactivar/Reactivar (D119).
 */
export default async function SedeDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Sede</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  const { id } = await params;
  let sede: Sede;
  try {
    sede = await apiFetch<Sede>(`/sedes/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') {
      notFound();
    }
    throw e;
  }

  return <SedeDetalleCliente sede={sede} apiToken={session.apiToken} />;
}
