import * as React from 'react';
import { CircleCheck, CircleX, Clock, ListOrdered, ReceiptText, Wallet, type LucideIcon } from 'lucide-react';
import type { EstadoInscripcionEvento, EstadoPagoInscripcion } from '@vida-sobrenatural/shared-types';
import { cn } from '../lib/utils';

/**
 * spec 011 (T021) — el estado de una Inscripción a Evento o de su pago, con
 * texto + ícono, nunca solo color (D81). El texto llega por prop (D84,
 * H-151): cada app lo saca de su `next-intl`. Lo usan la página del Evento y
 * Mis eventos (web) y la lista de inscriptos (backoffice).
 */
export type EstadoParaBadge = EstadoInscripcionEvento | Exclude<EstadoPagoInscripcion, 'no_aplica'>;

const ICONO: Record<EstadoParaBadge, LucideIcon> = {
  confirmada: CircleCheck,
  pendiente: Clock,
  lista_espera: ListOrdered,
  rechazada: CircleX,
  cancelada: CircleX,
  sin_pago: Wallet,
  pendiente_verificacion: ReceiptText,
  verificado: CircleCheck,
};

const TONO: Record<EstadoParaBadge, string> = {
  confirmada: 'text-success',
  verificado: 'text-success',
  rechazada: 'text-destructive',
  cancelada: 'text-muted-foreground',
  pendiente: 'text-foreground',
  lista_espera: 'text-foreground',
  sin_pago: 'text-foreground',
  pendiente_verificacion: 'text-foreground',
};

export interface EstadoInscripcionBadgeProps {
  estado: EstadoParaBadge;
  /** El texto visible: "Confirmada", "Lugar 2 en la lista de espera", "Pago en revisión"… */
  texto: string;
  className?: string;
}

export function EstadoInscripcionBadge({ estado, texto, className }: EstadoInscripcionBadgeProps) {
  const Icono = ICONO[estado];
  return (
    <span data-estado={estado} className={cn('inline-flex items-center gap-1.5 font-medium', TONO[estado], className)}>
      <Icono className="size-4 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  );
}
