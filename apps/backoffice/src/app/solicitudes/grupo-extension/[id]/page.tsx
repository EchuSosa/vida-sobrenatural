import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CirclePause } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, type SolicitudGrupoExtensionDetalle } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { ResolverPedido } from '../../../grupos-extension/[id]/acciones';

/**
 * spec 014 (D226): el detalle de un pedido para sumarse a un Grupo de
 * Extensión, desde la bandeja. El Admin lo acepta o dice "No es para este
 * grupo"; el Pastor lo ve sin acciones.
 */
export default async function SolicitudGrupoExtensionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('solicitudes.ver');
  const { id } = await params;
  const [t, tb, locale] = await Promise.all([getTranslations('gruposExtension.solicitud'), getTranslations('bandeja'), getLocale()]);
  let s: SolicitudGrupoExtensionDetalle;
  try {
    s = await apiFetch<SolicitudGrupoExtensionDetalle>(`/solicitudes-grupo-extension/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const nombre = `${s.persona.nombre} ${s.persona.apellido}`;
  const puede = tienePermisoSesion(session, 'grupos_extension.gestionar');
  const lleno = s.grupo.cupo !== null && s.grupo.integrantes >= s.grupo.cupo;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tb('titulo'), href: '/solicitudes' }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-sm font-medium">{tb(`estados.grupo_extension.${s.estado}`)}</p>
      </div>
      <dl className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-[9rem_1fr]">
        <dt className="font-medium">{t('persona')}</dt>
        <dd className="flex flex-col gap-0.5 break-words">
          <Link href={`/personas/${s.persona.id}`} className="underline underline-offset-4">
            {nombre}
          </Link>
          <span className="text-muted-foreground">{t('edad', { edad: s.persona.edad })}</span>
          {s.persona.telefono && <span className="text-muted-foreground">{t('telefono', { telefono: s.persona.telefono })}</span>}
          {s.persona.email && <span className="text-muted-foreground break-all">{t('email', { email: s.persona.email })}</span>}
        </dd>
        <dt className="font-medium">{t('grupo')}</dt>
        <dd className="flex flex-col gap-0.5 break-words">
          <Link href={`/grupos-extension/${s.grupo.id}`} className="underline underline-offset-4" aria-label={t('verGrupo', { nombre: s.grupo.nombre })}>
            {s.grupo.nombre}
          </Link>
          {s.grupo.zona && <span className="text-muted-foreground">{s.grupo.zona}</span>}
          <span className="text-muted-foreground">
            {s.grupo.cupo === null ? t('lugares', { integrantes: s.grupo.integrantes }) : t('lugaresCupo', { integrantes: s.grupo.integrantes, cupo: s.grupo.cupo })}
          </span>
          {!s.grupo.activo && (
            <span className="flex items-center gap-1 font-medium">
              <CirclePause aria-hidden className="size-4 text-muted-foreground" />
              {t('inactivo')}
            </span>
          )}
        </dd>
      </dl>
      <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
        <li>{t('pidio', { fecha: fecha(s.createdAt) })}</li>
        {s.creadoPor && <li>{t('creadoPor', { nombre: s.creadoPor })}</li>}
        {s.revisadoPor && s.revisadaEn && <li>{t('resuelto', { nombre: s.revisadoPor, fecha: fecha(s.revisadaEn) })}</li>}
        {s.mensaje && <li className="break-words">{t('mensaje', { mensaje: s.mensaje })}</li>}
      </ul>
      {s.estado === 'pendiente' && (puede ? s.grupo.activo && <ResolverPedido solicitudId={s.id} nombre={nombre} apiToken={session.apiToken} deshabilitarAceptar={lleno} /> : <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>)}
    </div>
  );
}
