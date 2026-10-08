'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 008: la API no respondió en Mis grupos — qué pasó, el código de referencia y "Reintentar" (docs/15). */
export default function ErrorMisGrupos({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('misGrupos');

  useEffect(() => {
    console.error('[mis-grupos/[grupoId]/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-base text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} size="xl" className="mx-auto text-base">
        {t('reintentar')}
      </Button>
    </div>
  );
}
