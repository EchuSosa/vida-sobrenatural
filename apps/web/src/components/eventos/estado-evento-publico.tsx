import { useTranslations } from 'next-intl';
import { CalendarCheck, CalendarX, Clock, History, Info, ListOrdered, Lock, UsersRound } from 'lucide-react';
import type { EstadoInscripcionDeEvento } from '@vida-sobrenatural/shared-types';

/**
 * spec 011, FR-004 (D81) — el estado de un Evento para quien mira la web:
 * siempre texto + ícono, nunca solo color. "Ya pasó" pisa a los demás
 * salvo "cancelado" (FR-005).
 */
export type EstadoPublicoEvento = EstadoInscripcionDeEvento | 'pasado';

const ICONOS = {
  no_requiere: Info,
  abierta: CalendarCheck,
  lista_espera: ListOrdered,
  cupo_completo: UsersRound,
  cerrada: Lock,
  cancelado: CalendarX,
  solo_admin: Clock,
  pasado: History,
} as const;

export function estadoPublico(estadoInscripcion: EstadoInscripcionDeEvento, inicio: string, fin: string | null, ahora: Date): EstadoPublicoEvento {
  if (estadoInscripcion === 'cancelado') return 'cancelado';
  const termino = new Date(fin ?? inicio).getTime();
  return termino < ahora.getTime() ? 'pasado' : estadoInscripcion;
}

export function EstadoEventoPublico({ estado }: { estado: EstadoPublicoEvento }) {
  const t = useTranslations('eventos.publico.estado');
  const Icono = ICONOS[estado];
  const tono =
    estado === 'cancelado'
      ? 'border-destructive/50 text-destructive'
      : estado === 'abierta'
        ? 'border-primary/50 text-foreground'
        : 'border-border text-muted-foreground';
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${tono}`}>
      <Icono className="size-4" aria-hidden="true" />
      {t(estado)}
    </span>
  );
}
