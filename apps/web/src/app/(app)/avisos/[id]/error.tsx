'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 012, T023/T025 — "error" de Avisos y del aviso completo: mensaje simple, "Reintentar" y código de referencia. */
export default function ErrorAvisos({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('avisos.errorCarga');
  const router = useRouter();
  useEffect(() => {
    console.error('[avisos/error.tsx]', error.digest, error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-base">{t('texto')}</p>
      {error.digest && <p className="text-sm text-muted-foreground">{t('codigo', { codigo: error.digest })}</p>}
      <Button
        size="xl"
        className="mx-auto text-base"
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
