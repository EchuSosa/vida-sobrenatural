'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarCheck, CalendarX, History } from 'lucide-react';
import type { EstadoEvento } from '@vida-sobrenatural/shared-types';

/**
 * El estado de un Evento con texto + ícono, nunca solo color (D81). "Ya pasó"
 * es un estado derivado (publicado y con el inicio antes de ahora).
 */
export function EstadoEventoBadge({ estado, inicio }: { estado: EstadoEvento; inicio: string }) {
  const t = useTranslations('eventos.gestion.estado');
  const [ahora] = useState(() => Date.now());
  const pasado = estado === 'publicado' && new Date(inicio).getTime() < ahora;
  const [Icono, texto, clase] =
    estado === 'cancelado'
      ? [CalendarX, t('cancelado'), 'border-destructive/40 text-destructive']
      : pasado
        ? [History, t('pasado'), 'border-border text-muted-foreground']
        : [CalendarCheck, t('publicado'), 'border-primary/40 text-foreground'];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${clase}`}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
    </span>
  );
}
