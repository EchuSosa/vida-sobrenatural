'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

export default function ErrorPago({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('eventos.pagos.errorCarga');
  const router = useRouter();
  useEffect(() => {
    console.error('[solicitudes/pago/error.tsx]', error.digest, error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-muted-foreground">{t('texto')}</p>
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
