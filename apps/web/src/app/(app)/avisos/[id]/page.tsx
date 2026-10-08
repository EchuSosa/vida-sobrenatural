import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { apiFetch, ApiError, type AvisoDetalle } from '@vida-sobrenatural/shared-types';
import { ButtonLink, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';
import { claveTexto, fechaCompleta, paramsParaTexto } from '../textos-aviso';

/**
 * spec 012, T025 (FR-003, FR-006, FR-009) — el aviso completo. Un manual
 * muestra su mensaje entero como texto plano (saltos de línea respetados, sin
 * volver clickeables los enlaces); un automático, su texto y "Ver" a su
 * destino. Si se entra por URL directa sin leerlo, queda leído.
 */
export const dynamic = 'force-dynamic';

export default async function AvisoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await auth())!;
  const { id } = await params;
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let aviso: AvisoDetalle;
  try {
    aviso = await apiFetch<AvisoDetalle>(`/avisos/${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  if (!aviso.leido) {
    // Marcarlo no es crítico para mostrarlo: si falla, se ve igual.
    await apiFetch(`/avisos/${encodeURIComponent(id)}/leido`, { method: 'PATCH', headers, cache: 'no-store' }).catch(() => undefined);
  }
  const [t, locale] = await Promise.all([getTranslations('avisos'), getLocale()]);
  const manual = aviso.tipo === 'manual';
  const textoDe = (parte: 'titulo' | 'detalle') =>
    aviso.evento && t.has(claveTexto(aviso.evento, parte)) ? t(claveTexto(aviso.evento, parte), paramsParaTexto(aviso.params, locale)) : null;
  const titulo = manual ? aviso.titulo : (textoDe('titulo') ?? t('deLaIglesia'));
  const cuerpo = manual ? aviso.mensaje : textoDe('detalle');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/avisos' }, { label: titulo ?? t('deLaIglesia') }]} LinkComponente={Link} />
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted-foreground">
          <time dateTime={aviso.fecha}>{t('recibido', { fecha: fechaCompleta(aviso.fecha, locale) })}</time>
        </p>
        {cuerpo && <p className="text-base whitespace-pre-line break-words">{cuerpo}</p>}
        {!manual && (
          <ButtonLink size="xl" className="self-start text-base" render={<Link href={aviso.destino} />}>
            {t('ver')}
          </ButtonLink>
        )}
      </article>
      <Link href="/avisos" className="inline-flex min-h-11 items-center self-start text-base underline underline-offset-4 hover:no-underline">
        {t('volver')}
      </Link>
    </div>
  );
}
