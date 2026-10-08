import { notFound, redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../../../auth';

/**
 * spec 011, T075 (FR-034) — una Inscripción a Evento de la bandeja se resuelve
 * en el detalle de su Evento, en la pestaña de su estado: ahí están aprobar,
 * rechazar y el resto de la lista (D178, `config/solicitudes.ts`).
 */
export default async function InscripcionEventoBandejaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('eventos.ver');
  const { id } = await params;
  let destino: string;
  try {
    const inscripcion = await apiFetch<{ eventoId: string; estado: string }>(`/inscripciones-evento/${id}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
    });
    destino = `/eventos/${inscripcion.eventoId}?estado=${inscripcion.estado}#inscriptos`;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  redirect(destino);
}
