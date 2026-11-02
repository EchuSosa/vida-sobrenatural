import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, type GrillaDeTurnos } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../../auth';
import { GrillaTurnosCliente } from './grilla-turnos-cliente';

/**
 * spec 017, US2 (D252–D256): los turnos de un Ministerio para su líder — la grilla, "Copiar la
 * fecha anterior" y "Publicar". La API autoriza contra la base: lo ajeno y lo inexistente se ven
 * igual, "no encontramos" (Principio V).
 */
export default async function TurnosDelMinisterioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const t = await getTranslations('miMinisterio');
  let grilla: GrillaDeTurnos;
  try {
    grilla = await apiFetch<GrillaDeTurnos>(`/ministerios/${encodeURIComponent(id)}/turnos`, {
      headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'NO_ENCONTRADO' || e.code === 'SIN_PERMISO')) notFound();
    throw e;
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[
          { label: t('titulo'), href: '/mi-ministerio' },
          { label: grilla.ministerio.nombre, href: `/mi-ministerio/${grilla.ministerio.id}` },
          { label: t('turnos.titulo') },
        ]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">{t('turnos.tituloDe', { ministerio: grilla.ministerio.nombre })}</h1>
        <p className="text-base text-muted-foreground">{t('turnos.intro')}</p>
      </div>
      <GrillaTurnosCliente grilla={grilla} apiToken={session?.apiToken ?? ''} />
    </div>
  );
}
