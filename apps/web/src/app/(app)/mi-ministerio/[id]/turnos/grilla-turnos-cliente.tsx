'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { GrillaDeTurnos } from '@vida-sobrenatural/shared-types';
import { GrillaTurnos, type TraductorGrilla, type Traductor } from '@vida-sobrenatural/ui';

/** spec 017: la grilla compartida (packages/ui) con los textos de la web y `router.refresh()`. */
export function GrillaTurnosCliente({ grilla, apiToken }: { grilla: GrillaDeTurnos; apiToken: string }) {
  const t = useTranslations('turnos.grilla');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  return (
    <GrillaTurnos
      grilla={grilla}
      apiToken={apiToken}
      locale={locale}
      t={t as unknown as TraductorGrilla}
      te={te as unknown as Traductor}
      onCambio={() => router.refresh()}
    />
  );
}
