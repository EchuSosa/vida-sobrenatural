import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck, CircleCheck, Droplets, Hourglass, Info, MapPin, UserRound } from 'lucide-react';
import { apiFetch, formatearDiaEnArgentina, formatearInicioEvento, type EstadoCardBautismo } from '@vida-sobrenatural/shared-types';
import { ButtonLink } from '@vida-sobrenatural/ui';
import type { PropsAccionesEtapa } from './acciones-etapa';
import { NoPuedoEseDia, PedirBautismo, RetirarBautismo } from './acciones-bautismo';

/**
 * spec 010, T020 y T043 (FR-019, FR-020, FR-020a, FR-032, D150, D151): lo
 * propio de la card de Bautismo en Mi camino (ver `acciones-etapa.ts`). Pide
 * `GET /bautismo/me` y muestra exactamente uno de los 8 estados con texto +
 * ícono (D81) y qué pasa después: por qué todavía no (con el enlace a Vida
 * Nueva), "Quiero bautizarme", en revisión, esperando fecha, la fecha con
 * hora y lugar (leídos del Evento), confirmando, o bautizada. Nunca muestra
 * el motivo de un rechazo (D185). El "Ya me bauticé" de D144 es el "Ya lo
 * hice" genérico de la card (FR-020b), que la página pone debajo.
 * Si la API falla, lo atrapa el `error.tsx` de Mi camino.
 */
export async function AccionesBautismo({ estado, apiToken }: PropsAccionesEtapa) {
  // Una declaración "Ya lo hice" en revisión: la card ya lo dice con su texto genérico.
  if (estado.estado === 'en_revision' || estado.estado === 'proximamente') return null;
  const [t, locale] = await Promise.all([getTranslations('miCamino.bautismo'), getLocale()]);
  const card = await apiFetch<EstadoCardBautismo>('/bautismo/me', {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const dia = (iso: string) => formatearDiaEnArgentina(iso, locale);

  switch (card.estado) {
    case 'no_habilitada':
      return (
        <Bloque icono={<Info className="text-muted-foreground" />} titulo={t('noHabilitadaTitulo')}>
          <p>{t('noHabilitadaTexto')}</p>
          <ButtonLink render={<Link href="/mi-camino/vida-nueva" />} variant="outline" size="xl" className="w-fit text-base">
            {t('verVidaNueva')}
          </ButtonLink>
        </Bloque>
      );

    case 'lo_pide_su_tutor':
      return (
        <Bloque icono={<UserRound className="text-primary" />} titulo={t('tutorTitulo')}>
          <p>{t('tutorTexto')}</p>
        </Bloque>
      );

    case 'puede_pedir':
      return (
        <Bloque icono={<Droplets className="text-primary" />} titulo={t('puedePedirTitulo')}>
          {card.ultimo === 'rechazada' && <p>{t('ultimoRechazada')}</p>}
          {card.ultimo === 'retirada' && <p>{t('ultimoRetirada')}</p>}
          <p>{t('puedePedirTexto')}</p>
          <PedirBautismo />
        </Bloque>
      );

    case 'en_revision':
      return (
        <Bloque icono={<Hourglass className="text-primary" />} titulo={t('enRevisionTitulo')}>
          <p>{t('enRevisionTexto', { fecha: dia(card.desde) })}</p>
          <p>{t('enRevisionDespues')}</p>
          <RetirarBautismo conFecha={false} />
        </Bloque>
      );

    case 'esperando_fecha':
      return (
        <Bloque icono={<CalendarCheck className="text-primary" />} titulo={t('esperandoFechaTitulo')}>
          <p>{t('esperandoFechaTexto')}</p>
          <RetirarBautismo conFecha={false} />
        </Bloque>
      );

    case 'con_fecha':
      return (
        <Bloque icono={<CalendarCheck className="text-primary" />} titulo={t('conFechaTitulo')}>
          <p className="font-medium text-foreground">{formatearInicioEvento(card.evento.inicio, card.evento.fin, locale)}</p>
          <p className="flex gap-2 whitespace-pre-line break-words">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              <span className="sr-only">{t('lugar')} </span>
              {card.evento.lugar}
            </span>
          </p>
          <Link href={`/eventos/${card.evento.slug}`} className="w-fit font-medium text-primary underline underline-offset-2">
            {t('verEvento', { nombre: card.evento.nombre })}
          </Link>
          <p>{t('conFechaDespues')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NoPuedoEseDia />
            <RetirarBautismo conFecha />
          </div>
        </Bloque>
      );

    case 'fecha_pasada_sin_confirmar':
      return (
        <Bloque icono={<Hourglass className="text-primary" />} titulo={t('confirmandoTitulo')}>
          <p>{t('confirmandoTexto', { fecha: dia(card.evento.inicio) })}</p>
        </Bloque>
      );

    case 'bautizada':
      // La card ya dice "¡Ya la hiciste!"; acá solo la fecha, si se conoce.
      return card.en ? (
        <Bloque icono={<CircleCheck className="text-primary" />} titulo={t('bautizadaTitulo')}>
          <p>{t('bautizadaEl', { fecha: dia(card.en) })}</p>
        </Bloque>
      ) : null;
  }
}

function Bloque({ icono, titulo, children }: { icono: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-md bg-muted/50 p-4 text-base" data-testid="bautismo-estado">
      <div className="flex gap-3">
        <span className="mt-0.5 flex shrink-0 [&_svg]:size-5" aria-hidden="true">
          {icono}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-medium">{titulo}</p>
          {children && <div className="flex flex-col gap-3 text-muted-foreground">{children}</div>}
        </div>
      </div>
    </div>
  );
}
