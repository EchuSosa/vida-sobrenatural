import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, MapPin, Wallet } from 'lucide-react';
import { formatearInicioEvento, formatearMoneda, type EventoPublico } from '@vida-sobrenatural/shared-types';
import { PlaceholderImagen } from '@vida-sobrenatural/ui';
import { EstadoEventoPublico, estadoPublico } from './estado-evento-publico';
import { EstadoOMiInscripcion } from './mis-inscripciones-cartelera';

/**
 * spec 011, T022 — la tarjeta de un Evento: la usan la cartelera, el Inicio
 * público y Mis eventos. Nombre, cuándo, dónde, costo o "Sin costo", estado
 * con texto + ícono (D81) y el flyer con su `alt` (o la imagen por defecto).
 * Toda la tarjeta es un enlace a la página del Evento.
 */
export function TarjetaEvento({ evento, ahora, nivelTitulo = 'h2' }: { evento: EventoPublico; ahora: Date; nivelTitulo?: 'h2' | 'h3' }) {
  const t = useTranslations('eventos.publico');
  const locale = useLocale();
  const Titulo = nivelTitulo;
  return (
    <Link
      href={`/eventos/${evento.slug}`}
      className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {evento.imagenUrl ? (
        <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element -- flyer servido por apps/api (D168), sin loader de next/image para ese host */}
          <img src={evento.imagenUrl} alt={evento.descripcionImagen ?? ''} className="h-full w-full object-contain" loading="lazy" />
        </div>
      ) : (
        <PlaceholderImagen aspecto="portada" etiqueta={t('flyerPorDefecto', { nombre: evento.nombre })} />
      )}
      <Titulo className="text-lg font-semibold leading-snug">{evento.nombre}</Titulo>
      <ul className="flex flex-col gap-1.5 text-base">
        <li className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formatearInicioEvento(evento.inicio, evento.fin, locale)}</span>
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{evento.lugar}</span>
        </li>
        <li className="flex items-start gap-2">
          <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{evento.costo === null ? t('sinCosto') : formatearMoneda(Number(evento.costo), locale)}</span>
        </li>
      </ul>
      <div className="mt-auto">
        {/* DEMO-17: con sesión (y dentro de ProveedorMisInscripciones), "Ya te anotaste" en lugar del estado público. */}
        <EstadoOMiInscripcion eventoId={evento.id}>
          <EstadoEventoPublico estado={estadoPublico(evento.estadoInscripcion, evento.inicio, evento.fin, ahora)} />
        </EstadoOMiInscripcion>
      </div>
    </Link>
  );
}
