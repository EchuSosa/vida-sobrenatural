import { notFound } from 'next/navigation';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { apiFetch, ApiError, type Sede } from '@vida-sobrenatural/shared-types';
import { SedeDetalleCliente } from './sede-detalle-cliente';

/**
 * H-52 (revisión manual ronda 4): detalle + edición de una Sede. H-60/H-43
 * (ronda 7): Server Component — GET /sedes/:id pasa al servidor; `notFound()`
 * reemplaza el `noEncontrada` armado a mano (usa sedes/[id]/not-found.tsx,
 * con el mismo mensaje y el link "Volver a Sedes" que ya tenía esta
 * pantalla). De cliente queda SedeDetalleCliente: el formulario de edición
 * y Desactivar/Reactivar (D119).
 */
export default async function SedeDetallePage({ params }: { params: Promise<{ id: string }> }) {
  // H-132: antes solo pedía sesión — cualquier Persona logueada veía el detalle por URL.
  const session = await requerirPermiso('sedes.ver');
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

  return (
    <SedeDetalleCliente
      sede={sede}
      apiToken={session.apiToken}
      // H-133: editar, desactivar y reactivar piden sedes.gestionar — quien
      // solo ve (el Pastor) recibe los datos en solo lectura.
      puedeGestionar={tienePermisoSesion(session, 'sedes.gestionar')}
    />
  );
}
