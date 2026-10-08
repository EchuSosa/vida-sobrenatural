import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GraduationCap, Hourglass, Info, UsersRound } from 'lucide-react';
import { ApiError, apiFetch, type MinisterioDetalleParaPersona } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, ButtonLink, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../../auth';
import { FormularioPostulacion } from './formulario-postulacion';

/**
 * spec 009, T020 (FR-001, FR-007, FR-008, FR-010, docs/22): el detalle de un
 * Ministerio dentro de la app, con su descripción, sus áreas y, si requiere
 * formación, el aviso de docs/22. Según la situación de la Persona: el
 * formulario, "Ya estás sirviendo", "Ya tenés una postulación en revisión" o
 * la explicación de no apta. Un Ministerio no disponible → `not-found.tsx`.
 */
export default async function MinisterioAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [t, tMiCamino] = await Promise.all([getTranslations('ministerios'), getTranslations('miCamino')]);
  let ministerio: MinisterioDetalleParaPersona;
  try {
    ministerio = await apiFetch<MinisterioDetalleParaPersona>(`/ministerios/me/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session?.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[{ label: tMiCamino('titulo'), href: '/mi-camino' }, { label: t('titulo'), href: '/mi-camino/ministerios' }, { label: ministerio.nombre }]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight break-words">{ministerio.nombre}</h1>
        <p className="text-base whitespace-pre-line text-muted-foreground">{ministerio.descripcion}</p>
      </div>

      {ministerio.celulas.length > 0 && (
        <section aria-labelledby="areas-titulo" className="flex flex-col gap-2">
          <h2 id="areas-titulo" className="text-xl font-semibold">
            {t('areas')}
          </h2>
          <ul className="flex flex-col gap-2">
            {ministerio.celulas.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3 text-base">
                <span className="font-medium">{c.nombre}</span>
                {c.descripcion && <span className="block text-muted-foreground">{c.descripcion}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ministerio.requiereFormacion && (
        <AvisoEstado role="note" icono={<GraduationCap className="text-primary" />} titulo={t('requiereFormacionAviso')} className="rounded-lg border border-border p-4" />
      )}

      {ministerio.situacion === 'puede_postularse' && (
        <FormularioPostulacion ministerioId={ministerio.id} celulas={ministerio.celulas} />
      )}

      {ministerio.situacion === 'ya_es_miembro' && (
        <Situacion icono={<UsersRound className="text-primary" />} titulo={t('yaEsMiembroTitulo')} texto={t('yaEsMiembroTexto')} enlace={t('irAMiCamino')} />
      )}

      {ministerio.situacion === 'tiene_pendiente' && (
        <Situacion
          icono={<Hourglass className="text-primary" />}
          titulo={t('tienePendienteTitulo', { ministerio: ministerio.pendienteA?.nombre ?? '' })}
          texto={t('tienePendienteTexto')}
          enlace={t('irAMiCamino')}
        />
      )}

      {ministerio.situacion === 'no_apta' && (
        <Situacion icono={<Info className="text-primary" />} titulo={t('avisoNoAptaTitulo')} texto={t('avisoNoAptaTexto')} enlace={t('irAMiCamino')} />
      )}
    </div>
  );
}

function Situacion({ icono, titulo, texto, enlace }: { icono: React.ReactNode; titulo: string; texto: string; enlace: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <AvisoEstado icono={icono} titulo={titulo}>
        {texto}
      </AvisoEstado>
      <ButtonLink render={<Link href="/mi-camino" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
        {enlace}
      </ButtonLink>
    </div>
  );
}
