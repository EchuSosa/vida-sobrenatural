import { notFound } from 'next/navigation';
import { apiFetch, ApiError, type PagoEnBandeja } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../../../auth';
import { PagoDetalleCliente } from './pago-detalle-cliente';

/**
 * spec 011, T069 (FR-032 a FR-035) — el detalle de un Pago de la bandeja:
 * el comprobante, "Verificar pago" (principal) y "Rechazar pago" con motivo
 * obligatorio. Solo `pagos.verificar` (Admin); el Pastor no ve comprobantes.
 */
export default async function PagoBandejaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('pagos.verificar');
  const { id } = await params;
  let pago: PagoEnBandeja;
  try {
    pago = await apiFetch<PagoEnBandeja>(`/pagos/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` } });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  return <PagoDetalleCliente pago={pago} apiToken={session.apiToken} />;
}
