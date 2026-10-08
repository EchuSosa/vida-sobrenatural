import { notFound } from 'next/navigation';
import { apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import type { DetalleDiscipuladoAdmin } from '@vida-sobrenatural/shared-types';
import { GrupoDetalleCliente } from './grupo-detalle-cliente';

/**
 * specs/004, T047/T052/T054c (D134, FR-019 a FR-021, FR-030, FR-042): el
 * detalle administrativo de un discipulado, sin notas. Admin y Pastor lo ven;
 * solo quien tiene `grupos.gestionar` decide (confirmar o rechazar la
 * finalización y las bajas, cambiar de Discipulador). El Pastor no ve ninguna
 * acción (D64).
 */
export default async function GrupoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('grupos.ver');
  const { id } = await params;
  let detalle: DetalleDiscipuladoAdmin;
  try {
    detalle = await apiFetch<DetalleDiscipuladoAdmin>(`/grupos/discipulados/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return <GrupoDetalleCliente detalle={detalle} apiToken={session.apiToken} puedeGestionar={tienePermisoSesion(session, 'grupos.gestionar')} />;
}
