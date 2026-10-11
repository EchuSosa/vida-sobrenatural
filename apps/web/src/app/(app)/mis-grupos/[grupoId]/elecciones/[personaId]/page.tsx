import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MessageCircle, Phone } from 'lucide-react';
import { ApiError, apiFetch, enlaceWhatsapp, normalizarWhatsappArgentino, type DetalleEleccionLider } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../../../../auth';
import { DatosConocidosVista } from '../../../../../../components/eleccion/datos-conocidos';
import { CharlaEleccion } from './charla-eleccion';

/**
 * spec 015 (D240): la charla uno a uno del líder de Vida de Servicio con una
 * persona — lo que ya sabemos, su elección (que se ajusta en la charla), las
 * notas privadas y "Charla hecha". Una persona de otra edición: 404.
 */
export default async function CharlaPage({ params }: { params: Promise<{ grupoId: string; personaId: string }> }) {
  const session = await requerirPermiso('mis_grupos.ver');
  const { grupoId, personaId } = await params;
  const [t, tm] = await Promise.all([getTranslations('misGrupos.elecciones'), getTranslations('misGrupos')]);
  let datos: DetalleEleccionLider;
  try {
    datos = await apiFetch<DetalleEleccionLider>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}/elecciones/${encodeURIComponent(personaId)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'GRUPO_NO_ENCONTRADO' || e.code === 'NO_ENCONTRADO')) notFound();
    throw e;
  }
  const nombre = `${datos.persona.nombre} ${datos.persona.apellido}`;
  const whatsapp = normalizarWhatsappArgentino(datos.persona.telefono);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[
          { label: tm('titulo'), href: '/mis-grupos' },
          { label: datos.grupo.nombre, href: `/mis-grupos/${datos.grupo.id}` },
          { label: t('titulo'), href: `/mis-grupos/${datos.grupo.id}/elecciones` },
          { label: nombre },
        ]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">{t('charlaTitulo', { nombre })}</h1>
        <p className="text-base text-muted-foreground">{t('charlaAyuda')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`tel:${datos.persona.telefono}`} className="flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline underline-offset-2">
            <Phone aria-hidden className="size-4 shrink-0" />
            {t('llamar')}
          </a>
          {whatsapp && (
            <a href={enlaceWhatsapp(whatsapp)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1.5 text-base font-medium text-primary underline underline-offset-2">
              <MessageCircle aria-hidden className="size-4 shrink-0" />
              {t('whatsapp')}
            </a>
          )}
        </div>
      </div>
      <DatosConocidosVista datos={datos.conocido} titulo={t('conocidoTitulo')} />
      <CharlaEleccion grupoId={datos.grupo.id} personaId={datos.persona.id} datos={datos} />
    </div>
  );
}
