'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 012, T048/T050 — "error" de Notificaciones y de su detalle: mensaje simple, "Reintentar" y código. */
export default function ErrorNotificaciones({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('notificaciones.errorCarga');
  const router = useRouter();
  useEffect(() => {
    console.error('[notificaciones/error.tsx]', error.digest, error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p>{t('texto')}</p>
      {error.digest && <p className="text-sm text-muted-foreground">{t('codigo', { codigo: error.digest })}</p>}
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
