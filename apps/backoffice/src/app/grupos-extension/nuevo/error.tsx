'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 014: la API no respondió — qué pasó, el código y "Reintentar" (docs/15). */
export default function ErrorGruposExtension({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('gruposExtension');

  useEffect(() => {
    console.error('[grupos-extension/error.tsx]', error.digest, error);
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
      <Link href="/grupos-extension" className="text-sm underline underline-offset-4">
        {t('volverLista')}
      </Link>
    </div>
  );
}
