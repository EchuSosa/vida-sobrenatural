'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 006, T079: no se pudo cargar el alta (las Sedes no respondieron) — qué pasó y "Reintentar". */
export default function ErrorNuevaPersona({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('personasAlta');

  useEffect(() => {
    console.error('[personas/nueva/error.tsx]', error.digest, error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button
        className="mx-auto"
        onClick={() => {
          router.refresh();
          reset();
        }}
      >
        {t('reintentar')}
      </Button>
      <Link href="/personas" className="text-sm underline underline-offset-4">
        {t('irAPersonas')}
      </Link>
    </div>
  );
}
