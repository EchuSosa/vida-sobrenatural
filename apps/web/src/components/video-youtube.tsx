'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * FR-005 (D93, D5, Ley 25.326): miniatura primero, sin cargar el
 * reproductor hasta que la persona hace clic — ni tiempo de carga extra ni
 * rastreadores de terceros activándose antes de que la persona decida ver
 * el video. Al hacer clic, embebe desde `youtube-nocookie.com`, nunca
 * `youtube.com` directo.
 */
export function VideoYoutube({ videoId, tituloVideo }: { videoId: string; tituloVideo: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  const t = useTranslations('palabraProfetica');

  if (reproduciendo) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={tituloVideo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setReproduciendo(true)}
      aria-label={t('verVideo', { titulo: tituloVideo })}
      className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube, dominio externo sin loader de next/image configurado para img.youtube.com */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        className="size-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
        <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black">
          <Play className="size-7 fill-current" aria-hidden />
        </span>
      </span>
      <span className="sr-only">{t('reproducirVideo')}</span>
    </button>
  );
}
