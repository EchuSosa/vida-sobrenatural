'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** No cargó (spec 013, T074): qué pasó, el código de referencia y "Reintentar" (H-04). */
export default function ErrorCursos({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('cursos');
  useEffect(() => {
    console.error('[cursos/error.tsx]', error.digest, error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button
        onClick={() => {
          router.refresh();
          reset();
        }}
        className="mx-auto"
      >
        {t('reintentar')}
      </Button>
    </div>
  );
}
