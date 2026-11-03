'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarRange } from 'lucide-react';
import type { GrillaDeTurnos } from '@vida-sobrenatural/shared-types';
import { GrillaTurnos, type TraductorGrilla, type Traductor } from '@vida-sobrenatural/ui';

/** spec 017, US2-8: la misma grilla que el líder ve en la web; el Admin edita y el Pastor solo ve (D253). */
export function TurnosMinisterio({ grilla, apiToken }: { grilla: GrillaDeTurnos; apiToken: string }) {
  const t = useTranslations('turnos.grilla');
  const tt = useTranslations('ministerios.turnos');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  return (
    <section aria-labelledby="turnos-titulo" className="flex flex-col gap-4">
      <h2 id="turnos-titulo" className="flex items-center gap-2 text-lg font-semibold">
        <CalendarRange aria-hidden className="size-5 text-primary" />
        {tt('titulo')}
      </h2>
      <p className="text-sm text-muted-foreground">{tt('ayuda')}</p>
      <GrillaTurnos grilla={grilla} apiToken={apiToken} locale={locale} t={t as unknown as TraductorGrilla} te={te as unknown as Traductor} onCambio={() => router.refresh()} />
    </section>
  );
}
