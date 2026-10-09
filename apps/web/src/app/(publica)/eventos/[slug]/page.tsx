import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { UsersRound } from 'lucide-react';
import {
  argumentosTextoDestinatarios,
  formatearInicioEvento,
  formatearMoneda,
  tieneRestriccionDeDestinatarios,
  type EventoPublico,
} from '@vida-sobrenatural/shared-types';
import { ButtonLink, MigaDePan, PlaceholderImagen } from '@vida-sobrenatural/ui';
import { obtenerEventoPublico } from '../../../../components/eventos/api-eventos';
import { EstadoEventoPublico, estadoPublico } from '../../../../components/eventos/estado-evento-publico';
import { AccionInscripcion } from '../../../../components/eventos/accion-inscripcion';

const DESCRIPCION_META_MAX = 160;

function resumen(texto: string): string {
  const plano = texto.replace(/\s+/g, ' ').trim();
  return plano.length <= DESCRIPCION_META_MAX ? plano : `${plano.slice(0, DESCRIPCION_META_MAX - 1)}…`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const evento = await obtenerEventoPublico(slug);
  if (!evento) return {};
  const titulo = `${evento.nombre} — Vida Sobrenatural`;
  return {
    title: titulo,
    description: resumen(evento.descripcion),
    alternates: { canonical: `/eventos/${evento.slug}` },
    openGraph: {
      title: titulo,
      description: resumen(evento.descripcion),
      url: `/eventos/${evento.slug}`,
      type: 'website',
      // Sin flyer, queda la imagen por defecto de la web (opengraph-image de la sección pública).
      ...(evento.imagenUrl ? { images: [{ url: evento.imagenUrl, alt: evento.descripcionImagen ?? evento.nombre }] } : {}),
    },
  };
}

/** FR-006: datos estructurados `Event` de schema.org. `<` escapado: el texto lo cargó una persona. */
function EventoJsonLd({ evento }: { evento: EventoPublico }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: evento.nombre,
    description: evento.descripcion,
    startDate: evento.inicio,
    endDate: evento.fin ?? undefined,
    eventStatus: evento.estado === 'cancelado' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: evento.sede.nombre, address: evento.lugar },
    image: evento.imagenUrl ?? undefined,
    organizer: { '@type': 'Organization', name: 'Vida Sobrenatural' },
    offers: evento.costo ? { '@type': 'Offer', price: evento.costo, priceCurrency: 'ARS' } : undefined,
  };
  return (
    // eslint-disable-next-line local/no-dangerously-set-inner-html -- JSON-LD (patrón de church-json-ld.tsx); `<` escapado, no se puede cerrar el <script>.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }} />
  );
}

/**
 * spec 011, T045 (FR-002 a FR-006, FR-043, FR-046) — la página pública de un
 * Evento: todo dato clave como texto aunque esté en el flyer (D83), el estado
 * con texto + ícono, y los cancelados o pasados siguen resolviendo su URL. Un
 * eliminado responde 404. En un bautismo no hay "Anotarme": se pide desde Mi
 * camino, y nunca se muestra quién se inscribió. La acción de anotarse es
 * una isla de cliente con la sesión (T052).
 */
export default async function EventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [evento, t, tn, locale] = await Promise.all([obtenerEventoPublico(slug), getTranslations('eventos.publico'), getTranslations('nav'), getLocale()]);
  if (!evento) notFound();
  const estado = estadoPublico(evento.estadoInscripcion, evento.inicio, evento.fin, new Date());

  const explicacion =
    estado === 'cancelado' || estado === 'pasado' || estado === 'cerrada' || estado === 'no_requiere'
      ? t(`explicacion.${estado}`)
      : evento.tipo === 'bautismo'
        ? t('explicacion.bautismo')
        : null;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <EventoJsonLd evento={evento} />
      <MigaDePan tramos={[{ label: tn('eventos'), href: '/eventos' }, { label: evento.nombre }]} LinkComponente={Link} />

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{evento.nombre}</h1>
        <EstadoEventoPublico estado={estado} />
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {evento.imagenUrl ? (
          <div className="flex w-full items-start justify-center overflow-hidden rounded-lg bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element -- flyer servido por apps/api (D168) */}
            <img src={evento.imagenUrl} alt={evento.descripcionImagen ?? ''} className="h-auto w-full object-contain" />
          </div>
        ) : (
          <PlaceholderImagen aspecto="portada" etiqueta={t('flyerPorDefecto', { nombre: evento.nombre })} />
        )}

        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-base sm:grid-cols-[max-content_1fr]">
            <dt className="font-semibold">{t('cuando')}</dt>
            <dd>{formatearInicioEvento(evento.inicio, evento.fin, locale)}</dd>
            <dt className="font-semibold">{t('donde')}</dt>
            <dd className="flex flex-col">
              <span>{evento.lugar}</span>
              <span className="text-muted-foreground">{t('sede', { nombre: evento.sede.nombre })}</span>
            </dd>
            {(evento.publicoObjetivo || tieneRestriccionDeDestinatarios(evento.destinatarios)) && (
              <>
                <dt className="font-semibold">{t('para')}</dt>
                <dd className="flex flex-col gap-1">
                  {tieneRestriccionDeDestinatarios(evento.destinatarios) && (
                    <span className="flex items-start gap-2" data-testid="destinatarios-evento">
                      <UsersRound aria-hidden="true" className="mt-1 size-4 shrink-0" />
                      {t('destinatarios', argumentosTextoDestinatarios(evento.destinatarios))}
                    </span>
                  )}
                  {evento.publicoObjetivo && <span>{evento.publicoObjetivo}</span>}
                </dd>
              </>
            )}
            {evento.requiereInscripcion && evento.tipo !== 'bautismo' && (
              <>
                <dt className="font-semibold">{t('costo')}</dt>
                <dd>{evento.costo === null ? t('sinCosto') : formatearMoneda(Number(evento.costo), locale)}</dd>
                <dt className="font-semibold">{t('cupo')}</dt>
                <dd>
                  {evento.cupo === null
                    ? t('sinLimite')
                    : t('lugaresDisponibles', { disponibles: evento.lugaresDisponibles ?? 0, cupo: evento.cupo })}
                </dd>
              </>
            )}
          </dl>

          {explicacion && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <p className="text-base">{explicacion}</p>
              {evento.tipo === 'bautismo' && estado !== 'cancelado' && estado !== 'pasado' ? (
                <ButtonLink className="w-fit" render={<Link href="/mi-camino" />}>
                  {t('explicacion.irAMiCamino')}
                </ButtonLink>
              ) : estado === 'cancelado' || estado === 'pasado' ? (
                <Link href="/eventos" className="w-fit text-base font-medium underline underline-offset-4 hover:no-underline">
                  {t('explicacion.verCartelera')}
                </Link>
              ) : null}
            </div>
          )}

          {evento.tipo === 'general' && (estado === 'abierta' || estado === 'lista_espera' || estado === 'cupo_completo') && (
            <Suspense fallback={null}>
              <AccionInscripcion evento={evento} />
            </Suspense>
          )}
        </div>
      </div>

      <div className="whitespace-pre-line text-lg leading-7">{evento.descripcion}</div>
    </article>
  );
}
