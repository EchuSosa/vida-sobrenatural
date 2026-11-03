'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarCheck, CircleAlert } from 'lucide-react';
import { apiFetch, formatearDiaDeServicio, lugarDelTurno, type MiTurno } from '@vida-sobrenatural/shared-types';
import { Button, Skeleton, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 017, US3 (D256): "Tu próximo turno" en el Inicio. Se pide desde el navegador, aparte del
 * resto: si la API falla, solo la tarjeta lo dice, con "Reintentar", y el Inicio sigue (US3-4).
 * Sin turnos publicados, no aparece.
 */
export function ProximoTurno({ apiToken }: { apiToken: string }) {
  const t = useTranslations('inicioApp');
  const locale = useLocale();
  const [estado, setEstado] = useState<'cargando' | 'error' | MiTurno[]>('cargando');

  const pedir = useCallback(() => apiFetch<MiTurno[]>('/turnos/me', { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' }), [apiToken]);
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      setEstado(await pedir());
    } catch {
      setEstado('error');
    }
  });

  useEffect(() => {
    let vigente = true;
    pedir().then(
      (turnos) => vigente && setEstado(turnos),
      () => vigente && setEstado('error'),
    );
    return () => {
      vigente = false;
    };
  }, [pedir]);

  if (estado === 'cargando') return <Skeleton className="h-32 w-full rounded-lg" />;
  if (estado === 'error') {
    return (
      <section aria-labelledby="proximo-turno" className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 id="proximo-turno" className="flex items-center gap-2 text-xl font-semibold">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-primary" />
          {t('proximoTurnoTitulo')}
        </h2>
        <p className="text-base">{t('proximoTurnoError')}</p>
        <Button variant="outline" className="w-fit" loading={enviando} onClick={() => void ejecutar()}>
          {t('reintentar')}
        </Button>
      </section>
    );
  }
  const [proximo, ...resto] = estado;
  if (!proximo) return null;
  return (
    <section aria-labelledby="proximo-turno" className="flex flex-col gap-3 rounded-lg border border-primary p-5">
      <h2 id="proximo-turno" className="flex items-center gap-2 text-xl font-semibold">
        <CalendarCheck aria-hidden className="size-5 shrink-0 text-primary" />
        {t('proximoTurnoTitulo')}
      </h2>
      <p className="text-base">
        <span className="font-medium first-letter:uppercase inline-block">{formatearDiaDeServicio(proximo.dia, locale)}</span>
        {' — '}
        {lugarDelTurno(proximo.ministerio.nombre, proximo.area)}
      </p>
      {resto.length > 0 && <p className="text-muted-foreground">{t('proximoTurnoMas', { n: resto.length })}</p>}
      <Link href="/mis-turnos" className="inline-flex min-h-11 w-fit items-center text-base font-medium text-primary underline underline-offset-4">
        {t('proximoTurnoVerTodos')}
      </Link>
    </section>
  );
}
