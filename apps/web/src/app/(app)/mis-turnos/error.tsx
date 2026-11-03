'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 017: Mis turnos no pudo cargar — qué pasó, el código y "Reintentar" (H-04: refresh + reset). */
export default function ErrorMisTurnos({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('misTurnos');

  useEffect(() => {
    console.error('[mis-turnos/error.tsx]', error.digest, error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorTexto')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button
        size="xl"
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
