import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { MapPin, Pencil } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, type GrupoExtensionDetalle } from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoActivoBadge, MigaDePan, textoHorario } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { AgregarIntegrante, BotonActivoGrupo, ResolverPedido, QuitarIntegrante } from './acciones';

/**
 * spec 014 (D220, D226): el detalle de un Grupo de Extensión — datos, líderes,
 * pedidos esperando e integrantes, con su contacto. El Admin acepta o
 * rechaza pedidos, agrega o quita personas, edita e inactiva; el Pastor solo ve.
 */
export default async function GrupoExtensionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('grupos_extension.ver');
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations('gruposExtension'), getLocale()]);
  let g: GrupoExtensionDetalle;
  try {
    g = await apiFetch<GrupoExtensionDetalle>(`/grupos-extension/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const puede = tienePermisoSesion(session, 'grupos_extension.gestionar');
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const edades =
    g.edadMinima !== null && g.edadMaxima !== null
      ? t('detalle.edadRango', { min: g.edadMinima, max: g.edadMaxima })
      : g.edadMinima !== null
        ? t('detalle.edadDesde', { min: g.edadMinima })
        : g.edadMaxima !== null
          ? t('detalle.edadHasta', { max: g.edadMaxima })
          : t('detalle.edadCualquiera');
  const lleno = g.cupo !== null && g.integrantes.length >= g.cupo;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/grupos-extension' }, { label: g.nombre }]} LinkComponente={Link} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold break-words">{g.nombre}</h1>
          <EstadoActivoBadge activo={g.activo} textoActivo={t('estadoActivo')} textoInactivo={t('estadoInactivo')} />
        </div>
        {puede && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink render={<Link href={`/grupos-extension/${g.id}/editar`} />} variant="outline" size="sm">
              <Pencil aria-hidden />
              {t('detalle.editar')}
            </ButtonLink>
            <BotonActivoGrupo grupoId={g.id} nombre={g.nombre} activo={g.activo} apiToken={session.apiToken} />
          </div>
        )}
      </div>
      {!puede && <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>}

      <section aria-labelledby="gex-datos" className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 id="gex-datos" className="text-lg font-semibold">
          {t('detalle.datos')}
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium">{t('detalle.para')}</dt>
          <dd>{t(`genero.${g.genero ?? 'sinLideres'}`)}</dd>
          <dt className="font-medium">{t('detalle.cuando')}</dt>
          <dd>{textoHorario(g.dias, g.horaInicio, t)}</dd>
          <dt className="font-medium">{t('detalle.lugar')}</dt>
          <dd className="flex flex-col gap-0.5 break-words">
            <span>{g.enLaIglesia ? `${t('enLaIglesia')} (${g.sede ?? ''}): ${g.direccion}` : g.direccion}</span>
            {g.zona && <span className="text-muted-foreground">{g.zona}</span>}
            {!g.ubicado && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin aria-hidden className="size-3.5" />
                {t('sinUbicar')}
              </span>
            )}
          </dd>
          <dt className="font-medium">{t('detalle.cupo')}</dt>
          <dd>{g.cupo === null ? t('detalle.sinCupo') : t('integrantesCupo', { integrantes: g.integrantes.length, cupo: g.cupo })}</dd>
          <dt className="font-medium">{t('detalle.edad')}</dt>
          <dd>{edades}</dd>
          <dt className="font-medium">{t('detalle.lideres')}</dt>
          <dd className="flex flex-col gap-1">
            {g.lideres.map((l) => (
              <span key={l.id} className="break-words">
                <Link href={`/personas/${l.id}`} className="underline underline-offset-4">
                  {l.nombre} {l.apellido}
                </Link>
                {l.telefono && ` · ${l.telefono}`}
              </span>
            ))}
          </dd>
        </dl>
      </section>

      <section aria-labelledby="gex-pendientes" className="flex flex-col gap-3">
        <h2 id="gex-pendientes" className="text-lg font-semibold">
          {t('detalle.pendientesTitulo')}
        </h2>
        {g.pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detalle.pendientesVacio')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {g.pendientes.map((p) => {
              const nombre = `${p.persona.nombre} ${p.persona.apellido}`;
              return (
                <li key={p.id} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-medium break-words">
                    <Link href={`/personas/${p.persona.id}`} className="underline underline-offset-4">
                      {nombre}
                    </Link>{' '}
                    · {t('detalle.edadAnios', { edad: p.persona.edad })}
                  </span>
                  <span className="text-muted-foreground break-all">{[p.persona.telefono, p.persona.email].filter(Boolean).join(' · ')}</span>
                  <span className="text-muted-foreground">{t('detalle.esperaDesde', { fecha: fecha(p.desde) })}</span>
                  {puede && g.activo && <ResolverPedido solicitudId={p.id} nombre={nombre} apiToken={session.apiToken} deshabilitarAceptar={lleno} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="gex-integrantes" className="flex flex-col gap-3">
        <h2 id="gex-integrantes" className="text-lg font-semibold">
          {t('detalle.integrantesTitulo')}
        </h2>
        {g.integrantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detalle.integrantesVacio')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {g.integrantes.map((i) => {
              const nombre = `${i.persona.nombre} ${i.persona.apellido}`;
              return (
                <li key={i.solicitudId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="flex flex-col gap-0.5">
                    <Link href={`/personas/${i.persona.id}`} className="font-medium break-words underline underline-offset-4">
                      {nombre}
                    </Link>
                    <span className="text-muted-foreground break-all">{[i.persona.telefono, i.persona.email].filter(Boolean).join(' · ')}</span>
                    <span className="text-muted-foreground">{t('detalle.desde', { fecha: fecha(i.desde) })}</span>
                  </span>
                  {puede && <QuitarIntegrante grupoId={g.id} solicitudId={i.solicitudId} nombre={nombre} apiToken={session.apiToken} />}
                </li>
              );
            })}
          </ul>
        )}
        {puede && g.activo && !lleno && (
          <AgregarIntegrante grupoId={g.id} apiToken={session.apiToken} excluir={[...g.integrantes.map((i) => i.persona.id), ...g.lideres.map((l) => l.id)]} />
        )}
      </section>
    </div>
  );
}
