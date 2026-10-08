import type { EventoDetalle } from '@vida-sobrenatural/shared-types';

/**
 * spec 011, lote D (T074): la sección de inscriptos del detalle del Evento
 * (pestañas por estado, aprobar en lote, dar de baja, anotar en nombre,
 * registrar pago). Archivo propio del lote D desde el lote A, para que las
 * dos mitades del detalle no se pisen. Mientras tanto, no muestra nada.
 */
export function InscriptosEvento({ evento }: { evento: EventoDetalle }) {
  void evento;
  return null;
}
