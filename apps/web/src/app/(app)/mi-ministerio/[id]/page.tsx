import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Crown, Layers, Mail, Phone, UsersRound } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, type IntegranteMinisterio, type MinisterioLideradoDetalle } from '@vida-sobrenatural/shared-types';
import { AvatarPersona } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';
import { SelectorMiCamino } from '../../mi-camino/selector-mi-camino';
import { EnlaceWhatsappIntegrante } from './enlace-whatsapp';

const ENLACE = 'flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-2 break-all';

type Contexto = { t: Awaited<ReturnType<typeof getTranslations<'miMinisterio'>>>; locale: string; yo: string; ministerio: string };

function Integrante({ i, ctx: { t, locale, yo, ministerio } }: { i: IntegranteMinisterio; ctx: Contexto }) {
  return (
    <li className="flex gap-3 rounded-md border border-border p-3">
      <AvatarPersona nombre={i.persona.nombre} apellido={i.persona.apellido} fotoUrl={i.persona.fotoUrl} tamanio="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium break-words">
          {i.persona.nombre} {i.persona.apellido}
        </span>
        <span className="text-muted-foreground">{t('desde', { fecha: formatearDiaEnArgentina(i.desde, locale) })}</span>
        {i.persona.telefono ? (
          <a href={`tel:${i.persona.telefono}`} className={ENLACE}>
            <Phone aria-hidden className="size-4 shrink-0" />
            {t('llamar', { nombre: i.persona.nombre })}: {i.persona.telefono}
          </a>
        ) : (
          <span className="text-muted-foreground">{t('sinTelefono')}</span>
        )}
        {i.persona.whatsapp && <EnlaceWhatsappIntegrante whatsapp={i.persona.whatsapp} nombre={i.persona.nombre} texto={t('saludoWhatsapp', { nombre: i.persona.nombre, yo, ministerio })} />}
        {i.persona.email && (
          <a href={`mailto:${i.persona.email}`} className={ENLACE}>
            <Mail aria-hidden className="size-4 shrink-0" />
            {i.persona.email}
          </a>
        )}
      </div>
    </li>
  );
}

function Grupo({ titulo, integrantes, id, ctx }: { titulo: string; integrantes: IntegranteMinisterio[]; id: string; ctx: Contexto }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
        <Layers aria-hidden className="size-5 shrink-0 text-primary" />
        {titulo} ({integrantes.length})
      </h2>
      {integrantes.length === 0 ? (
        <p className="text-muted-foreground">{ctx.t('areaVacia')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {integrantes.map((i) => (
            <Integrante key={i.postulacionId} i={i} ctx={ctx} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * spec 016 (D244): el equipo de un Ministerio como lo ve su líder — por área,
 * con contacto (Pregunta 1 de la 016, como D226), pensado a 360 px. La API
 * autoriza contra la base: lo ajeno y lo inexistente se ven igual, "no
 * encontramos" (`not-found.tsx`, Principio V).
 */
export default async function MiMinisterioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [t, locale] = await Promise.all([getTranslations('miMinisterio'), getLocale()]);
  let m: MinisterioLideradoDetalle;
  try {
    m = await apiFetch<MinisterioLideradoDetalle>(`/ministerios/liderados/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const ctx: Contexto = { t, locale, yo: session?.user.givenName ?? session?.user.name ?? '', ministerio: m.nombre };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <SelectorMiCamino actual="/mi-ministerio" />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">{t('titulo')}</p>
        <h1 className="text-3xl font-semibold tracking-tight break-words">{m.nombre}</h1>
        <p className="text-base text-muted-foreground">{m.descripcion}</p>
        <p className="flex gap-2 text-muted-foreground">
          <UsersRound aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('resumen', { integrantes: m.integrantes, areas: m.areas })}
        </p>
        {m.otrosLideres.length > 0 && (
          <p className="flex gap-2 text-muted-foreground">
            <Crown aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('otrosLideres', { nombres: m.otrosLideres.map((l) => `${l.nombre} ${l.apellido}`).join(', ') })}
          </p>
        )}
      </div>
      {m.integrantes === 0 ? (
        <p className="rounded-lg border border-border p-5 text-base text-muted-foreground">{t('sinIntegrantes')}</p>
      ) : (
        <>
          {m.porArea
            .filter((a) => a.celula.activo || a.integrantes.length > 0)
            .map((a) => (
              <Grupo key={a.celula.id} id={`area-${a.celula.id}`} titulo={a.celula.activo ? a.celula.nombre : t('areaInactiva', { area: a.celula.nombre })} integrantes={a.integrantes} ctx={ctx} />
            ))}
          {(m.sinArea.length > 0 || m.porArea.length === 0) && <Grupo id="area-sin" titulo={m.porArea.length === 0 ? t('todoElMinisterio') : t('sinArea')} integrantes={m.sinArea} ctx={ctx} />}
        </>
      )}
    </div>
  );
}
