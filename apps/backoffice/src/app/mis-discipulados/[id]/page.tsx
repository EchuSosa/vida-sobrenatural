import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import type { DetalleMiDiscipulado } from '../comun';
import { DetalleMiDiscipuladoCliente } from './detalle-cliente';

/**
 * specs/004, T046/T052/T054c (FR-011, FR-013, FR-019, FR-041, FR-042, FR-044):
 * el discipulado que el Discipulador lidera hoy — contacto, Encuentros con
 * notas, y pedir terminarlo o la baja de una Persona. La API responde 404 si
 * no tiene el Liderazgo vigente (Principio V): acá es `notFound()`.
 */
export default async function MiDiscipuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('mis_discipulados.ver');
  const { id } = await params;
  let detalle: DetalleMiDiscipulado;
  try {
    detalle = await apiFetch<DetalleMiDiscipulado>(`/discipulado/mis-discipulados/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return (
    <DetalleMiDiscipuladoCliente
      detalle={detalle}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'mis_discipulados.gestionar')}
    />
  );
}
