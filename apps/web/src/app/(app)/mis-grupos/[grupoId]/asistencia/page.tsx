import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, formatearDiaEnArgentina, hoyEnArgentina, type AsistenciaDelDia, type MiGrupoDetalle } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../../../auth';
import { TomarAsistencia } from './tomar-asistencia';

/**
 * spec 008, T052 (FR-027 a FR-029, FR-043, SC-004): tomar asistencia, 360 px
 * primero. Hoy por defecto (`?fecha=` para corregir otro día); todos
 * presentes y un toque por ausencia; contador en vivo y "Guardar asistencia"
 * fijo abajo, en la zona del pulgar. Un solo envío.
 */
export default async function AsistenciaPage({ params, searchParams }: { params: Promise<{ grupoId: string }>; searchParams: Promise<{ fecha?: string }> }) {
  const session = await requerirPermiso('mis_grupos.gestionar');
  const [{ grupoId }, { fecha: fechaParam }] = await Promise.all([params, searchParams]);
  const hoy = hoyEnArgentina();
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) && fechaParam <= hoy ? fechaParam : hoy;
  const [t, locale] = await Promise.all([getTranslations('misGrupos'), getLocale()]);
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let grupo: MiGrupoDetalle;
  let asistencia: AsistenciaDelDia;
  try {
    [grupo, asistencia] = await Promise.all([
      apiFetch<MiGrupoDetalle>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}`, { headers, cache: 'no-store' }),
      apiFetch<AsistenciaDelDia>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}/asistencia/${fecha}`, { headers, cache: 'no-store' }),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'GRUPO_NO_ENCONTRADO') notFound();
    throw e;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-16 pb-32">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/mis-grupos' }, { label: grupo.nombre, href: `/mis-grupos/${grupo.grupoId}` }, { label: t('asistencia.titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('asistencia.titulo')}</h1>
      {grupo.estado !== 'en_curso' ? (
        <p role="note" className="rounded-md border border-border p-3 text-base">
          {t('detalle.terminada')}
        </p>
      ) : (
        <TomarAsistencia
          key={fecha}
          grupoId={grupo.grupoId}
          asistencia={asistencia}
          hoy={hoy}
          minimo={grupo.fechaInicio}
          fechaLegible={formatearDiaEnArgentina(fecha, locale)}
        />
      )}
    </div>
  );
}
