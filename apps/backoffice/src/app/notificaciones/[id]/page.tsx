import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AlertTriangle, CheckCircle2, Clock, Mail, MonitorSmartphone } from 'lucide-react';
import { apiFetch, ApiError, formatearFechaHora, type NotificacionManualDetalle } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../auth';

/**
 * spec 012, T050 (FR-030, FR-032, FR-033) — el detalle de un aviso manual:
 * el mensaje completo como texto, quién lo mandó, a quién le llegó, cuántos lo
 * leyeron y, si fue importante, cómo salieron los mails y a quiénes no les
 * llegó (con qué hacer). Sin acciones de edición: un aviso mandado no cambia.
 */
export const dynamic = 'force-dynamic';

export default async function NotificacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('notificaciones.ver');
  const { id } = await params;
  let aviso: NotificacionManualDetalle;
  try {
    aviso = await apiFetch<NotificacionManualDetalle>(`/notificaciones/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const [t, ta, locale] = await Promise.all([getTranslations('notificaciones.detalle'), getTranslations('notificaciones.alcance'), getLocale()]);
  const alcance =
    aviso.alcance === 'todos'
      ? ta('todos')
      : aviso.alcanceNombre
        ? ta(aviso.alcance, { nombre: aviso.alcanceNombre })
        : ta(aviso.alcance === 'grupo' ? 'grupoSinNombre' : 'ministerioSinNombre');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <MigaDePan tramos={[{ label: t('miga'), href: '/notificaciones' }, { label: aviso.titulo }]} LinkComponente={Link} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold break-words">{aviso.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {t('autor', { nombre: `${aviso.autor.nombre} ${aviso.autor.apellido}` })} · {t('fecha', { fecha: formatearFechaHora(aviso.fecha, locale) })}
        </p>
      </div>

      <section aria-labelledby="titulo-mensaje" className="flex flex-col gap-2">
        <h2 id="titulo-mensaje" className="text-lg font-semibold">
          {t('mensaje')}
        </h2>
        <p className="rounded-lg border border-border bg-card p-4 whitespace-pre-line break-words">{aviso.mensaje}</p>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('alcance')}</dt>
          <dd>{alcance}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('emails')}</dt>
          <dd className="inline-flex items-center gap-1.5">
            {aviso.emails ? <Mail aria-hidden="true" className="size-4" /> : <MonitorSmartphone aria-hidden="true" className="size-4" />}
            {t('lectura', { leidas: aviso.leidas, destinatarios: aviso.destinatarios })}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="titulo-mails" className="flex flex-col gap-3">
        <h2 id="titulo-mails" className="text-lg font-semibold">
          {t('emails')}
        </h2>
        {!aviso.emails ? (
          <p className="text-muted-foreground">{t('soloApp')}</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                {t('enviados', { n: aviso.emails.enviados })}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {t('pendientes', { n: aviso.emails.pendientes })}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <AlertTriangle aria-hidden="true" className="size-4" />
                {t('fallidos', { n: aviso.emails.fallidos })}
              </li>
            </ul>
            {aviso.emails.personasFallidas.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <h3 className="font-semibold">{t('fallidasTitulo')}</h3>
                <p className="text-sm text-muted-foreground">{t('fallidasAyuda')}</p>
                <ul className="flex flex-col gap-1">
                  {aviso.emails.personasFallidas.map((p) => (
                    <li key={p.id}>
                      <Link href={`/personas/${p.id}`} className="underline underline-offset-2 hover:no-underline">
                        {p.nombre} {p.apellido}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-sm text-muted-foreground">{t('noEditable')}</p>
      <Link href="/notificaciones" className="inline-flex min-h-11 items-center self-start underline underline-offset-4 hover:no-underline">
        {t('volver')}
      </Link>
    </div>
  );
}
