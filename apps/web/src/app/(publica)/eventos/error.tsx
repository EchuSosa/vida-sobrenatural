'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 011, T045 — "error" de la cartelera y de la página del Evento: qué pasó y reintentar. */
export default function ErrorEventos({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('eventos.publico.error');
  const router = useRouter();
  useEffect(() => {
    console.error('[eventos/error.tsx]', error.digest, error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-base">{t('texto')}</p>
      <Button
        className="mx-auto"
        onClick={() => {
          router.refresh();
          reset();
        }}
      >
        {t('reintentar')}
      </Button>
    </div>
  );
}
