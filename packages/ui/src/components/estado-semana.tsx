import * as React from 'react';
import { CalendarClock, CircleAlert, CircleCheck, CircleDashed, Clock } from 'lucide-react';
import type { EstadoSemana as Estado } from '@vida-sobrenatural/shared-types';
import { cn } from '../lib/utils';

export interface EstadoSemanaProps {
  estado: Estado;
  /** Los textos de cada estado (next-intl en cada app, H-151): este componente no tiene textos propios. */
  textos: Record<Estado, string>;
  className?: string;
}

const ICONO: Record<Estado, { Icono: typeof CircleCheck; color: string }> = {
  liberada: { Icono: CircleCheck, color: 'text-success' },
  cargado_por_liberar: { Icono: Clock, color: 'text-primary' },
  proxima: { Icono: CalendarClock, color: 'text-muted-foreground' },
  sin_material: { Icono: CircleDashed, color: 'text-muted-foreground' },
  vencida_sin_material: { Icono: CircleAlert, color: 'text-primary' },
};

/**
 * spec 008, T015 (FR-026, D81, D118): el estado de una semana de Vida de
 * Servicio en texto + ícono, nunca solo color. Lo usan la Persona (Mi camino),
 * el Líder (Mis grupos) y el backoffice (detalle de la edición). El texto va
 * en el color del texto; el color queda solo en el ícono, que es decorativo.
 */
export function EstadoSemana({ estado, textos, className }: EstadoSemanaProps) {
  const { Icono, color } = ICONO[estado];
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', className)} data-estado={estado}>
      <Icono className={cn('size-4 shrink-0', color)} aria-hidden="true" />
      {textos[estado]}
    </span>
  );
}
